namespace BitirmeBackend.Application.Interfaces.Services;

public interface IRefreshTokenService
{
    /// <summary>
    /// Hashes the raw token with SHA256 and persists a new RefreshToken record.
    /// </summary>
    Task CreateRefreshTokenAsync(int userId, string rawToken, DateTime expiresAt);

    /// <summary>
    /// Hashes rawToken, looks it up, and returns true if found, not revoked, and not expired.
    /// </summary>
    Task<bool> ValidateRefreshTokenAsync(int userId, string rawToken);

    /// <summary>
    /// Revokes the token matching rawToken (sets IsRevoked=true, RevokedAt=now).
    /// Optionally records the replacement token hash for rotation audit trail.
    /// </summary>
    Task RevokeRefreshTokenAsync(int userId, string rawToken, string? replacedByRawToken = null);

    /// <summary>Revokes all active refresh tokens for a user (e.g., on logout all devices).</summary>
    Task RevokeAllUserTokensAsync(int userId);
}
