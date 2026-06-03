namespace BitirmeBackend.Contracts.Responses;

public class ActionPlanItemDto
{
    public int Id { get; set; }
    public int ActionPlanId { get; set; }
    public int? ActionCatalogId { get; set; }
    public int? AiPredictedActionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public DateTime? DueDate { get; set; }
    public string Source { get; set; } = string.Empty;
    public int OrderNo { get; set; }
}
