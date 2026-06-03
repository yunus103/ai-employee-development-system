using System.Security.Cryptography;
using System.Text;
using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Application.Interfaces.Services;
using BitirmeBackend.Domain.Entities;
using Microsoft.Extensions.Configuration;

namespace BitirmeBackend.Infrastructure.ExternalServices;

public class RefreshTokenService : IRefreshTokenService
{
    private readonly IRefreshTokenRepository _repo;
    private readonly IConfiguration _config;

    public RefreshTokenService(IRefreshTokenRepository repo, IConfiguration config)
    {
        _repo = repo;
        _config = config;
    }

    public async Task CreateRefreshTokenAsync(int userId, string rawToken, DateTime expiresAt)
    {
        var entity = new RefreshToken
        {
            UserId = userId,
            TokenHash = ComputeHash(rawToken),
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow
        };
        await _repo.AddAsync(entity);
    }

    public async Task<bool> ValidateRefreshTokenAsync(int userId, string rawToken)
    {
        var hash = ComputeHash(rawToken);
        var token = await _repo.GetByTokenHashAsync(hash);
        return token is not null && token.UserId == userId && !token.IsRevoked && token.ExpiresAt > DateTime.UtcNow;
    }

    public async Task RevokeRefreshTokenAsync(int userId, string rawToken, string? replacedByRawToken = null)
    {
        var hash = ComputeHash(rawToken);
        var token = await _repo.GetByTokenHashAsync(hash);
        if (token is null || token.UserId != userId) return;

        token.IsRevoked = true;
        token.RevokedAt = DateTime.UtcNow;
        if (replacedByRawToken is not null)
            token.ReplacedByTokenHash = ComputeHash(replacedByRawToken);

        _repo.Update(token);
    }

    public async Task RevokeAllUserTokensAsync(int userId)
    {
        var tokens = await _repo.GetActiveByUserIdAsync(userId);
        foreach (var token in tokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
            _repo.Update(token);
        }
    }

    public DateTime GetRefreshTokenExpiry()
    {
        var days = int.Parse(_config["Jwt:RefreshTokenExpirationDays"] ?? "7");
        return DateTime.UtcNow.AddDays(days);
    }

    private static string ComputeHash(string rawToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
