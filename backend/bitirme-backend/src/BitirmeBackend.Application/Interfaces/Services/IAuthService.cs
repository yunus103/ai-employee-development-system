using BitirmeBackend.Contracts.Requests;
using BitirmeBackend.Contracts.Responses;

namespace BitirmeBackend.Application.Interfaces.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<RefreshTokenResponse> RefreshTokenAsync(RefreshTokenRequest request);
    Task LogoutAsync(int userId, string refreshToken);
    Task<CurrentUserResponse> GetCurrentUserAsync(int userId);
}
