using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;
using PlusgrowWms.Api.DTOs;
using PlusgrowWms.Api.Models;
using PlusgrowWms.Api.Repositories;

namespace PlusgrowWms.Api.Services;

public class PartyService : IPartyService
{
    private readonly IPartyRepository _repository;
    private readonly IUserRepository _userRepository;
    private readonly PlusgrowDbContext _context;

    public PartyService(IPartyRepository repository, IUserRepository userRepository, PlusgrowDbContext context)
    {
        _repository = repository;
        _userRepository = userRepository;
        _context = context;
    }

    public Task<PagedListResult<Party>> GetPagedAsync(ListQueryDto queryDto) => _repository.GetPagedAsync(queryDto);

    public Task<Party?> GetByIdAsync(int id) => _repository.GetByIdAsync(id);

    public async Task<(Party? Party, string? Error)> CreateAsync(Party party)
    {
        // 1. Validate email uniqueness in Parties
        var emailLower = party.Email.Trim().ToLowerInvariant();
        var existingParty = await _repository.GetByEmailAsync(emailLower);
        if (existingParty != null)
        {
            return (null, "A party with this email already exists");
        }

        // 2. Validate username (email) uniqueness in Users
        var existingUser = await _userRepository.GetByUsernameAsync(emailLower);
        if (existingUser != null)
        {
            return (null, "A user with this email as username already exists");
        }

        // 3. Find or create the "Party" role
        var partyRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name.ToLower() == "party");
        if (partyRole == null)
        {
            partyRole = new Role
            {
                Name = "Party",
                Description = "Party access role",
                IsActive = true,
                CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified)
            };
            await _context.Roles.AddAsync(partyRole);
            await _context.SaveChangesAsync();
        }

        // 4. Create the User with simple string password "1234"
        var user = new User
        {
            Username = emailLower,
            PasswordHash = "1234", // Plaintext string password as requested
            FullName = party.Name,
            Email = emailLower,
            Phone = party.Phone,
            RoleId = partyRole.Id,
            IsActive = true,
            CreatedAt = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified)
        };

        // Add both user and party in a transaction/unit of work
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            await _userRepository.CreateAsync(user);
            await _repository.AddAsync(party);
            await _repository.SaveChangesAsync();
            await transaction.CommitAsync();
            return (party, null);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return (null, $"Error creating party: {ex.Message}");
        }
    }

    public async Task<(Party? Party, string? Error)> UpdateAsync(int id, Party party)
    {
        if (id != party.Id)
            return (null, "ID mismatch");

        var existingParty = await _repository.GetByIdAsync(id);
        if (existingParty == null)
            return (null, "Party not found");

        var oldEmail = existingParty.Email.Trim().ToLowerInvariant();
        var newEmail = party.Email.Trim().ToLowerInvariant();

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            if (oldEmail != newEmail)
            {
                // Verify new email isn't already taken
                if (await _repository.GetByEmailAsync(newEmail) != null || await _userRepository.GetByUsernameAsync(newEmail) != null)
                {
                    return (null, "New email is already in use by another party or user");
                }

                // Update linked User's username and email
                var linkedUser = await _userRepository.GetByUsernameAsync(oldEmail);
                if (linkedUser != null)
                {
                    linkedUser.Username = newEmail;
                    linkedUser.Email = newEmail;
                    linkedUser.FullName = party.Name;
                    linkedUser.Phone = party.Phone;
                    await _userRepository.UpdateAsync(linkedUser);
                }
            }
            else
            {
                // Update linked User's name/phone
                var linkedUser = await _userRepository.GetByUsernameAsync(oldEmail);
                if (linkedUser != null)
                {
                    linkedUser.FullName = party.Name;
                    linkedUser.Phone = party.Phone;
                    await _userRepository.UpdateAsync(linkedUser);
                }
            }

            // Update Party values
            existingParty.Name = party.Name;
            existingParty.Address = party.Address;
            existingParty.Country = party.Country;
            existingParty.Phone = party.Phone;
            existingParty.Email = newEmail;
            existingParty.ExportEnabled = party.ExportEnabled;
            existingParty.ExportFolderPath = string.IsNullOrWhiteSpace(party.ExportFolderPath) ? null : party.ExportFolderPath.Trim();
            existingParty.ExportFileName = string.IsNullOrWhiteSpace(party.ExportFileName) ? null : party.ExportFileName.Trim();

            _repository.Update(existingParty);
            await _repository.SaveChangesAsync();

            await transaction.CommitAsync();
            return (existingParty, null);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return (null, $"Error updating party: {ex.Message}");
        }
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var party = await _repository.GetByIdAsync(id);
        if (party == null)
            return false;

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Delete linked user if they exist
            var linkedUser = await _userRepository.GetByUsernameAsync(party.Email.ToLowerInvariant());
            if (linkedUser != null)
            {
                await _userRepository.DeleteAsync(linkedUser.Id);
            }

            _repository.Remove(party);
            await _repository.SaveChangesAsync();

            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            return false;
        }
    }
}
