namespace BitirmeBackend.Contracts.Responses;

public class GenerateActionPlanResponse
{
    public int ActionPlanId { get; set; }
    public string Status { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
