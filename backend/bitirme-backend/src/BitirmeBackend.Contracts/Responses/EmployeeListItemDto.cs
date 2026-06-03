namespace BitirmeBackend.Contracts.Responses;

public class EmployeeListItemDto
{
    public int Id { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string JobRole { get; set; } = string.Empty;
    public int? ManagerId { get; set; }
    public bool IsActive { get; set; }
}
