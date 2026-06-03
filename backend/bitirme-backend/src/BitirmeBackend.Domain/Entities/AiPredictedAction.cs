using BitirmeBackend.Domain.Common;

namespace BitirmeBackend.Domain.Entities;

public class AiPredictedAction : BaseEntity
{
    public int PredictionRunId { get; set; }
    public string ActionCode { get; set; } = string.Empty;
    public double Probability { get; set; }
    public int RankOrder { get; set; }
    public bool IsSelected { get; set; } = true;

    public AiPredictionRun PredictionRun { get; set; } = null!;
    public ICollection<ActionPlanItem> ActionPlanItems { get; set; } = [];
}
