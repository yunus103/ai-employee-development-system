using BitirmeBackend.Domain.Common;
using BitirmeBackend.Domain.Enums;

namespace BitirmeBackend.Domain.Entities;

public class AssessmentScore : BaseEntity
{
    public int AssessmentId { get; set; }
    public int CompetencyId { get; set; }
    public EvaluatorType EvaluatorType { get; set; }
    public double Score { get; set; }

    public Assessment Assessment { get; set; } = null!;
    public Competency Competency { get; set; } = null!;
}
