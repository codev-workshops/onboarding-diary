namespace OnboardingDiary.Api.Common;

public static class AuthorizationPolicies
{
    public const string AdminOnly = "AdminOnly";

    public const string RecruitOnly = "RecruitOnly";

    public const string ManagerOrAdmin = "ManagerOrAdmin";
}
