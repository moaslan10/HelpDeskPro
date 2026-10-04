using System.Security.Claims;
using HelpDeskPro.Api.Data;
using HelpDeskPro.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpDeskPro.Api.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly AppDbContext db;
    private readonly PasswordHasher<User> hasher = new();

    public ProfileController(AppDbContext db) => this.db = db;

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var user = await db.Users.Include(x => x.Department).FirstOrDefaultAsync(x => x.Id == UserId);
        if (user == null) return NotFound(new { message = "User not found." });

        var lastLogin = await db.ActivityLogs
            .Where(x => x.UserId == user.Id && x.Action == "Logged in")
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => (DateTime?)x.CreatedAt)
            .FirstOrDefaultAsync();

        return Ok(new
        {
            user.Id,
            user.FullName,
            user.Email,
            Role = user.Role.ToString(),
            Department = user.Department?.Name,
            user.IsActive,
            user.CreatedAt,
            LastLoginAt = lastLogin
        });
    }

    public class UpdateProfileRequest
    {
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
    }

    [HttpPut]
    public async Task<IActionResult> Update(UpdateProfileRequest input)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Id == UserId);
        if (user == null) return NotFound(new { message = "User not found." });
        if (string.IsNullOrWhiteSpace(input.FullName) || string.IsNullOrWhiteSpace(input.Email))
            return BadRequest(new { message = "Full name and email are required." });

        var email = input.Email.Trim();
        if (await db.Users.AnyAsync(x => x.Id != user.Id && x.Email == email))
            return Conflict(new { message = "This email is already in use." });

        user.FullName = input.FullName.Trim();
        user.Email = email;
        db.ActivityLogs.Add(new ActivityLog { Action = "Updated profile", Entity = "User", EntityId = user.Id, UserId = user.Id });
        await db.SaveChangesAsync();

        return Ok(new { user.Id, user.FullName, user.Email, Role = user.Role.ToString(), Department = (await db.Departments.FindAsync(user.DepartmentId))?.Name, user.IsActive, user.CreatedAt });
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = "";
        public string NewPassword { get; set; } = "";
        public string ConfirmPassword { get; set; } = "";
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest input)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Id == UserId);
        if (user == null) return NotFound(new { message = "User not found." });
        if (hasher.VerifyHashedPassword(user, user.PasswordHash, input.CurrentPassword) == PasswordVerificationResult.Failed)
            return BadRequest(new { message = "Current password is incorrect." });
        if (string.IsNullOrWhiteSpace(input.NewPassword) || input.NewPassword.Length < 6)
            return BadRequest(new { message = "New password must be at least 6 characters." });
        if (input.NewPassword != input.ConfirmPassword)
            return BadRequest(new { message = "New passwords do not match." });

        user.PasswordHash = hasher.HashPassword(user, input.NewPassword);
        db.ActivityLogs.Add(new ActivityLog { Action = "Changed password", Entity = "User", EntityId = user.Id, UserId = user.Id });
        await db.SaveChangesAsync();
        return Ok(new { message = "Password changed successfully." });
    }

    [HttpGet("activity")]
    public async Task<IActionResult> Activity()
    {
        var items = await db.ActivityLogs
            .Where(x => x.UserId == UserId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(20)
            .ToListAsync();
        return Ok(items);
    }
}
