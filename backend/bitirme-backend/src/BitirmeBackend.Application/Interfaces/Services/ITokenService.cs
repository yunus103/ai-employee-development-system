using System.Security.Claims;
using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Application.Interfaces.Services;

public interface ITokenService
{
    /// <summary>Generates a signed JWT access token containing UserId, Email, Role, EmployeeId claims.</summary>
    string GenerateAccessToken(User user);

    /// <summary>Generates a cryptographically random refresh token (raw, not hashed).</summary>
    string GenerateRefreshToken();

    /// <summary>
    /// Parses an expired access token and returns its claims principal.
    /// Used during token rotation to extract UserId from an expired token.
    /// </summary>
    ClaimsPrincipal GetPrincipalFromExpiredToken(string token);

    /// <summary>Returns the UTC expiry DateTime for an access token generated now.</summary>
    DateTime GetAccessTokenExpiry();
}
