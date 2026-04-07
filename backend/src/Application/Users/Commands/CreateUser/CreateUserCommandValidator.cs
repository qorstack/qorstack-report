namespace QorstackReportService.Application.Users.Commands.CreateUser;

/// <summary>
/// Validator for CreateUserCommand
/// </summary>
public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    private static readonly string[] ValidStatuses = { "active", "inactive", "suspended" };

    public CreateUserCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .WithMessage("Email is required")
            .EmailAddress()
            .WithMessage("Invalid email format")
            .MaximumLength(255)
            .WithMessage("Email must not exceed 255 characters");

        RuleFor(x => x.Password)
            .NotEmpty()
            .WithMessage("Password is required")
            .MinimumLength(8)
            .WithMessage("Password must be at least 8 characters");

        RuleFor(x => x.FirstName)
            .MaximumLength(100)
            .WithMessage("First name must not exceed 100 characters");

        RuleFor(x => x.LastName)
            .MaximumLength(100)
            .WithMessage("Last name must not exceed 100 characters");

        RuleFor(x => x.Status)
            .Must(status => ValidStatuses.Contains(status?.ToLowerInvariant()))
            .WithMessage($"Status must be one of: {string.Join(", ", ValidStatuses)}");
    }
}
