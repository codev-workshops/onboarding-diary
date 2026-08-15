using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("recruits")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetRecruits(CancellationToken cancellationToken) =>
        Ok(await _userService.GetRecruitsAsync(cancellationToken));

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetAll(CancellationToken cancellationToken) =>
        Ok(await _userService.GetAllUsersAsync(cancellationToken));
}
