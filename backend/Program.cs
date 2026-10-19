using backend.Services;
using backend.Filters;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

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
builder.Services.AddSingleton<ISupportTicketService, SupportTicketService>();

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
