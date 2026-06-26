using OnboardingDiary.Api.Entities;

namespace OnboardingDiary.Api.Repositories;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email);
    Task<bool> EmailExistsAsync(string email);
    Task<User?> GetByResetTokenAsync(string token);
}
