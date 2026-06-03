namespace BitirmeBackend.Contracts.Responses;

public class AssessmentDetailDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public int CycleId { get; set; }
    public string CycleName { get; set; } = string.Empty;
    public double? OverallScore { get; set; }
    public string Status { get; set; } = string.Empty;
    public int CreatedByUserId { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
