using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace BitirmeBackend.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class BaseController : ControllerBase
{
    protected int CurrentUserId =>
        int.Parse(User.FindFirstValue("userId")
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("Token'da kullanıcı kimliği bulunamadı."));

    protected string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    protected int? CurrentEmployeeId
    {
        get
        {
            var val = User.FindFirstValue("employeeId");
            return val is not null ? int.Parse(val) : null;
        }
    }
}
