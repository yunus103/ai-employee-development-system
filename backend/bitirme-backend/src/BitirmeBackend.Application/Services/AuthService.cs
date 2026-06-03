using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Application.Interfaces.Services;
using BitirmeBackend.Contracts.Requests;
using BitirmeBackend.Contracts.Responses;
using Microsoft.Extensions.Configuration;

namespace BitirmeBackend.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly ITokenService _tokens;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly IRefreshTokenRepository _refreshTokenRepo;
    private readonly IConfiguration _config;

    public AuthService(
        IUserRepository users,
        IPasswordHasher hasher,
        ITokenService tokens,
        IRefreshTokenService refreshTokenService,
        IRefreshTokenRepository refreshTokenRepo,
        IConfiguration config)
    {
        _users = users;
        _hasher = hasher;
        _tokens = tokens;
        _refreshTokenService = refreshTokenService;
        _refreshTokenRepo = refreshTokenRepo;
        _config = config;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _users.GetByEmailAsync(request.Email);
        if (user is null || !user.IsActive)
            throw new UnauthorizedAccessException("Geçersiz e-posta veya şifre.");

        if (!_hasher.VerifyPassword(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Geçersiz e-posta veya şifre.");

        var userWithRole = await _users.GetByIdWithRoleAsync(user.Id)
            ?? throw new UnauthorizedAccessException("Kullanıcı bulunamadı.");

        var accessToken = _tokens.GenerateAccessToken(userWithRole);
        var rawRefreshToken = _tokens.GenerateRefreshToken();
        var accessExpiry = _tokens.GetAccessTokenExpiry();
        var refreshExpiry = GetRefreshExpiry();

        await _refreshTokenService.CreateRefreshTokenAsync(user.Id, rawRefreshToken, refreshExpiry);

        return new LoginResponse
        {
            AccessToken = accessToken,
            RefreshToken = rawRefreshToken,
            AccessTokenExpiresAt = accessExpiry,
            UserId = userWithRole.Id,
            FullName = userWithRole.FullName,
            Email = userWithRole.Email,
            Role = userWithRole.Role.Name,
            EmployeeId = userWithRole.EmployeeId
        };
    }

    public async Task<RefreshTokenResponse> RefreshTokenAsync(RefreshTokenRequest request)
    {
        // Hash the raw token, look it up directly to obtain the userId
        var rawToken = request.RefreshToken;
        var hash = ComputeHash(rawToken);
        var storedToken = await _refreshTokenRepo.GetByTokenHashAsync(hash);

        if (storedToken is null)
            throw new UnauthorizedAccessException("Geçersiz veya süresi dolmuş refresh token.");

        var userId = storedToken.UserId;

        var userWithRole = await _users.GetByIdWithRoleAsync(userId)
            ?? throw new UnauthorizedAccessException("Kullanıcı bulunamadı.");

        if (!userWithRole.IsActive)
            throw new UnauthorizedAccessException("Hesap devre dışı.");

        var newAccessToken = _tokens.GenerateAccessToken(userWithRole);
        var newRawRefreshToken = _tokens.GenerateRefreshToken();
        var accessExpiry = _tokens.GetAccessTokenExpiry();
        var refreshExpiry = GetRefreshExpiry();

        // Token rotation: revoke old, create new
        await _refreshTokenService.RevokeRefreshTokenAsync(userId, rawToken, newRawRefreshToken);
        await _refreshTokenService.CreateRefreshTokenAsync(userId, newRawRefreshToken, refreshExpiry);

        return new RefreshTokenResponse
        {
            AccessToken = newAccessToken,
            RefreshToken = newRawRefreshToken,
            AccessTokenExpiresAt = accessExpiry
        };
    }

    public async Task LogoutAsync(int userId, string rawRefreshToken)
    {
        await _refreshTokenService.RevokeRefreshTokenAsync(userId, rawRefreshToken);
    }

    public async Task<CurrentUserResponse> GetCurrentUserAsync(int userId)
    {
        var user = await _users.GetByIdWithRoleAsync(userId)
            ?? throw new KeyNotFoundException("Kullanıcı bulunamadı.");

        return new CurrentUserResponse
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role.Name,
            EmployeeId = user.EmployeeId,
            IsActive = user.IsActive
        };
    }

    private DateTime GetRefreshExpiry()
    {
        var days = int.Parse(_config["Jwt:RefreshTokenExpirationDays"] ?? "7");
        return DateTime.UtcNow.AddDays(days);
    }

    private static string ComputeHash(string rawToken)
    {
        var bytes = System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
