namespace BitirmeBackend.Contracts.Responses;

public class EmployeeDetailDto
{
    public int Id { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int Age { get; set; }
    public string Gender { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public string Department { get; set; } = string.Empty;
    public int JobRoleId { get; set; }
    public string JobRole { get; set; } = string.Empty;
    public int? ManagerId { get; set; }
    public string? ManagerName { get; set; }
    public string Education { get; set; } = string.Empty;
    public string EducationField { get; set; } = string.Empty;
    public string BusinessTravel { get; set; } = string.Empty;
    public string MaritalStatus { get; set; } = string.Empty;
    public int DistanceFromHome { get; set; }
    public int EnvironmentSatisfaction { get; set; }
    public int JobSatisfaction { get; set; }
    public int WorkLifeBalance { get; set; }
    public int TotalWorkingYears { get; set; }
    public int YearsAtCompany { get; set; }
    public int YearsInCurrentRole { get; set; }
    public int YearsWithCurrManager { get; set; }
    public double PerformanceScore { get; set; }
    public string Attrition { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
