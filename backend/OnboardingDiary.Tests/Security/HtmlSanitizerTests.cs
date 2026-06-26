using OnboardingDiary.Application.Common.Security;

namespace OnboardingDiary.Tests.Security;

public class HtmlSanitizerTests
{
    private readonly ISanitizer _sanitizer = new HtmlSanitizer();

    [Fact]
    public void Sanitize_NullInput_ReturnsNull()
    {
        Assert.Null(_sanitizer.Sanitize(null!));
    }

    [Fact]
    public void Sanitize_EmptyString_ReturnsEmpty()
    {
        Assert.Equal("", _sanitizer.Sanitize(""));
    }

    [Fact]
    public void Sanitize_PlainText_ReturnsUnchanged()
    {
        var input = "Hello World";
        Assert.Equal("Hello World", _sanitizer.Sanitize(input));
    }

    [Fact]
    public void Sanitize_ScriptTag_IsEscaped()
    {
        var input = "<script>alert('xss')</script>";
        var result = _sanitizer.Sanitize(input);

        Assert.DoesNotContain("<script>", result);
        Assert.Contains("&lt;script&gt;", result);
    }

    [Fact]
    public void Sanitize_HtmlTags_AreEscaped()
    {
        var input = "<b>bold</b> & <i>italic</i>";
        var result = _sanitizer.Sanitize(input);

        Assert.DoesNotContain("<b>", result);
        Assert.Contains("&lt;b&gt;", result);
        Assert.Contains("&amp;", result);
    }

    [Fact]
    public void Sanitize_ImgTagWithOnerror_IsEscaped()
    {
        var input = "<img src=x onerror=alert(1)>";
        var result = _sanitizer.Sanitize(input);

        Assert.DoesNotContain("<img", result);
        Assert.Contains("&lt;img", result);
    }

    [Fact]
    public void Sanitize_Quotes_AreEscaped()
    {
        var input = "He said \"hello\" & she said 'hi'";
        var result = _sanitizer.Sanitize(input);

        Assert.DoesNotContain("\"hello\"", result);
        Assert.Contains("&amp;", result);
    }

    [Fact]
    public void Sanitize_IsIdempotent_NoDoubleEncoding()
    {
        var input = "AT&T <script>alert('xss')</script>";
        var firstPass = _sanitizer.Sanitize(input);
        var secondPass = _sanitizer.Sanitize(firstPass);

        Assert.Equal(firstPass, secondPass);
    }

    [Fact]
    public void Sanitize_AlreadyEncodedInput_RemainsStable()
    {
        var alreadyEncoded = "AT&amp;T O&#x27;Brien";
        var result = _sanitizer.Sanitize(alreadyEncoded);
        var resultAgain = _sanitizer.Sanitize(result);

        Assert.Equal(result, resultAgain);
    }
}
