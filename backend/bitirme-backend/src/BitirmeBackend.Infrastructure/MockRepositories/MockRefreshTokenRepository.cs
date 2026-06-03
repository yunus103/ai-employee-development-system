using System.Security.Cryptography;
using System.Text;
using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Infrastructure.MockRepositories;

public class MockRefreshTokenRepository : IRefreshTokenRepository
{
    /// <summary>
    /// Lookup by SHA256 hash. Caller passes the raw token;
    /// we hash it here to keep raw tokens out of the data store.
    /// </summary>
    public Task<RefreshToken?> GetByTokenHashAsync(string tokenHash)
    {
        // tokenHash is already hashed by the caller (IRefreshTokenService)
        var token = MockDataStore.RefreshTokens.FirstOrDefault(t =>
            t.TokenHash == tokenHash &&
            !t.IsRevoked &&
            t.ExpiresAt > DateTime.UtcNow);
        return Task.FromResult(token);
    }

    public Task<IEnumerable<RefreshToken>> GetActiveByUserIdAsync(int userId)
    {
        var tokens = MockDataStore.RefreshTokens
            .Where(t => t.UserId == userId && !t.IsRevoked && t.ExpiresAt > DateTime.UtcNow);
        return Task.FromResult(tokens);
    }

    public Task AddAsync(RefreshToken token)
    {
        token.Id = MockDataStore.NextRefreshTokenId++;
        MockDataStore.RefreshTokens.Add(token);
        return Task.CompletedTask;
    }

    public void Update(RefreshToken token)
    {
        // In-memory; reference already updated by caller.
    }

    // ── Helper used by the service layer ──────────────────────────────────
    public static string ComputeHash(string rawToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
