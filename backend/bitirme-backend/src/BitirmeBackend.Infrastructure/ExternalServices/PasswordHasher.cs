using BitirmeBackend.Application.Interfaces.Services;

namespace BitirmeBackend.Infrastructure.ExternalServices;

public class PasswordHasher : IPasswordHasher
{
    public string HashPassword(string plainTextPassword) =>
        BCrypt.Net.BCrypt.HashPassword(plainTextPassword);

    public bool VerifyPassword(string plainTextPassword, string hash) =>
        BCrypt.Net.BCrypt.Verify(plainTextPassword, hash);
}
