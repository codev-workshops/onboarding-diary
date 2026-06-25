using Microsoft.Extensions.Logging;
using OnboardingDiary.Application.Auth;

namespace OnboardingDiary.Infrastructure.Auth;

public class LoggingEmailSender : IEmailSender
{
    private readonly ILogger<LoggingEmailSender> _logger;

    public LoggingEmailSender(ILogger<LoggingEmailSender> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(string toEmail, string subject, string body)
    {
        _logger.LogInformation("Email to {To} | Subject: {Subject} | Body: {Body}", toEmail, subject, body);
        return Task.CompletedTask;
    }
}
