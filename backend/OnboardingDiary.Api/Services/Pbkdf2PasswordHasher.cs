using System.Security.Cryptography;

namespace OnboardingDiary.Api.Services;

public class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 100_000;

    public (string Hash, string Salt) Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Derive(password, salt);
        return (Convert.ToBase64String(hash), Convert.ToBase64String(salt));
    }

    public bool Verify(string password, string hash, string salt)
    {
        byte[] saltBytes;
        byte[] hashBytes;
        try
        {
            saltBytes = Convert.FromBase64String(salt);
            hashBytes = Convert.FromBase64String(hash);
        }
        catch (FormatException)
        {
            return false;
        }

        var candidate = Derive(password, saltBytes);
        return CryptographicOperations.FixedTimeEquals(candidate, hashBytes);
    }

    private static byte[] Derive(string password, byte[] salt) =>
        Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, KeySize);
}
