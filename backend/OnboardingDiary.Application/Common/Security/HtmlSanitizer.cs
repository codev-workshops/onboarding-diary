using System.Net;
using System.Text.Encodings.Web;

namespace OnboardingDiary.Application.Common.Security;

public class HtmlSanitizer : ISanitizer
{
    private readonly HtmlEncoder _encoder = HtmlEncoder.Default;

    public string Sanitize(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;

        var decoded = WebUtility.HtmlDecode(input);
        return _encoder.Encode(decoded);
    }
}
