namespace BitirmeBackend.Contracts.Dtos;

public class MlPredictionResponse
{
    public int EmployeeId { get; set; }
    public IEnumerable<MlRecommendedActionDto> RecommendedActions { get; set; } = [];
    public int TotalRecommendedActions { get; set; }
}
