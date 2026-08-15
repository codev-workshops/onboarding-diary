using FluentAssertions;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Tests.Unit;

public class Pbkdf2PasswordHasherTests
{
    private readonly Pbkdf2PasswordHasher _hasher = new();

    [Fact]
    public void Hash_ProducesDifferentSaltsForTheSamePassword()
    {
        var first = _hasher.Hash("Admin#12345");
        var second = _hasher.Hash("Admin#12345");

        first.Salt.Should().NotBe(second.Salt);
        first.Hash.Should().NotBe(second.Hash);
    }

    [Fact]
    public void Verify_ReturnsTrueForTheOriginalPassword()
    {
        var (hash, salt) = _hasher.Hash("Correct#Horse1");

        _hasher.Verify("Correct#Horse1", hash, salt).Should().BeTrue();
    }

    [Fact]
    public void Verify_ReturnsFalseForAWrongPassword()
    {
        var (hash, salt) = _hasher.Hash("Correct#Horse1");

        _hasher.Verify("Wrong#Horse1", hash, salt).Should().BeFalse();
    }
}
