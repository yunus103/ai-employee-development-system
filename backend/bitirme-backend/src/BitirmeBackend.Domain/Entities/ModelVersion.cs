using BitirmeBackend.Domain.Common;

namespace BitirmeBackend.Domain.Entities;

public class ModelVersion : BaseEntity
{
    public string ModelName { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string? Description { get; set; }
    public double? MicroF1 { get; set; }
    public double? MacroF1 { get; set; }
    public double? RocAuc { get; set; }
    public double? HammingLoss { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<AiPredictionRun> PredictionRuns { get; set; } = [];
}
