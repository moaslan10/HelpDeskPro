using System.Security.Claims;
using HelpDeskPro.Api.Data;
using HelpDeskPro.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore; using Microsoft.AspNetCore.SignalR; using HelpDeskPro.Api.Services;

namespace HelpDeskPro.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext db; private readonly IHubContext<NotificationHub> hub;
    public NotificationsController(AppDbContext db,IHubContext<NotificationHub> hub) { this.db = db; this.hub = hub; }
    private int U => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task EnsureSlaNotifications()
    {
        var now = DateTime.UtcNow;
        var warningLimit = now.AddHours(1);
        var tickets = await db.Tickets
            .Include(t => t.AssignedTo)
            .Where(t => t.Status != TicketStatus.Resolved && t.Status != TicketStatus.Closed)
            .Where(t => t.CreatedById == U || t.AssignedToId == U)
            .Where(t => t.SlaDueAt <= warningLimit)
            .ToListAsync();

        foreach (var t in tickets)
        {
            var overdue = t.SlaDueAt < now;
            var type = overdue ? $"sla-overdue:{t.Id}" : $"sla-warning:{t.Id}";
            var exists = await db.Notifications.AnyAsync(n => n.UserId == U && n.Type == type);
            if (exists) continue;

            db.Notifications.Add(new Notification
            {
                UserId = U,
                Title = overdue ? "SLA overdue" : "SLA deadline approaching",
                Message = overdue
                    ? $"Ticket #{t.Id}: {t.Title} is overdue."
                    : $"Ticket #{t.Id}: {t.Title} is due within 1 hour.",
                Type = type,
                IsRead = false,
                CreatedAt = now
            });
        }
        await db.SaveChangesAsync();
        var fresh = await db.Notifications.Where(n => n.UserId == U && !n.IsRead).OrderByDescending(n => n.CreatedAt).Take(10).ToListAsync();
        foreach (var n in fresh) await hub.Clients.User(U.ToString()).SendAsync("notification", new { n.Id,n.Title,n.Message,n.Type,n.IsRead,n.CreatedAt });
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        await EnsureSlaNotifications();
        return Ok(await db.Notifications
            .Where(x => x.UserId == U)
            .OrderByDescending(x => x.CreatedAt)
            .Take(50)
            .ToListAsync());
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> Count()
    {
        await EnsureSlaNotifications();
        return Ok(new { count = await db.Notifications.CountAsync(x => x.UserId == U && !x.IsRead) });
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> Read(int id)
    {
        var n = await db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == U);
        if (n == null) return NotFound();
        n.IsRead = true;
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> ReadAll()
    {
        var n = await db.Notifications.Where(x => x.UserId == U && !x.IsRead).ToListAsync();
        n.ForEach(x => x.IsRead = true);
        await db.SaveChangesAsync();
        return Ok();
    }
}
