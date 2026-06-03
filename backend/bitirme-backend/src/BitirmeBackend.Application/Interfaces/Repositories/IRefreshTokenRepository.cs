using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Application.Interfaces.Repositories;

public interface IRefreshTokenRepository
{
    /// <summary>Finds a non-revoked, non-expired token by its SHA256 hash.</summary>
    Task<RefreshToken?> GetByTokenHashAsync(string tokenHash);

    /// <summary>Returns all active (non-revoked) tokens for a user.</summary>
    Task<IEnumerable<RefreshToken>> GetActiveByUserIdAsync(int userId);

    Task AddAsync(RefreshToken token);
    void Update(RefreshToken token);
}
