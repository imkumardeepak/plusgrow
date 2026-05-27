using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;

namespace PlusgrowWms.Api.Services;

public interface IPartyService
{
    Task<PagedListResult<Party>> GetPagedAsync(ListQueryDto queryDto);
    Task<Party?> GetByIdAsync(int id);
    Task<(Party? Party, string? Error)> CreateAsync(Party party);
    Task<(Party? Party, string? Error)> UpdateAsync(int id, Party party);
    Task<bool> DeleteAsync(int id);
}
