using BitirmeBackend.Domain.Common;

namespace BitirmeBackend.Domain.Entities;

public class AssessmentCycle : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = string.Empty;

    public ICollection<Assessment> Assessments { get; set; } = [];
}
