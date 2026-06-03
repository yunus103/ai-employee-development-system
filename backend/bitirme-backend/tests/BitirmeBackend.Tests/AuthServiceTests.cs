using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Application.Interfaces.Services;
using BitirmeBackend.Application.Services;
using BitirmeBackend.Contracts.Requests;
using BitirmeBackend.Domain.Entities;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;

namespace BitirmeBackend.Tests;

public class AuthServiceTests
{
    // ── Shared helpers ────────────────────────────────────────────────────────

    private static AuthService BuildService(
        Mock<IUserRepository>? users = null,
        Mock<IPasswordHasher>? hasher = null,
        Mock<ITokenService>? tokens = null,
        Mock<IRefreshTokenService>? refreshSvc = null,
        Mock<IRefreshTokenRepository>? refreshRepo = null)
    {
        users      ??= new Mock<IUserRepository>();
        hasher     ??= new Mock<IPasswordHasher>();
        tokens     ??= new Mock<ITokenService>();
        refreshSvc ??= new Mock<IRefreshTokenService>();
        refreshRepo ??= new Mock<IRefreshTokenRepository>();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:RefreshTokenExpirationDays"] = "7"
            })
            .Build();

        return new AuthService(
            users.Object,
            hasher.Object,
            tokens.Object,
            refreshSvc.Object,
            refreshRepo.Object,
            config);
    }

    private static User MakeUser(int id = 1) => new()
    {
        Id           = id,
        Email        = "test@demo.com",
        FullName     = "Test User",
        PasswordHash = "hashed",
        IsActive     = true,
        RoleId       = 2,
        Role         = new Role { Id = 2, Name = "HR" }
    };

    private static RefreshToken MakeStoredToken(int userId = 1) => new()
    {
        Id        = 1,
        UserId    = userId,
        TokenHash = "ignored-in-test",  // hash check done by repo mock
        ExpiresAt = DateTime.UtcNow.AddDays(7),
        IsRevoked = false
    };

    // ── LoginAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsLoginResponse()
    {
        var user   = MakeUser();
        var users  = new Mock<IUserRepository>();
        var hasher = new Mock<IPasswordHasher>();
        var tokens = new Mock<ITokenService>();
        var refreshSvc = new Mock<IRefreshTokenService>();

        users.Setup(r => r.GetByEmailAsync("test@demo.com")).ReturnsAsync(user);
        users.Setup(r => r.GetByIdWithRoleAsync(user.Id)).ReturnsAsync(user);
        hasher.Setup(h => h.VerifyPassword("Secret1!", "hashed")).Returns(true);
        tokens.Setup(t => t.GenerateAccessToken(user)).Returns("access-token");
        tokens.Setup(t => t.GenerateRefreshToken()).Returns("raw-refresh");
        tokens.Setup(t => t.GetAccessTokenExpiry()).Returns(DateTime.UtcNow.AddMinutes(15));
        refreshSvc.Setup(s => s.CreateRefreshTokenAsync(user.Id, "raw-refresh", It.IsAny<DateTime>()))
                  .Returns(Task.CompletedTask);

        var svc = BuildService(users, hasher, tokens, refreshSvc);
        var result = await svc.LoginAsync(new LoginRequest { Email = "test@demo.com", Password = "Secret1!" });

        result.Should().NotBeNull();
        result.AccessToken.Should().Be("access-token");
        result.RefreshToken.Should().Be("raw-refresh");
        result.Role.Should().Be("HR");
    }

    [Fact]
    public async Task LoginAsync_InvalidEmail_ThrowsUnauthorized()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(r => r.GetByEmailAsync(It.IsAny<string>())).ReturnsAsync((User?)null);

        var svc = BuildService(users);
        await svc.Invoking(s => s.LoginAsync(new LoginRequest { Email = "none@x.com", Password = "pw" }))
                 .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_ThrowsUnauthorized()
    {
        var user   = MakeUser();
        var users  = new Mock<IUserRepository>();
        var hasher = new Mock<IPasswordHasher>();

        users.Setup(r => r.GetByEmailAsync(user.Email)).ReturnsAsync(user);
        hasher.Setup(h => h.VerifyPassword(It.IsAny<string>(), user.PasswordHash)).Returns(false);

        var svc = BuildService(users, hasher);
        await svc.Invoking(s => s.LoginAsync(new LoginRequest { Email = user.Email, Password = "wrong" }))
                 .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ── RefreshTokenAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task RefreshTokenAsync_ValidToken_ReturnsNewTokenPair()
    {
        var user        = MakeUser();
        var stored      = MakeStoredToken(user.Id);
        var users       = new Mock<IUserRepository>();
        var tokens      = new Mock<ITokenService>();
        var refreshRepo = new Mock<IRefreshTokenRepository>();
        var refreshSvc  = new Mock<IRefreshTokenService>();

        // AuthService hashes the incoming token; the repo must return the stored token
        refreshRepo.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>())).ReturnsAsync(stored);
        users.Setup(r => r.GetByIdWithRoleAsync(user.Id)).ReturnsAsync(user);
        tokens.Setup(t => t.GenerateAccessToken(user)).Returns("new-access");
        tokens.Setup(t => t.GenerateRefreshToken()).Returns("new-refresh");
        tokens.Setup(t => t.GetAccessTokenExpiry()).Returns(DateTime.UtcNow.AddMinutes(15));
        refreshSvc.Setup(s => s.RevokeRefreshTokenAsync(user.Id, It.IsAny<string>(), It.IsAny<string>()))
                  .Returns(Task.CompletedTask);
        refreshSvc.Setup(s => s.CreateRefreshTokenAsync(user.Id, "new-refresh", It.IsAny<DateTime>()))
                  .Returns(Task.CompletedTask);

        var svc = BuildService(users, refreshRepo: refreshRepo, tokens: tokens, refreshSvc: refreshSvc);
        var result = await svc.RefreshTokenAsync(new RefreshTokenRequest { RefreshToken = "some-raw-token" });

        result.Should().NotBeNull();
        result.AccessToken.Should().Be("new-access");
        result.RefreshToken.Should().Be("new-refresh");
    }

    [Fact]
    public async Task RefreshTokenAsync_InvalidToken_ThrowsUnauthorized()
    {
        var refreshRepo = new Mock<IRefreshTokenRepository>();
        refreshRepo.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>())).ReturnsAsync((RefreshToken?)null);

        var svc = BuildService(refreshRepo: refreshRepo);
        await svc.Invoking(s => s.RefreshTokenAsync(new RefreshTokenRequest { RefreshToken = "bad-token" }))
                 .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task RefreshTokenAsync_RevokedToken_ThrowsUnauthorized()
    {
        // A revoked token: repo returns null (revoked tokens are excluded by the repo query)
        var refreshRepo = new Mock<IRefreshTokenRepository>();
        refreshRepo.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>())).ReturnsAsync((RefreshToken?)null);

        var svc = BuildService(refreshRepo: refreshRepo);
        await svc.Invoking(s => s.RefreshTokenAsync(new RefreshTokenRequest { RefreshToken = "revoked-token" }))
                 .Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
