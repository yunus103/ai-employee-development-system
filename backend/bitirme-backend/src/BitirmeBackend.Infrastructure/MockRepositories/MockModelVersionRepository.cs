using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Infrastructure.MockRepositories;

public class MockModelVersionRepository : IModelVersionRepository
{
    public Task<ModelVersion?> GetActiveAsync() =>
        Task.FromResult(MockDataStore.ModelVersions.FirstOrDefault(m => m.IsActive && !m.IsDeleted));

    public Task<ModelVersion?> GetByIdAsync(int id) =>
        Task.FromResult(MockDataStore.ModelVersions.FirstOrDefault(m => m.Id == id && !m.IsDeleted));

    public Task<IEnumerable<ModelVersion>> GetAllAsync() =>
        Task.FromResult(MockDataStore.ModelVersions.Where(m => !m.IsDeleted).AsEnumerable());
}
