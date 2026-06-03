namespace BitirmeBackend.Contracts.Common;

public class PagedResponse<T>
{
    public bool Success { get; set; }
    public IEnumerable<T> Data { get; set; } = [];
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);

    public static PagedResponse<T> Ok(IEnumerable<T> data, int totalCount, int pageNumber, int pageSize) =>
        new()
        {
            Success = true,
            Data = data,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
}
