using BitirmeBackend.Domain.Common;

namespace BitirmeBackend.Domain.Entities;

public class Competency : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<AssessmentScore> AssessmentScores { get; set; } = [];
}
