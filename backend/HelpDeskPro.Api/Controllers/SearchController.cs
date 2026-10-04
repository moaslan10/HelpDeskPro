using HelpDeskPro.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpDeskPro.Api.Controllers;

[ApiController]
[Route("api/search")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly AppDbContext db;
    public SearchController(AppDbContext db) => this.db = db;

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? q)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 1)
            return Ok(new { tickets = Array.Empty<object>(), users = Array.Empty<object>(), departments = Array.Empty<object>(), knowledge = Array.Empty<object>(), audit = Array.Empty<object>() });

        q = q.Trim();

        var tickets = await db.Tickets
            .Include(x => x.Department)
            .Where(x => x.Title.Contains(q) || x.Description.Contains(q) || x.Tags.Contains(q) || x.Id.ToString().Contains(q))
            .OrderByDescending(x => x.CreatedAt)
            .Take(8)
            .Select(x => new { x.Id, x.Title, Status = x.Status.ToString(), Priority = x.Priority.ToString(), Department = x.Department == null ? null : x.Department.Name })
            .ToListAsync();

        var users = await db.Users
            .Include(x => x.Department)
            .Where(x => x.FullName.Contains(q) || x.Email.Contains(q) || x.Role.ToString().Contains(q))
            .OrderBy(x => x.FullName)
            .Take(8)
            .Select(x => new { x.Id, x.FullName, x.Email, Role = x.Role.ToString(), Department = x.Department == null ? null : x.Department.Name })
            .ToListAsync();

        var departments = await db.Departments
            .Where(x => x.Name.Contains(q) || x.Id.ToString().Contains(q))
            .OrderBy(x => x.Name)
            .Take(8)
            .Select(x => new { x.Id, x.Name })
            .ToListAsync();

        var knowledge = await db.KnowledgeArticles
            .Where(x => x.Title.Contains(q) || x.Category.Contains(q) || x.Content.Contains(q))
            .OrderByDescending(x => x.UpdatedAt)
            .Take(8)
            .Select(x => new { x.Id, x.Title, x.Category })
            .ToListAsync();

        var auditRows = await db.ActivityLogs
            .Where(x => x.Action.Contains(q) || x.Entity.Contains(q) || (x.EntityId.HasValue && x.EntityId.Value.ToString().Contains(q)))
            .OrderByDescending(x => x.CreatedAt)
            .Take(8)
            .ToListAsync();

        var userIds = auditRows.Where(x => x.UserId.HasValue).Select(x => x.UserId!.Value).Distinct().ToList();
        var auditUsers = await db.Users.Where(x => userIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.FullName);
        var audit = auditRows.Select(x => new
        {
            x.Id,
            x.Action,
            x.Entity,
            x.EntityId,
            User = x.UserId.HasValue && auditUsers.ContainsKey(x.UserId.Value) ? auditUsers[x.UserId.Value] : null,
            x.CreatedAt
        }).ToList();

        return Ok(new { tickets, users, departments, knowledge, audit });
    }
}
