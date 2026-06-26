using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Auth.Dtos;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request,
        [FromServices] IValidator<RegisterRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new FluentValidation.ValidationException(validation.Errors);

        var response = await _authService.RegisterAsync(request);
        return StatusCode(201, response);
    }

    [AllowAnonymous]
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        [FromServices] IValidator<LoginRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new FluentValidation.ValidationException(validation.Errors);

        var response = await _authService.LoginAsync(request);
        return Ok(response);
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(
        [FromBody] LogoutRequest request,
        [FromServices] IValidator<LogoutRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new FluentValidation.ValidationException(validation.Errors);

        await _authService.LogoutAsync(request);
        return NoContent();
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(
        [FromBody] RefreshRequest request,
        [FromServices] IValidator<RefreshRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new FluentValidation.ValidationException(validation.Errors);

        var response = await _authService.RefreshAsync(request);
        return Ok(response);
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(
        [FromBody] ForgotPasswordRequest request,
        [FromServices] IValidator<ForgotPasswordRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new FluentValidation.ValidationException(validation.Errors);

        await _authService.ForgotPasswordAsync(request);
        return Ok(new { Message = "If an account with that email exists, a password reset link has been sent." });
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(
        [FromBody] ResetPasswordRequest request,
        [FromServices] IValidator<ResetPasswordRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new FluentValidation.ValidationException(validation.Errors);

        await _authService.ResetPasswordAsync(request);
        return Ok(new { Message = "Password has been reset successfully." });
    }

    [Authorize]
    [HttpGet("ping")]
    public IActionResult Ping([FromServices] ICurrentUser currentUser)
    {
        return Ok(new
        {
            UserId = currentUser.UserId,
            Role = currentUser.Role,
            IsAuthenticated = currentUser.IsAuthenticated
        });
    }
}
