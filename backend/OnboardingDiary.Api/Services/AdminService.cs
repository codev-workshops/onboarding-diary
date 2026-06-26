using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.DTOs.Admin;
using OnboardingDiary.Api.DTOs.Common;
using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Services;

public class AdminService : IAdminService
{
    private readonly AppDbContext _context;

    public AdminService(AppDbContext context)
    {
        _context = context;
    }

    // User management

    public async Task<PaginatedResponse<UserResponseDto>> GetUsersAsync(UserFilterParams filterParams)
    {
        var query = _context.Users.Include(u => u.Manager).AsQueryable();

        if (filterParams.Role.HasValue)
            query = query.Where(u => u.Role == filterParams.Role.Value);

        if (!string.IsNullOrWhiteSpace(filterParams.Department))
            query = query.Where(u => u.Department == filterParams.Department);

        if (filterParams.IsActive.HasValue)
            query = query.Where(u => u.IsActive == filterParams.IsActive.Value);

        if (!string.IsNullOrWhiteSpace(filterParams.Search))
        {
            var search = filterParams.Search.ToLower();
            query = query.Where(u => u.Name.ToLower().Contains(search) || u.Email.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync();

        var pageSize = filterParams.PageSize < 1 ? 10 : filterParams.PageSize > 50 ? 50 : filterParams.PageSize;
        var page = filterParams.Page < 1 ? 1 : filterParams.Page;

        var users = await query
            .OrderBy(u => u.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PaginatedResponse<UserResponseDto>
        {
            Items = users.Select(MapToUserResponse),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<UserResponseDto> GetUserByIdAsync(int id)
    {
        var user = await _context.Users.Include(u => u.Manager).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            throw new KeyNotFoundException($"User with id {id} not found.");

        return MapToUserResponse(user);
    }

    public async Task<UserResponseDto> CreateUserAsync(CreateUserDto dto)
    {
        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (existingUser != null)
            throw new InvalidOperationException("A user with this email already exists.");

        var user = new User
        {
            Name = dto.Name,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = dto.Role,
            Department = dto.Department,
            StartDate = dto.StartDate ?? DateTime.UtcNow,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return MapToUserResponse(user);
    }

    public async Task<UserResponseDto> UpdateUserAsync(int id, UpdateUserDto dto)
    {
        var user = await _context.Users.Include(u => u.Manager).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            throw new KeyNotFoundException($"User with id {id} not found.");

        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email && u.Id != id);
        if (existingUser != null)
            throw new InvalidOperationException("A user with this email already exists.");

        user.Name = dto.Name;
        user.Email = dto.Email;
        user.Role = dto.Role;
        user.Department = dto.Department;
        user.StartDate = dto.StartDate ?? user.StartDate;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToUserResponse(user);
    }

    public async Task<UserResponseDto> UpdateUserStatusAsync(int id, UserStatusDto dto)
    {
        var user = await _context.Users.Include(u => u.Manager).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            throw new KeyNotFoundException($"User with id {id} not found.");

        user.IsActive = dto.IsActive!.Value;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToUserResponse(user);
    }

    public async Task<UserResponseDto> AssignManagerAsync(int userId, AssignManagerDto dto)
    {
        if (userId == dto.ManagerId!.Value)
            throw new InvalidOperationException("A user cannot be assigned as their own manager.");

        var user = await _context.Users.Include(u => u.Manager).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            throw new KeyNotFoundException($"User with id {userId} not found.");

        var manager = await _context.Users.FirstOrDefaultAsync(u => u.Id == dto.ManagerId!.Value && u.Role == UserRole.Manager);
        if (manager == null)
            throw new KeyNotFoundException($"Manager with id {dto.ManagerId.Value} not found or user is not a Manager.");

        user.ManagerId = dto.ManagerId.Value;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        user.Manager = manager;
        return MapToUserResponse(user);
    }

    // Department management

    public async Task<IEnumerable<DepartmentDto>> GetDepartmentsAsync()
    {
        var departments = await _context.Departments.OrderBy(d => d.Name).ToListAsync();
        return departments.Select(MapToDepartmentDto);
    }

    public async Task<DepartmentDto> CreateDepartmentAsync(CreateDepartmentDto dto)
    {
        var existing = await _context.Departments.FirstOrDefaultAsync(d => d.Name == dto.Name);
        if (existing != null)
            throw new InvalidOperationException("A department with this name already exists.");

        var department = new Department
        {
            Name = dto.Name,
            Description = dto.Description,
            CreatedAt = DateTime.UtcNow
        };

        _context.Departments.Add(department);
        await _context.SaveChangesAsync();

        return MapToDepartmentDto(department);
    }

    public async Task<DepartmentDto> UpdateDepartmentAsync(int id, UpdateDepartmentDto dto)
    {
        var department = await _context.Departments.FirstOrDefaultAsync(d => d.Id == id);
        if (department == null)
            throw new KeyNotFoundException($"Department with id {id} not found.");

        var existing = await _context.Departments.FirstOrDefaultAsync(d => d.Name == dto.Name && d.Id != id);
        if (existing != null)
            throw new InvalidOperationException("A department with this name already exists.");

        var oldName = department.Name;
        department.Name = dto.Name;
        department.Description = dto.Description;

        if (oldName != dto.Name)
        {
            var usersInDepartment = await _context.Users.Where(u => u.Department == oldName).ToListAsync();
            foreach (var user in usersInDepartment)
            {
                user.Department = dto.Name;
            }
        }

        await _context.SaveChangesAsync();

        return MapToDepartmentDto(department);
    }

    public async Task DeleteDepartmentAsync(int id)
    {
        var department = await _context.Departments.FirstOrDefaultAsync(d => d.Id == id);
        if (department == null)
            throw new KeyNotFoundException($"Department with id {id} not found.");

        var hasUsers = await _context.Users.AnyAsync(u => u.Department == department.Name);
        if (hasUsers)
            throw new InvalidOperationException("Cannot delete department because it has users assigned to it.");

        _context.Departments.Remove(department);
        await _context.SaveChangesAsync();
    }

    // Category management

    public async Task<IEnumerable<CategoryDto>> GetCategoriesAsync()
    {
        var categories = await _context.Categories.OrderBy(c => c.Name).ToListAsync();
        return categories.Select(MapToCategoryDto);
    }

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto dto)
    {
        var existing = await _context.Categories.FirstOrDefaultAsync(c => c.Name == dto.Name);
        if (existing != null)
            throw new InvalidOperationException("A category with this name already exists.");

        var category = new Category
        {
            Name = dto.Name,
            Description = dto.Description,
            CreatedAt = DateTime.UtcNow
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return MapToCategoryDto(category);
    }

    public async Task<CategoryDto> UpdateCategoryAsync(int id, UpdateCategoryDto dto)
    {
        var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id);
        if (category == null)
            throw new KeyNotFoundException($"Category with id {id} not found.");

        var existing = await _context.Categories.FirstOrDefaultAsync(c => c.Name == dto.Name && c.Id != id);
        if (existing != null)
            throw new InvalidOperationException("A category with this name already exists.");

        var oldName = category.Name;
        category.Name = dto.Name;
        category.Description = dto.Description;

        if (oldName != dto.Name)
        {
            var tasksWithCategory = await _context.TaskEntries.Where(t => t.Category == oldName).ToListAsync();
            foreach (var task in tasksWithCategory)
            {
                task.Category = dto.Name;
            }
        }

        await _context.SaveChangesAsync();

        return MapToCategoryDto(category);
    }

    public async Task DeleteCategoryAsync(int id)
    {
        var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id);
        if (category == null)
            throw new KeyNotFoundException($"Category with id {id} not found.");

        var hasTasksUsingCategory = await _context.TaskEntries.AnyAsync(t => t.Category == category.Name);
        if (hasTasksUsingCategory)
            throw new InvalidOperationException("Cannot delete category because it is used by existing tasks.");

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
    }

    // Mapping helpers

    private static UserResponseDto MapToUserResponse(User user)
    {
        return new UserResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            Department = user.Department,
            StartDate = user.StartDate,
            ManagerId = user.ManagerId,
            ManagerName = user.Manager?.Name,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    private static DepartmentDto MapToDepartmentDto(Department department)
    {
        return new DepartmentDto
        {
            Id = department.Id,
            Name = department.Name,
            Description = department.Description,
            CreatedAt = department.CreatedAt
        };
    }

    private static CategoryDto MapToCategoryDto(Category category)
    {
        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            CreatedAt = category.CreatedAt
        };
    }
}
