using PlusgrowWms.Api.DTOs;

namespace PlusgrowWms.Api.Services;

public interface IBinService
{
    Task<List<BinDto>> GetAllAsync();
    Task<BinDto?> GetByIdAsync(int id);
    Task<(BinDto? Bin, int TotalCount)> CreateAsync(CreateBinDto createBinDto);
    Task<(BinDto? Bin, string? Error)> UpdateAsync(int id, UpdateBinDto updateBinDto);
    Task<bool> DeleteAsync(int id);
}
