namespace BitirmeBackend.Contracts.Requests;

public class UpsertAssessmentScoreRequest
{
    public int CompetencyId { get; set; }
    public string EvaluatorType { get; set; } = string.Empty;
    public double Score { get; set; }
}
