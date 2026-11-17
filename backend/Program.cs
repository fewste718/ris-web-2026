using backend.Services;
using backend.Filters;
using backend.Data;
using backend.Auth;
using backend.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("Настройте ConnectionStrings:Default через user-secrets или переменную окружения.");
builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
jwt.Validate();
builder.Services.AddSingleton(jwt);
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.MapInboundClaims = false;
    options.IncludeErrorDetails = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = jwt.Issuer,
        ValidateAudience = true, ValidAudience = jwt.Audience,
        ValidateLifetime = true, RequireExpirationTime = true,
        ValidateIssuerSigningKey = true, RequireSignedTokens = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
        ClockSkew = TimeSpan.Zero,
        NameClaimType = JwtRegisteredClaimNames.Sub,
        RoleClaimType = "role"
    };
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            if (!int.TryParse(context.Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub), NumberStyles.None,
                CultureInfo.InvariantCulture, out var userId) || userId <= 0)
            {
                context.Fail("Недействительный вход.");
                return;
            }
            var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var user = await db.Users.AsNoTracking().Where(item => item.Id == userId)
                .Select(item => new { item.Role }).SingleOrDefaultAsync(context.HttpContext.RequestAborted);
            // Удалённый пользователь или изменённая роль требуют нового входа.
            if (user is null || context.Principal?.FindFirstValue("role") != user.Role.ToString())
                context.Fail("Недействительный вход.");
        },
        OnChallenge = async context =>
        {
            context.HandleResponse();
            context.Response.Headers.WWWAuthenticate = "Bearer";
            await Results.Problem(statusCode: 401, title: "Войдите в систему.",
                type: "about:blank", instance: context.Request.Path).ExecuteAsync(context.HttpContext);
        },
        OnForbidden = context => Results.Problem(statusCode: 403, title: "Недостаточно прав для этого действия.",
            type: "about:blank", instance: context.Request.Path).ExecuteAsync(context.HttpContext)
    };
});
builder.Services.AddAuthorization();
builder.Services.AddCors(options => options.AddPolicy("VueDevelopment", policy => policy
    .WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddControllers(options => options.Filters.Add<ApiExceptionFilter>())
    .AddJsonOptions(options => options.JsonSerializerOptions.NumberHandling = JsonNumberHandling.Strict);
builder.Logging.AddSimpleConsole(options => options.SingleLine = true);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "Мобиус Технологии — управление заявками",
        Version = "v1"
    });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Выполните POST /api/auth/login и вставьте accessToken без префикса Bearer."
    });
    options.OperationFilter<AuthorizationOperationFilter>();
});
builder.Services.AddSingleton<IApplicationInfoService, ApplicationInfoService>();
builder.Services.AddScoped<ISupportTicketService, SupportTicketService>();

var app = builder.Build();

app.UseExceptionHandler(handler => handler.Run(async context =>
{
    var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    app.Logger.LogError("Request failed; error={ErrorType}", error?.GetType().Name);
    await Results.Problem(statusCode: 500, title: "Не удалось обработать запрос.",
        type: "about:blank", instance: context.Request.Path).ExecuteAsync(context);
}));

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (app.Environment.IsDevelopment()) app.UseCors("VueDevelopment");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Text("ok", "text/plain"))
    .WithName("Health")
    .WithSummary("Проверка живости процесса")
    .WithTags("Служебные")
    .Produces<string>(StatusCodes.Status200OK, "text/plain");

app.MapControllers();

app.Run();
