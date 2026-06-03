using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Application.Interfaces.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(int id);
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdWithRoleAsync(int id);
    Task<bool> ExistsByEmailAsync(string email);
    Task AddAsync(User user);
    void Update(User user);
}
