using backend.Services;
using backend.Filters;
using backend.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Default");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("Настройте ConnectionStrings:Default через user-secrets или переменную окружения.");
builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

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
});
builder.Services.AddSingleton<IApplicationInfoService, ApplicationInfoService>();
builder.Services.AddScoped<ISupportTicketService, SupportTicketService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/health", () => Results.Text("ok", "text/plain"))
    .WithName("Health")
    .WithSummary("Проверка живости процесса")
    .WithTags("Служебные")
    .Produces<string>(StatusCodes.Status200OK, "text/plain");

app.MapControllers();

app.Run();
