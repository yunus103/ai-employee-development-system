using BitirmeBackend.Domain.Common;
using BitirmeBackend.Domain.Enums;

namespace BitirmeBackend.Domain.Entities;

public class Assessment : BaseEntity
{
    public int EmployeeId { get; set; }
    public int CycleId { get; set; }
    public double? OverallScore { get; set; }
    public AssessmentStatus Status { get; set; } = AssessmentStatus.Draft;
    public int CreatedByUserId { get; set; }

    public Employee Employee { get; set; } = null!;
    public AssessmentCycle Cycle { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public ICollection<AssessmentScore> Scores { get; set; } = [];
    public ICollection<FeedbackComment> FeedbackComments { get; set; } = [];
    public ICollection<AiPredictionRun> PredictionRuns { get; set; } = [];
    public ICollection<ActionPlan> ActionPlans { get; set; } = [];
}
