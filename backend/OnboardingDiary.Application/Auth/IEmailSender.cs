namespace OnboardingDiary.Application.Auth;

public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string body);
}
