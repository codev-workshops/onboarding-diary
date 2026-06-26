using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using OnboardingDiary.Api.Authorization;
using OnboardingDiary.Api.Middleware;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Common.Auth;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure;
using OnboardingDiary.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Infrastructure (DbContext, repositories, auth services, etc.)
builder.Services.AddInfrastructure(builder.Configuration);

// Global exception handler + ProblemDetails
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// JWT Authentication
var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
var jwtOptions = jwtSection.Get<JwtOptions>()!;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtOptions.Issuer,
        ValidateAudience = true,
        ValidAudience = jwtOptions.Audience,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
        ClockSkew = TimeSpan.FromSeconds(30)
    };
});

// Authorization policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole(nameof(Role.Admin)));
    options.AddPolicy("ManagerOrAdmin", policy =>
        policy.RequireRole(nameof(Role.Manager), nameof(Role.Admin)));
    options.AddPolicy("AssignedRecruitOrSelf", policy =>
        policy.AddRequirements(new AssignedRecruitRequirement()));
});

builder.Services.AddScoped<IAuthorizationHandler, AssignedRecruitAuthorizationHandler>();

// Rate limiting
var rlPermitPerMinute = builder.Configuration.GetValue("RateLimiting:PermitPerMinute", 100);
var rlLoginPermit = builder.Configuration.GetValue("RateLimiting:LoginPermit", 5);
var rlLoginWindowMinutes = builder.Configuration.GetValue("RateLimiting:LoginWindowMinutes", 15);

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, ct) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/problem+json";

        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
        }

        var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails
        {
            Status = StatusCodes.Status429TooManyRequests,
            Title = "Too Many Requests",
            Detail = "Rate limit exceeded. Please try again later.",
            Type = "https://tools.ietf.org/html/rfc6585#section-4"
        };

        await context.HttpContext.Response.WriteAsJsonAsync(problem, ct);
    };

    // Global limiter: 100 req/min per authenticated user (falling back to IP)
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
    {
        var userId = ctx.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var partitionKey = userId ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "anonymous";

        return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = rlPermitPerMinute,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });
    });

    // Named policy for login: 5 attempts per 15 minutes keyed by IP + email
    // NOTE: Both this transport-level limit and the Phase 2 per-account lockout
    // (5 failed attempts -> LockoutEnd) coexist. This rate limiter fires first
    // at the middleware level; the business-rule lockout is enforced by AuthService.
    options.AddPolicy("login", ctx =>
    {
        var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        string email;
        try
        {
            ctx.Request.EnableBuffering();
            using var reader = new StreamReader(ctx.Request.Body, leaveOpen: true);
            var body = reader.ReadToEndAsync().GetAwaiter().GetResult();
            ctx.Request.Body.Position = 0;
            var doc = System.Text.Json.JsonDocument.Parse(body);
            email = doc.RootElement.TryGetProperty("email", out var emailProp)
                ? emailProp.GetString() ?? "unknown"
                : "unknown";
        }
        catch
        {
            email = "unknown";
        }

        var partitionKey = $"login_{ip}_{email}";
        return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = rlLoginPermit,
            Window = TimeSpan.FromMinutes(rlLoginWindowMinutes),
            QueueLimit = 0
        });
    });
});

// Swagger/OpenAPI with JWT Bearer security definition
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Onboarding Diary API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// CORS
var frontendOrigin = builder.Configuration.GetValue<string>("Cors:FrontendOrigin") ?? "http://localhost:3000";
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendCors", policy =>
    {
        policy.WithOrigins(frontendOrigin)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

await app.Services.SeedAsync();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler();
app.UseHttpsRedirection();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseCors("FrontendCors");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();

app.Run();

// Make the implicit Program class public for integration tests
public partial class Program { }
