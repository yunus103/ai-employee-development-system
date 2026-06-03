using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Infrastructure.MockRepositories;

public class MockRoleRepository : IRoleRepository
{
    public Task<Role?> GetByIdAsync(int id) =>
        Task.FromResult(MockDataStore.Roles.FirstOrDefault(r => r.Id == id && !r.IsDeleted));

    public Task<Role?> GetByNameAsync(string name) =>
        Task.FromResult(MockDataStore.Roles.FirstOrDefault(r => r.Name == name && !r.IsDeleted));

    public Task<IEnumerable<Role>> GetAllAsync() =>
        Task.FromResult(MockDataStore.Roles.Where(r => !r.IsDeleted).AsEnumerable());
}
