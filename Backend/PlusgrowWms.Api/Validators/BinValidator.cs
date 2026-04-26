using FluentValidation;
using PlusgrowWms.Api.DTOs;

namespace PlusgrowWms.Api.Validators;

public class CreateBinValidator : AbstractValidator<CreateBinDto>
{
    public CreateBinValidator()
    {
        RuleFor(x => x.BinCode)
            .NotEmpty().WithMessage("Bin Code is required")
            .MaximumLength(20).WithMessage("Bin Code cannot exceed 20 characters");
    }
}

public class UpdateBinValidator : AbstractValidator<UpdateBinDto>
{
    public UpdateBinValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.BinCode)
            .NotEmpty().WithMessage("Bin Code is required")
            .MaximumLength(20).WithMessage("Bin Code cannot exceed 20 characters");
    }
}
