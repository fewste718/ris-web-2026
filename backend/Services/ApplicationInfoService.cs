using backend.Models;

namespace backend.Services;

public sealed class ApplicationInfoService : IApplicationInfoService
{
    private readonly IWebHostEnvironment _environment;

    public ApplicationInfoService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public ApplicationInfo GetInfo()
    {
        return new ApplicationInfo(
            "Мобиус Технологии — управление заявками",
            _environment.EnvironmentName,
            "1.0.0",
            "ЛР8");
    }
}
