using AutoMapper;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // User Mappings
        CreateMap<User, UserDto>()
            .ForMember(dest => dest.RoleName, opt => opt.MapFrom(src => src.Role != null ? src.Role.Name : null));
        CreateMap<CreateUserDto, User>()
            .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
            .ForMember(dest => dest.Role, opt => opt.Ignore())
            .ForMember(dest => dest.RoleId, opt => opt.MapFrom(src => src.RoleId));
        CreateMap<UpdateUserDto, User>()
            .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
            .ForMember(dest => dest.Role, opt => opt.Ignore());
            
        // Role Mappings
        CreateMap<Role, RoleDto>()
            .ForMember(dest => dest.UserCount, opt => opt.MapFrom(src => src.Users != null ? src.Users.Count : 0));
        CreateMap<CreateRoleDto, Role>();
        CreateMap<UpdateRoleDto, Role>();
        
        // RolePageAccess Mappings
        CreateMap<RolePageAccess, RolePageAccessDto>();
        CreateMap<RolePageAccessDto, RolePageAccess>();
        
        // Product Mappings
        CreateMap<Product, ProductDto>()
            .ForMember(dest => dest.CommodityName, opt => opt.MapFrom(src => src.Commodity != null ? src.Commodity.Name : null))
            .ForMember(dest => dest.ManufacturerName, opt => opt.MapFrom(src => src.Manufacturer != null ? src.Manufacturer.Name : null));
        CreateMap<CreateProductDto, Product>()
            .ForMember(dest => dest.Commodity, opt => opt.Ignore())
            .ForMember(dest => dest.Manufacturer, opt => opt.Ignore());
        CreateMap<UpdateProductDto, Product>()
            .ForMember(dest => dest.Commodity, opt => opt.Ignore())
            .ForMember(dest => dest.Manufacturer, opt => opt.Ignore());
            
        // Importer Mappings
        CreateMap<Importer, ImporterDto>();
        CreateMap<CreateImporterDto, Importer>();
        
        // Manufacturer Mappings
        CreateMap<Manufacturer, ManufacturerDto>();
        CreateMap<CreateManufacturerDto, Manufacturer>();
        
        // Bin Mappings
        CreateMap<Bin, BinDto>();
        CreateMap<CreateBinDto, Bin>();
        CreateMap<UpdateBinDto, Bin>();
        
        // Location Mappings
        CreateMap<Location, LocationDto>();
        CreateMap<CreateLocationDto, Location>();
        CreateMap<UpdateLocationDto, Location>();

        // PO Invoice Mappings
        CreateMap<CreatePoInvoiceDto, PoInvoice>();
        CreateMap<UpdatePoInvoiceDto, PoInvoice>();
        CreateMap<CreateProductQuantityDto, ProductQuantity>();
        CreateMap<UpdateProductQuantityDto, ProductQuantity>();
        CreateMap<CreateProductAllottedLocationDto, ProductAllottedLocation>();
        CreateMap<UpdateProductAllottedLocationDto, ProductAllottedLocation>();
    }
}
