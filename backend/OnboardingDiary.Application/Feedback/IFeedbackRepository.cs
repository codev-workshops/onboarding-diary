namespace OnboardingDiary.Application.Feedback;

public interface IFeedbackRepository
{
    IQueryable<Domain.Entities.Feedback> Query();
    Task<Domain.Entities.Feedback?> GetByIdAsync(Guid id, CancellationToken ct = default);
    void Add(Domain.Entities.Feedback entity);
    void Update(Domain.Entities.Feedback entity);
    Task SaveChangesAsync(CancellationToken ct = default);
}
