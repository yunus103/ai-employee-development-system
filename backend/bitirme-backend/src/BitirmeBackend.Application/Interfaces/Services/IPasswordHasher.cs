namespace BitirmeBackend.Application.Interfaces.Services;

public interface IPasswordHasher
{
    string HashPassword(string plainTextPassword);
    bool VerifyPassword(string plainTextPassword, string hash);
}
