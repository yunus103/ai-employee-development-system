using BitirmeBackend.Contracts.Requests;
using FluentValidation;

namespace BitirmeBackend.Api.Validators;

// ── Auth ─────────────────────────────────────────────────────────────────────

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta boş olamaz.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre boş olamaz.")
            .MinimumLength(6).WithMessage("Şifre en az 6 karakter olmalıdır.");
    }
}

public class RefreshTokenRequestValidator : AbstractValidator<RefreshTokenRequest>
{
    public RefreshTokenRequestValidator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty().WithMessage("Refresh token boş olamaz.")
            .Must(t => !string.IsNullOrWhiteSpace(t)).WithMessage("Refresh token yalnızca boşluk içeremez.");
    }
}

// ── Employee ──────────────────────────────────────────────────────────────────

public class CreateEmployeeRequestValidator : AbstractValidator<CreateEmployeeRequest>
{
    public CreateEmployeeRequestValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Ad Soyad boş olamaz.")
            .MaximumLength(200).WithMessage("Ad Soyad en fazla 200 karakter olabilir.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta boş olamaz.")
            .EmailAddress().WithMessage("Geçerli bir e-posta adresi giriniz.");

        RuleFor(x => x.Age)
            .InclusiveBetween(18, 70).WithMessage("Yaş 18 ile 70 arasında olmalıdır.");

        RuleFor(x => x.PerformanceScore)
            .InclusiveBetween(0.0, 5.0).WithMessage("Performans skoru 0.0 ile 5.0 arasında olmalıdır.");
    }
}

// ── Assessment ────────────────────────────────────────────────────────────────

public class CreateAssessmentRequestValidator : AbstractValidator<CreateAssessmentRequest>
{
    public CreateAssessmentRequestValidator()
    {
        RuleFor(x => x.EmployeeId)
            .GreaterThan(0).WithMessage("Geçerli bir EmployeeId giriniz.");

        RuleFor(x => x.CycleId)
            .GreaterThan(0).WithMessage("Geçerli bir CycleId giriniz.");
    }
}

public class UpsertAssessmentScoreRequestValidator : AbstractValidator<UpsertAssessmentScoreRequest>
{
    public UpsertAssessmentScoreRequestValidator()
    {
        RuleFor(x => x.Score)
            .InclusiveBetween(0.0, 5.0).WithMessage("Skor 0.0 ile 5.0 arasında olmalıdır.");

        RuleFor(x => x.CompetencyId)
            .GreaterThan(0).WithMessage("Geçerli bir CompetencyId giriniz.");
    }
}

// ── Action Plan ───────────────────────────────────────────────────────────────

public class GenerateActionPlanRequestValidator : AbstractValidator<GenerateActionPlanRequest>
{
    public GenerateActionPlanRequestValidator()
    {
        RuleFor(x => x.AssessmentId)
            .GreaterThan(0).WithMessage("Geçerli bir AssessmentId giriniz.");

        RuleFor(x => x.TopK)
            .InclusiveBetween(1, 50).WithMessage("TopK değeri 1 ile 50 arasında olmalıdır.");
    }
}

public class UpdateActionPlanItemRequestValidator : AbstractValidator<UpdateActionPlanItemRequest>
{
    public UpdateActionPlanItemRequestValidator()
    {
        RuleFor(x => x.Title)
            .MaximumLength(500).WithMessage("Başlık en fazla 500 karakter olabilir.")
            .When(x => !string.IsNullOrEmpty(x.Title));

        RuleFor(x => x.DueDate)
            .GreaterThan(DateTime.UtcNow).WithMessage("Son tarih gelecekte bir tarih olmalıdır.")
            .When(x => x.DueDate.HasValue);
    }
}

public class AddManualActionPlanItemRequestValidator : AbstractValidator<AddManualActionPlanItemRequest>
{
    public AddManualActionPlanItemRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Başlık boş olamaz.")
            .MaximumLength(500).WithMessage("Başlık en fazla 500 karakter olabilir.");

        RuleFor(x => x.DueDate)
            .GreaterThan(DateTime.UtcNow).WithMessage("Son tarih gelecekte bir tarih olmalıdır.")
            .When(x => x.DueDate.HasValue);
    }
}

// ── Employee Task ─────────────────────────────────────────────────────────────

public class UpdateEmployeeTaskStatusRequestValidator : AbstractValidator<UpdateEmployeeTaskStatusRequest>
{
    public UpdateEmployeeTaskStatusRequestValidator()
    {
        RuleFor(x => x.NewStatus)
            .NotEmpty().WithMessage("Yeni durum değeri boş olamaz.");
    }
}
