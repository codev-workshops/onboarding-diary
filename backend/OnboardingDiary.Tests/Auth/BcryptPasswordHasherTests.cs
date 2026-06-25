using OnboardingDiary.Infrastructure.Auth;

namespace OnboardingDiary.Tests.Auth;

public class BcryptPasswordHasherTests
{
    private readonly BcryptPasswordHasher _hasher = new();

    [Fact]
    public void Hash_ReturnsNonEmptyString()
    {
        var hash = _hasher.Hash("Test@1234");
        Assert.False(string.IsNullOrEmpty(hash));
    }

    [Fact]
    public void Verify_ReturnsTrueForCorrectPassword()
    {
        var password = "MySecure@1";
        var hash = _hasher.Hash(password);
        Assert.True(_hasher.Verify(password, hash));
    }

    [Fact]
    public void Verify_ReturnsFalseForIncorrectPassword()
    {
        var hash = _hasher.Hash("CorrectPass@1");
        Assert.False(_hasher.Verify("WrongPass@1", hash));
    }

    [Fact]
    public void Hash_ProducesDifferentHashesForSamePassword()
    {
        var hash1 = _hasher.Hash("Same@Pass1");
        var hash2 = _hasher.Hash("Same@Pass1");
        Assert.NotEqual(hash1, hash2);
    }
}
