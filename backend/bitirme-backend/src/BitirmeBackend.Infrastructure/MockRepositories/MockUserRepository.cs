using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Infrastructure.MockRepositories;

public class MockUserRepository : IUserRepository
{
    public Task<User?> GetByIdAsync(int id) =>
        Task.FromResult(MockDataStore.Users.FirstOrDefault(u => u.Id == id && !u.IsDeleted));

    public Task<User?> GetByEmailAsync(string email) =>
        Task.FromResult(MockDataStore.Users.FirstOrDefault(u =>
            u.Email.Equals(email, StringComparison.OrdinalIgnoreCase) && !u.IsDeleted));

    public Task<User?> GetByIdWithRoleAsync(int id)
    {
        var user = MockDataStore.Users.FirstOrDefault(u => u.Id == id && !u.IsDeleted);
        if (user is not null)
            user.Role = MockDataStore.Roles.First(r => r.Id == user.RoleId);
        return Task.FromResult(user);
    }

    public Task<bool> ExistsByEmailAsync(string email) =>
        Task.FromResult(MockDataStore.Users.Any(u =>
            u.Email.Equals(email, StringComparison.OrdinalIgnoreCase) && !u.IsDeleted));

    public Task AddAsync(User user)
    {
        user.Id = MockDataStore.NextUserId++;
        user.CreatedAt = DateTime.UtcNow;
        MockDataStore.Users.Add(user);
        return Task.CompletedTask;
    }

    public void Update(User user)
    {
        user.UpdatedAt = DateTime.UtcNow;
        // In-memory list holds the same reference; no copy needed.
    }
}
