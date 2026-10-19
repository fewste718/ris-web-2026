using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("info")]
public sealed class InfoController : ControllerBase
{
    private readonly IApplicationInfoService _infoService;

    public InfoController(IApplicationInfoService infoService)
    {
        _infoService = infoService;
    }

    [HttpGet]
    [ProducesResponseType<ApplicationInfo>(StatusCodes.Status200OK)]
    public ActionResult<ApplicationInfo> Get()
    {
        return Ok(_infoService.GetInfo());
    }
}
