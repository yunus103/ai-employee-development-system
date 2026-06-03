using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Application.Interfaces.Repositories;

public interface IModelVersionRepository
{
    Task<ModelVersion?> GetActiveAsync();
    Task<ModelVersion?> GetByIdAsync(int id);
    Task<IEnumerable<ModelVersion>> GetAllAsync();
}
