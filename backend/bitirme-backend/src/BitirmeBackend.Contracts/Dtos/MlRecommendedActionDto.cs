namespace BitirmeBackend.Contracts.Dtos;

public class MlRecommendedActionDto
{
    public string Code { get; set; } = string.Empty;
    public double Probability { get; set; }
    public bool Selected { get; set; }
}
