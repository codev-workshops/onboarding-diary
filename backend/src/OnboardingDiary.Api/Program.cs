using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Infrastructure;
using OnboardingDiary.Api.Infrastructure.Seed;

var builder = WebApplication.CreateBuilder(args);

var databasePath = Path.GetFullPath(
    Path.Combine(
        builder.Environment.ContentRootPath,
        builder.Configuration["Database:Path"] ?? "../../data/onboardingdiary.db"
    )
);
Directory.CreateDirectory(Path.GetDirectoryName(databasePath)!);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={databasePath}")
);

var allowedOrigins =
    builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()
    )
);

builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DatabaseSeeder.SeedAsync(db);
}

app.UseCors();

app.MapGet("/healthz", () => Results.Ok(new { status = "ok" }));

app.Run();

public partial class Program;
