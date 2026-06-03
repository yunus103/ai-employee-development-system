namespace BitirmeBackend.Contracts.Requests;

public class UpdateActionPlanItemRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public DateTime? DueDate { get; set; }
    public int OrderNo { get; set; }
}
