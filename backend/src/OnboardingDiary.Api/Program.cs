using System.Text;
using System.Threading.RateLimiting;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Endpoints;
using OnboardingDiary.Api.Features.Auth;
using OnboardingDiary.Api.Features.Profile;
using OnboardingDiary.Api.Infrastructure;
using OnboardingDiary.Api.Infrastructure.Auth;
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

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ProfileService>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddValidatorsFromAssemblyContaining<SignupRequestValidator>();

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
var jwtOptions =
    builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwtOptions.Key))
{
    throw new InvalidOperationException(
        "Jwt:Key is not configured. Set it through configuration or the JWT__KEY environment variable."
    );
}

builder
    .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            NameClaimType = JwtClaimNames.Subject,
            RoleClaimType = JwtClaimNames.Role,
        };
    });

builder
    .Services.AddAuthorizationBuilder()
    .AddPolicy(
        AuthorizationPolicies.AdminOnly,
        policy => policy.RequireRole(nameof(UserRole.Admin))
    )
    .AddPolicy(
        AuthorizationPolicies.RecruitOnly,
        policy => policy.RequireRole(nameof(UserRole.Recruit))
    )
    .AddPolicy(
        AuthorizationPolicies.ManagerOrAdmin,
        policy => policy.RequireRole(nameof(UserRole.Manager), nameof(UserRole.Admin))
    );

var loginPermitLimit = builder.Configuration.GetValue("RateLimiting:LoginPermitLimit", 5);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(
        AuthEndpoints.LoginRateLimitPolicy,
        context =>
            RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = loginPermitLimit,
                    Window = TimeSpan.FromMinutes(15),
                }
            )
    );
});

builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DatabaseSeeder.SeedAsync(db);
    await AdminSeeder.SeedAsync(
        db,
        scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>(),
        app.Configuration,
        scope.ServiceProvider.GetRequiredService<TimeProvider>()
    );
}

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/healthz", () => Results.Ok(new { status = "ok" }));
app.MapAuthEndpoints();
app.MapProfileEndpoints();

app.Run();

public partial class Program;
