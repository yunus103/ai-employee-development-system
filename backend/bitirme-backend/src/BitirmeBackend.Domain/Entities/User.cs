using BitirmeBackend.Domain.Common;

namespace BitirmeBackend.Domain.Entities;

public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public int? EmployeeId { get; set; }
    public bool IsActive { get; set; } = true;

    public Role Role { get; set; } = null!;
    public Employee? Employee { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
