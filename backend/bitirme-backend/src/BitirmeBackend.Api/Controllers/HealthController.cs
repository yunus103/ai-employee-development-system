using BitirmeBackend.Application.Interfaces.Services;
using BitirmeBackend.Contracts.Common;
using Microsoft.AspNetCore.Mvc;

namespace BitirmeBackend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly IHealthService _healthService;

    public HealthController(IHealthService healthService) => _healthService = healthService;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var status = await _healthService.GetHealthStatusAsync();
        return Ok(ApiResponse<object>.Ok(status));
    }
}
