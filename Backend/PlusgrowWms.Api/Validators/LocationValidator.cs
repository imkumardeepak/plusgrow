using FluentValidation;
using PlusgrowWms.Api.DTOs;

namespace PlusgrowWms.Api.Validators;

public class CreateLocationValidator : AbstractValidator<CreateLocationDto>
{
    public CreateLocationValidator()
    {
        RuleFor(x => x.Aisle).NotEmpty().MaximumLength(5);
        RuleFor(x => x.Rack).NotEmpty().MaximumLength(5);
        RuleFor(x => x.Shelf).NotEmpty().MaximumLength(5);
        RuleFor(x => x.LocationCode).NotEmpty().MaximumLength(20);
    }
}

public class UpdateLocationValidator : AbstractValidator<UpdateLocationDto>
{
    public UpdateLocationValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Aisle).NotEmpty().MaximumLength(5);
        RuleFor(x => x.Rack).NotEmpty().MaximumLength(5);
        RuleFor(x => x.Shelf).NotEmpty().MaximumLength(5);
        RuleFor(x => x.LocationCode).NotEmpty().MaximumLength(20);
    }
}
