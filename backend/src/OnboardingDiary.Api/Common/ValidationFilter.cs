using FluentValidation;

namespace OnboardingDiary.Api.Common;

/// <summary>
/// Runs the registered <see cref="IValidator{T}"/> for the endpoint's request body and turns
/// failures into an RFC 7807 validation problem.
/// </summary>
public class ValidationFilter<T>(IValidator<T> validator) : IEndpointFilter
    where T : class
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext context,
        EndpointFilterDelegate next
    )
    {
        var request = context.Arguments.OfType<T>().FirstOrDefault();
        if (request is null)
        {
            return await next(context);
        }

        var result = await validator.ValidateAsync(request, context.HttpContext.RequestAborted);
        if (result.IsValid)
        {
            return await next(context);
        }

        var errors = result
            .Errors.GroupBy(failure => failure.PropertyName)
            .ToDictionary(
                group => group.Key,
                group => group.Select(failure => failure.ErrorMessage).ToArray()
            );

        return TypedResults.ValidationProblem(errors);
    }
}

public static class ValidationFilterExtensions
{
    public static RouteHandlerBuilder WithValidation<T>(this RouteHandlerBuilder builder)
        where T : class => builder.AddEndpointFilter<ValidationFilter<T>>().ProducesValidationProblem();
}
