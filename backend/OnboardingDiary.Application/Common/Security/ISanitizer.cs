namespace OnboardingDiary.Application.Common.Security;

public interface ISanitizer
{
    string Sanitize(string input);
}
