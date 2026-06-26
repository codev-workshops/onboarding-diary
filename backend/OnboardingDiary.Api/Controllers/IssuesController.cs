using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Api.DTOs.Common;
using OnboardingDiary.Api.DTOs.Issues;
using OnboardingDiary.Api.Entities.Enums;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class IssuesController : ControllerBase
{
    private readonly IIssueService _issueService;

    public IssuesController(IIssueService issueService)
    {
        _issueService = issueService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PaginatedResponse<IssueResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] IssueStatus? status,
        [FromQuery] IssueSeverity? severity,
        [FromQuery] int? userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? sortBy = "Date",
        [FromQuery] string? sortOrder = "desc")
    {
        var currentUserId = GetCurrentUserId();
        var currentUserRole = GetCurrentUserRole();
        var pagination = new PaginationParams
        {
            Page = page,
            PageSize = pageSize,
            SortBy = sortBy,
            SortDescending = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase)
        };

        var result = await _issueService.GetAllAsync(
            currentUserId, currentUserRole, dateFrom, dateTo, status, severity, userId, pagination);
        return Ok(result);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(IssueResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var currentUserId = GetCurrentUserId();
        var currentUserRole = GetCurrentUserRole();
        var result = await _issueService.GetByIdAsync(id, currentUserId, currentUserRole);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(IssueResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateIssueDto dto)
    {
        var currentUserId = GetCurrentUserId();
        var result = await _issueService.CreateAsync(dto, currentUserId);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(IssueResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateIssueDto dto)
    {
        var currentUserId = GetCurrentUserId();
        var result = await _issueService.UpdateAsync(id, dto, currentUserId);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var currentUserId = GetCurrentUserId();
        await _issueService.DeleteAsync(id, currentUserId);
        return NoContent();
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User not authenticated.");
        return int.Parse(userIdClaim);
    }

    private UserRole GetCurrentUserRole()
    {
        var roleClaim = User.FindFirstValue(ClaimTypes.Role)
            ?? throw new UnauthorizedAccessException("User role not found.");
        return Enum.Parse<UserRole>(roleClaim);
    }
}
