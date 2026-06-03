using BitirmeBackend.Domain.Common;
using BitirmeBackend.Domain.Enums;

namespace BitirmeBackend.Domain.Entities;

public class FeedbackComment : BaseEntity
{
    public int AssessmentId { get; set; }
    public EvaluatorType EvaluatorType { get; set; }
    public string CommentText { get; set; } = string.Empty;
    public double? SentimentScore { get; set; }

    public Assessment Assessment { get; set; } = null!;
}
