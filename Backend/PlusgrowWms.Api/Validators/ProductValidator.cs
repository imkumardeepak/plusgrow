using FluentValidation;
using PlusgrowWms.Api.DTOs;

namespace PlusgrowWms.Api.Validators;

public class ProductValidator : AbstractValidator<CreateProductDto>
{
    public ProductValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Product name is required")
            .MaximumLength(255).WithMessage("Product name cannot exceed 255 characters");
            
        RuleFor(x => x.Sku)
            .MaximumLength(100).WithMessage("SKU cannot exceed 100 characters");
            
        RuleFor(x => x.HsnCode)
            .MaximumLength(20).WithMessage("HSN code cannot exceed 20 characters");
            
        RuleFor(x => x.Mrp)
            .GreaterThanOrEqualTo(0).When(x => x.Mrp.HasValue)
            .WithMessage("MRP must be greater than or equal to 0");
            
        RuleFor(x => x.Ussp)
            .GreaterThanOrEqualTo(0).When(x => x.Ussp.HasValue)
            .WithMessage("USSP must be greater than or equal to 0");
            
        RuleFor(x => x.Factor)
            .GreaterThan(0).When(x => x.Factor.HasValue)
            .WithMessage("Factor must be greater than 0");
    }
}
