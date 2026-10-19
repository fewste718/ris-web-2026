using backend.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
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
