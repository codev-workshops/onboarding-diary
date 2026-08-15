namespace OnboardingDiary.Api.Services;

public interface IAccessService
{
    /// <summary>Resolves the user whose data is being requested and verifies read access.</summary>
    Task<int> ResolveReadableUserIdAsync(int? recruitId, CancellationToken cancellationToken = default);

    Task EnsureCanReadAsync(int ownerUserId, CancellationToken cancellationToken = default);

    void EnsureCanWrite(int ownerUserId);

    Task<IReadOnlyList<int>> GetOverseenUserIdsAsync(CancellationToken cancellationToken = default);
}
