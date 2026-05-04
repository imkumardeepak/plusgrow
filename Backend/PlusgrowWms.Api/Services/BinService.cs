using AutoMapper;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.Repositories;

namespace PlusgrowWms.Api.Services;

public class BinService : IBinService
{
    private readonly IBinRepository _repository;
    private readonly IMapper _mapper;

    public BinService(IBinRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<List<BinDto>> GetAllAsync()
    {
        var bins = await _repository.GetAllAsync();
        return _mapper.Map<List<BinDto>>(bins);
    }

    public async Task<BinDto?> GetByIdAsync(int id)
    {
        var bin = await _repository.GetByIdAsync(id);
        return bin == null ? null : _mapper.Map<BinDto>(bin);
    }

    public async Task<(BinDto? Bin, int TotalCount)> CreateAsync(CreateBinDto createBinDto)
    {
        var bin = _mapper.Map<Bin>(createBinDto);
        await _repository.AddAsync(bin);
        await _repository.SaveChangesAsync();
        var totalCount = await _repository.CountAsync();
        return (_mapper.Map<BinDto>(bin), totalCount);
    }

    public async Task<(BinDto? Bin, string? Error)> UpdateAsync(int id, UpdateBinDto updateBinDto)
    {
        if (id != updateBinDto.Id)
            return (null, "ID mismatch");

        var bin = await _repository.GetByIdAsync(id);
        if (bin == null)
            return (null, "Bin not found");

        _mapper.Map(updateBinDto, bin);
        await _repository.SaveChangesAsync();
        return (_mapper.Map<BinDto>(bin), null);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var bin = await _repository.GetByIdAsync(id);
        if (bin == null)
            return false;

        _repository.Remove(bin);
        await _repository.SaveChangesAsync();
        return true;
    }
}
