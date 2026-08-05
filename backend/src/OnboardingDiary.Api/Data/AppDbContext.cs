using Microsoft.EntityFrameworkCore;

namespace OnboardingDiary.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
}
