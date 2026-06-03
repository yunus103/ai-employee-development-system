namespace BitirmeBackend.Contracts.Responses;

public class FeedbackCommentDto
{
    public int Id { get; set; }
    public int AssessmentId { get; set; }
    public string EvaluatorType { get; set; } = string.Empty;
    public string CommentText { get; set; } = string.Empty;
    public double? SentimentScore { get; set; }
    public DateTime CreatedAt { get; set; }
}
