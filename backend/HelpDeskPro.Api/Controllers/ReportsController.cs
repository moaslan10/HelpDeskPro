using HelpDeskPro.Api.Data;
using HelpDeskPro.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HelpDeskPro.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext db;
    public ReportsController(AppDbContext db) => this.db = db;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var q = db.Tickets.Include(x => x.Department).Include(x => x.AssignedTo).AsQueryable();
        if (from.HasValue) q = q.Where(x => x.CreatedAt >= from.Value.ToUniversalTime());
        if (to.HasValue) q = q.Where(x => x.CreatedAt < to.Value.ToUniversalTime().AddDays(1));

        var tickets = await q.ToListAsync();
        var now = DateTime.UtcNow;
        bool active(Ticket x) => x.Status != TicketStatus.Resolved && x.Status != TicketStatus.Closed;
        bool overdue(Ticket x) => x.SlaDueAt < now && active(x);

        var byStatus = Enum.GetValues<TicketStatus>().Select(s => new { label = s.ToString(), value = tickets.Count(x => x.Status == s) }).ToList();
        var byPriority = Enum.GetValues<Priority>().Select(p => new { label = p.ToString(), value = tickets.Count(x => x.Priority == p) }).ToList();
        var byDepartment = tickets.GroupBy(x => x.Department?.Name ?? "Unassigned").Select(g => new { label = g.Key, value = g.Count() }).OrderByDescending(x => x.value).ToList();

        var byDay = tickets.GroupBy(x => x.CreatedAt.ToLocalTime().Date).OrderBy(g => g.Key)
            .Select(g => new { label = g.Key.ToString("dd MMM"), value = g.Count() }).ToList();

        var support = tickets.Where(x => x.AssignedTo != null).GroupBy(x => x.AssignedTo!.FullName)
            .Select(g => new {
                name = g.Key,
                total = g.Count(),
                resolved = g.Count(x => x.Status == TicketStatus.Resolved || x.Status == TicketStatus.Closed),
                overdue = g.Count(overdue),
                avgResolutionHours = g.Where(x => x.ResolvedAt.HasValue).Select(x => (x.ResolvedAt!.Value - x.CreatedAt).TotalHours).DefaultIfEmpty(0).Average()
            }).OrderByDescending(x => x.total).ToList();

        var resolved = tickets.Where(x => x.ResolvedAt.HasValue).ToList();
        var avgResolutionHours = resolved.Count == 0 ? 0 : resolved.Average(x => (x.ResolvedAt!.Value - x.CreatedAt).TotalHours);
        var slaClosed = tickets.Where(x => x.Status == TicketStatus.Resolved || x.Status == TicketStatus.Closed).ToList();
        var slaMet = slaClosed.Count(x => x.ResolvedAt.HasValue && x.ResolvedAt.Value <= x.SlaDueAt);
        var slaRate = slaClosed.Count == 0 ? 0 : Math.Round((double)slaMet / slaClosed.Count * 100, 1);

        return Ok(new {
            summary = new {
                total = tickets.Count,
                open = tickets.Count(x => x.Status == TicketStatus.Open),
                inProgress = tickets.Count(x => x.Status == TicketStatus.InProgress),
                pending = tickets.Count(x => x.Status == TicketStatus.Pending),
                resolved = tickets.Count(x => x.Status == TicketStatus.Resolved),
                closed = tickets.Count(x => x.Status == TicketStatus.Closed),
                overdue = tickets.Count(overdue),
                critical = tickets.Count(x => x.Priority == Priority.Critical),
                avgResolutionHours = Math.Round(avgResolutionHours, 1),
                slaRate
            },
            sla = new { met = slaMet, overdue = tickets.Count(overdue), totalClosed = slaClosed.Count, rate = slaRate },
            byStatus, byPriority, byDepartment, byDay, support
        });
    }
}
