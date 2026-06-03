using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Application.Interfaces.Repositories;

public interface IActionCatalogRepository
{
    Task<ActionCatalog?> GetByIdAsync(int id);
    Task<ActionCatalog?> GetByCodeAsync(string code);
    Task<IEnumerable<ActionCatalog>> GetByCodesAsync(IEnumerable<string> codes);
    Task<IEnumerable<ActionCatalog>> GetAllActiveAsync();
}
