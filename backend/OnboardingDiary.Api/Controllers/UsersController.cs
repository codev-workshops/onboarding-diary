using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Common.Exceptions;
using OnboardingDiary.Application.Users;
using OnboardingDiary.Application.Users.Dtos;
using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ICurrentUser _currentUser;

    public UsersController(IUserService userService, ICurrentUser currentUser)
    {
        _userService = userService;
        _currentUser = currentUser;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var user = await _userService.GetCurrentUserAsync();
        return Ok(new { User = user });
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe(
        [FromBody] UpdateProfileRequest request,
        [FromServices] IValidator<UpdateProfileRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new FluentValidation.ValidationException(validation.Errors);

        var user = await _userService.UpdateProfileAsync(request);
        return Ok(new { User = user });
    }

    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> ListUsers(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? search = null,
        [FromQuery] Role? role = null,
        [FromQuery] string? department = null)
    {
        var result = await _userService.ListUsersAsync(page, limit, search, role, department);
        return Ok(new { Users = result.Items, result.Total, result.Page, result.PageSize, result.TotalPages });
    }

    [HttpPut("{id:guid}/role")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateRole(
        Guid id,
        [FromBody] UpdateRoleRequest request,
        [FromServices] IValidator<UpdateRoleRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            throw new FluentValidation.ValidationException(validation.Errors);

        if (_currentUser.UserId == id && request.Role != Role.Admin)
            throw new BusinessRuleException("You cannot remove Admin role from yourself.");

        var user = await _userService.UpdateRoleAsync(id, request.Role);
        return Ok(new { User = user });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeactivateUser(Guid id)
    {
        if (_currentUser.UserId == id)
            throw new BusinessRuleException("You cannot deactivate yourself.");

        await _userService.DeactivateUserAsync(id);
        return NoContent();
    }
}
