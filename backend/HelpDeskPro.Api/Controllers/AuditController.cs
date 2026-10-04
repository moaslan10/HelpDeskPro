using HelpDeskPro.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpDeskPro.Api.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize(Roles = "Admin,Support")]
public class AuditController : ControllerBase
{
    private readonly AppDbContext db;

    public AuditController(AppDbContext db) => this.db = db;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? q,
        [FromQuery] string? action,
        [FromQuery] string? entity,
        [FromQuery] int? userId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var logsQuery =
            from l in db.ActivityLogs
            join u in db.Users on l.UserId equals u.Id into users
            from u in users.DefaultIfEmpty()
            select new
            {
                l.Id,
                l.Action,
                l.Entity,
                l.EntityId,
                l.UserId,
                UserName = u == null ? "System" : u.FullName,
                UserEmail = u == null ? null : u.Email,
                l.CreatedAt
            };

        if (!string.IsNullOrWhiteSpace(action))
            logsQuery = logsQuery.Where(x => x.Action.Contains(action));

        if (!string.IsNullOrWhiteSpace(entity))
            logsQuery = logsQuery.Where(x => x.Entity == entity);

        if (userId.HasValue)
            logsQuery = logsQuery.Where(x => x.UserId == userId.Value);

        if (from.HasValue)
            logsQuery = logsQuery.Where(x => x.CreatedAt >= from.Value.ToUniversalTime());

        if (to.HasValue)
        {
            var end = to.Value.Date.AddDays(1).ToUniversalTime();
            logsQuery = logsQuery.Where(x => x.CreatedAt < end);
        }

        // Execute the database query first, then perform the global text search
        // in memory so EntityId (nullable int) can safely be searched as text.
        var logs = await logsQuery
            .OrderByDescending(x => x.CreatedAt)
            .Take(1000)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            logs = logs.Where(x =>
                x.Action.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                x.Entity.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                (x.EntityId.HasValue && x.EntityId.Value.ToString().Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                x.UserName.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrEmpty(x.UserEmail) && x.UserEmail.Contains(term, StringComparison.OrdinalIgnoreCase))
            ).ToList();
        }

        return Ok(logs.Take(500));
    }


    [HttpGet("paged")]
    public async Task<IActionResult> Paged([FromQuery]string? q,[FromQuery]string? action,[FromQuery]string? entity,[FromQuery]int? userId,[FromQuery]DateTime? from,[FromQuery]DateTime? to,[FromQuery]int page=1,[FromQuery]int pageSize=25)
    {
        page=Math.Max(1,page); pageSize=Math.Clamp(pageSize,10,100);
        var baseQ=from l in db.ActivityLogs join u in db.Users on l.UserId equals u.Id into users from u in users.DefaultIfEmpty() select new {l.Id,l.Action,l.Entity,l.EntityId,l.UserId,UserName=u==null?"System":u.FullName,UserEmail=u==null?null:u.Email,l.CreatedAt};
        if(!string.IsNullOrWhiteSpace(action)) baseQ=baseQ.Where(x=>x.Action.Contains(action));
        if(!string.IsNullOrWhiteSpace(entity)) baseQ=baseQ.Where(x=>x.Entity==entity); if(userId.HasValue) baseQ=baseQ.Where(x=>x.UserId==userId);
        if(from.HasValue) baseQ=baseQ.Where(x=>x.CreatedAt>=from.Value.ToUniversalTime()); if(to.HasValue) baseQ=baseQ.Where(x=>x.CreatedAt<to.Value.Date.AddDays(1).ToUniversalTime());
        var all=await baseQ.OrderByDescending(x=>x.CreatedAt).Take(5000).ToListAsync();
        if(!string.IsNullOrWhiteSpace(q)){var term=q.Trim();all=all.Where(x=>x.Action.Contains(term,StringComparison.OrdinalIgnoreCase)||x.Entity.Contains(term,StringComparison.OrdinalIgnoreCase)||(x.EntityId.HasValue&&x.EntityId.Value.ToString().Contains(term,StringComparison.OrdinalIgnoreCase))||x.UserName.Contains(term,StringComparison.OrdinalIgnoreCase)||(x.UserEmail!=null&&x.UserEmail.Contains(term,StringComparison.OrdinalIgnoreCase))).ToList();}
        var total=all.Count; var items=all.Skip((page-1)*pageSize).Take(pageSize).ToList(); return Ok(new{items,total,page,pageSize,totalPages=(int)Math.Ceiling(total/(double)pageSize)});
    }

    [HttpGet("users")]
    public async Task<IActionResult> Users() => Ok(
        await db.Users
            .Where(x => x.IsActive)
            .OrderBy(x => x.FullName)
            .Select(x => new { x.Id, x.FullName, x.Email })
            .ToListAsync());
}
