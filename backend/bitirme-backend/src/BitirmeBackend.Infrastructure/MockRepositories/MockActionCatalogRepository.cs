using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Infrastructure.MockRepositories;

public class MockActionCatalogRepository : IActionCatalogRepository
{
    private static IEnumerable<ActionCatalog> Active =>
        MockDataStore.ActionCatalog.Where(c => !c.IsDeleted);

    public Task<ActionCatalog?> GetByIdAsync(int id) =>
        Task.FromResult(Active.FirstOrDefault(c => c.Id == id));

    public Task<ActionCatalog?> GetByCodeAsync(string code) =>
        Task.FromResult(Active.FirstOrDefault(c =>
            c.Code.Equals(code, StringComparison.OrdinalIgnoreCase)));

    public Task<IEnumerable<ActionCatalog>> GetByCodesAsync(IEnumerable<string> codes)
    {
        var codeSet = codes.Select(c => c.ToUpper()).ToHashSet();
        var result = Active.Where(c => codeSet.Contains(c.Code.ToUpper()));
        return Task.FromResult(result);
    }

    public Task<IEnumerable<ActionCatalog>> GetAllActiveAsync() =>
        Task.FromResult(Active.Where(c => c.IsActive));
}
