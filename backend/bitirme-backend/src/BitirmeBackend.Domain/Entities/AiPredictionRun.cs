using BitirmeBackend.Domain.Common;
using BitirmeBackend.Domain.Enums;

namespace BitirmeBackend.Domain.Entities;

public class AiPredictionRun : BaseEntity
{
    public int AssessmentId { get; set; }
    public int ModelVersionId { get; set; }
    public int RequestedByUserId { get; set; }
    public PredictionRunStatus Status { get; set; } = PredictionRunStatus.Pending;
    public string? ErrorMessage { get; set; }

    public Assessment Assessment { get; set; } = null!;
    public ModelVersion ModelVersion { get; set; } = null!;
    public User RequestedByUser { get; set; } = null!;
    public ICollection<AiPredictedAction> PredictedActions { get; set; } = [];
}
