using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
            return BadRequest(new { Errors = validation.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });

        try
        {
            var response = await _authService.RegisterAsync(request);
            return StatusCode(201, response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        [FromServices] IValidator<LoginRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(new { Errors = validation.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });

        try
        {
            var response = await _authService.LoginAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { Error = "Invalid email or password." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(
        [FromBody] LogoutRequest request,
        [FromServices] IValidator<LogoutRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(new { Errors = validation.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });

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
            return BadRequest(new { Errors = validation.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });

        try
        {
            var response = await _authService.RefreshAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { Error = "Invalid or expired refresh token." });
        }
    }

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(
        [FromBody] ForgotPasswordRequest request,
        [FromServices] IValidator<ForgotPasswordRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return BadRequest(new { Errors = validation.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });

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
            return BadRequest(new { Errors = validation.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });

        try
        {
            await _authService.ResetPasswordAsync(request);
            return Ok(new { Message = "Password has been reset successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
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
