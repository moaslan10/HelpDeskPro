using System.Security.Claims; using HelpDeskPro.Api.Data; using HelpDeskPro.Api.Models; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using Microsoft.EntityFrameworkCore; using Microsoft.AspNetCore.SignalR; using HelpDeskPro.Api.Services;
namespace HelpDeskPro.Api.Controllers;
[ApiController][Route("api/tickets")][Authorize]
public class TicketsController:ControllerBase { readonly AppDbContext db; readonly IHubContext<NotificationHub> hub; readonly IEmailService email; public TicketsController(AppDbContext db,IHubContext<NotificationHub> hub,IEmailService email){this.db=db;this.hub=hub;this.email=email;} int U=>int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
static DateTime Sla(Priority p)=>TicketRules.CalculateSla(p);
async Task Log(string action,string entity,int? id=null,int? userId=null){db.ActivityLogs.Add(new ActivityLog{Action=action,Entity=entity,EntityId=id,UserId=userId??U});await db.SaveChangesAsync();}
async Task Notify(int userId,string title,string message,string type="info")
{
    var n=new Notification{UserId=userId,Title=title,Message=message,Type=type};
    db.Notifications.Add(n);
    await db.SaveChangesAsync();
    await hub.Clients.User(userId.ToString()).SendAsync("notification", new { n.Id,n.Title,n.Message,n.Type,n.IsRead,n.CreatedAt });
    var recipient=await db.Users.Where(x=>x.Id==userId).Select(x=>x.Email).FirstOrDefaultAsync();
    if(!string.IsNullOrWhiteSpace(recipient)) _ = email.SendAsync(recipient,title,message);
}
[HttpGet] public async Task<IActionResult> Get([FromQuery]string? q,[FromQuery]TicketStatus? status,[FromQuery]Priority? priority,[FromQuery]bool overdue=false){var z=db.Tickets.Include(x=>x.CreatedBy).Include(x=>x.AssignedTo).Include(x=>x.Department).AsQueryable();if(!string.IsNullOrWhiteSpace(q))z=z.Where(x=>x.Title.Contains(q)||x.Description.Contains(q)||x.Tags.Contains(q));if(status.HasValue)z=z.Where(x=>x.Status==status);if(priority.HasValue)z=z.Where(x=>x.Priority==priority);if(overdue)z=z.Where(x=>x.SlaDueAt<DateTime.UtcNow&&x.Status!=TicketStatus.Resolved&&x.Status!=TicketStatus.Closed);return Ok(await z.OrderByDescending(x=>x.CreatedAt).Select(x=>new{x.Id,x.Title,x.Description,Status=x.Status.ToString(),Priority=x.Priority.ToString(),x.CreatedAt,x.UpdatedAt,x.SlaDueAt,x.Tags,x.Rating,Overdue=x.SlaDueAt<DateTime.UtcNow&&x.Status!=TicketStatus.Resolved&&x.Status!=TicketStatus.Closed,CreatedBy=x.CreatedBy.FullName,AssignedTo=x.AssignedTo==null?null:x.AssignedTo.FullName,Department=x.Department==null?null:x.Department.Name}).ToListAsync());}

[HttpGet("paged")]
public async Task<IActionResult> Paged([FromQuery]string? q,[FromQuery]TicketStatus? status,[FromQuery]Priority? priority,[FromQuery]bool overdue=false,[FromQuery]int page=1,[FromQuery]int pageSize=20)
{
    page=Math.Max(1,page); pageSize=Math.Clamp(pageSize,5,100);
    var z=db.Tickets.Include(x=>x.CreatedBy).Include(x=>x.AssignedTo).Include(x=>x.Department).AsQueryable();
    if(!string.IsNullOrWhiteSpace(q)) z=z.Where(x=>x.Title.Contains(q)||x.Description.Contains(q)||x.Tags.Contains(q));
    if(status.HasValue) z=z.Where(x=>x.Status==status); if(priority.HasValue) z=z.Where(x=>x.Priority==priority);
    if(overdue) z=z.Where(x=>x.SlaDueAt<DateTime.UtcNow&&x.Status!=TicketStatus.Resolved&&x.Status!=TicketStatus.Closed);
    var total=await z.CountAsync();
    var items=await z.OrderByDescending(x=>x.CreatedAt).Skip((page-1)*pageSize).Take(pageSize).Select(x=>new{x.Id,x.Title,x.Description,Status=x.Status.ToString(),Priority=x.Priority.ToString(),x.CreatedAt,x.UpdatedAt,x.SlaDueAt,x.Tags,x.Rating,Overdue=x.SlaDueAt<DateTime.UtcNow&&x.Status!=TicketStatus.Resolved&&x.Status!=TicketStatus.Closed,CreatedBy=x.CreatedBy.FullName,AssignedTo=x.AssignedTo==null?null:x.AssignedTo.FullName,Department=x.Department==null?null:x.Department.Name}).ToListAsync();
    return Ok(new {items,total,page,pageSize,totalPages=(int)Math.Ceiling(total/(double)pageSize)});
}
[HttpGet("{id}")] public async Task<IActionResult> One(int id){var x=await db.Tickets.Include(x=>x.CreatedBy).Include(x=>x.AssignedTo).Include(x=>x.Department).Include(x=>x.Comments).ThenInclude(c=>c.User).Include(x=>x.Attachments).FirstOrDefaultAsync(x=>x.Id==id);if(x==null)return NotFound();return Ok(new{x.Id,x.Title,x.Description,Status=x.Status.ToString(),Priority=x.Priority.ToString(),x.CreatedAt,x.UpdatedAt,x.SlaDueAt,x.Tags,x.Rating,x.RatingComment,Overdue=x.SlaDueAt<DateTime.UtcNow&&x.Status!=TicketStatus.Resolved&&x.Status!=TicketStatus.Closed,CreatedBy=x.CreatedBy.FullName,AssignedTo=x.AssignedTo?.FullName,Department=x.Department?.Name,Comments=x.Comments.OrderBy(c=>c.CreatedAt).Select(c=>new{c.Id,c.Body,c.CreatedAt,User=c.User.FullName}),Attachments=x.Attachments.OrderByDescending(a=>a.CreatedAt).Select(a=>new{a.Id,a.FileName,a.ContentType,a.Size,a.CreatedAt})});}
[HttpPost]
public async Task<IActionResult> Add([FromBody] CreateTicketDto dto)
{
    if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Description))
        return BadRequest("Title and description are required.");

    if (!Enum.TryParse<Priority>(dto.Priority, true, out var priority))
        priority = Priority.Medium;

    var uid = U;
    var input = new Ticket
    {
        Title = dto.Title.Trim(),
        Description = dto.Description.Trim(),
        Priority = priority,
        Tags = dto.Tags?.Trim() ?? "",
        DepartmentId = dto.DepartmentId,
        AssignedToId = dto.AssignedToId,
        CreatedById = uid,
        CreatedAt = DateTime.UtcNow,
        Status = TicketStatus.Open
    };
    input.SlaDueAt = Sla(input.Priority);

    if (input.DepartmentId.HasValue && !await db.Departments.AnyAsync(d => d.Id == input.DepartmentId.Value))
        return BadRequest("Selected department does not exist.");

    if (input.AssignedToId.HasValue && !await db.Users.AnyAsync(u => u.Id == input.AssignedToId.Value && u.Role != Role.Employee && u.IsActive))
        return BadRequest("Selected user is not an active support agent.");

    db.Tickets.Add(input);
    await db.SaveChangesAsync();

    if (input.AssignedToId.HasValue)
        await Notify(input.AssignedToId.Value, "New ticket assigned", $"Ticket #{input.Id}: {input.Title}", $"ticket:{input.Id}");

    await Notify(uid, "Ticket created", $"Ticket #{input.Id} was created successfully.", $"ticket:{input.Id}");
    await Log("Created ticket", "Ticket", input.Id);
    await db.SaveChangesAsync();

    return Ok(new
    {
        input.Id,
        input.Title,
        input.Description,
        Status = input.Status.ToString(),
        Priority = input.Priority.ToString(),
        input.Tags,
        input.DepartmentId,
        input.AssignedToId,
        input.CreatedAt,
        input.SlaDueAt
    });
}
[HttpPost("{id}/status")]
public async Task<IActionResult> ChangeStatus(int id, [FromBody] StatusUpdateDto dto)
{
    var t = await db.Tickets.FirstOrDefaultAsync(x => x.Id == id);
    if (t == null) return NotFound();
    if (!Enum.TryParse<TicketStatus>(dto.Status, true, out var next))
        return BadRequest("Invalid ticket status.");

    var isStaff = User.IsInRole("Admin") || User.IsInRole("Support");
    if (!isStaff && t.CreatedById != U)
        return Forbid();

    if (!isStaff && !(t.Status == TicketStatus.Resolved && (next == TicketStatus.Closed || next == TicketStatus.InProgress)))
        return Forbid();

    var allowed = TicketRules.IsValidTransition(t.Status, next);
    if (!allowed && t.Status != next)
        return BadRequest($"Cannot move ticket from {t.Status} to {next}.");

    var old = t.Status;
    t.Status = next;
    t.UpdatedAt = DateTime.UtcNow;
    if (next == TicketStatus.Resolved || next == TicketStatus.Closed)
        t.ResolvedAt ??= DateTime.UtcNow;
    if (next == TicketStatus.InProgress && old == TicketStatus.Resolved)
        t.ResolvedAt = null;

    await db.SaveChangesAsync();
    await Notify(t.CreatedById, "Ticket status updated", $"Ticket #{t.Id} is now {next}.", $"ticket:{t.Id}");
    if (t.AssignedToId.HasValue && t.AssignedToId.Value != U)
        await Notify(t.AssignedToId.Value, "Ticket status updated", $"Ticket #{t.Id} is now {next}.", $"ticket:{t.Id}");
    await Log($"Changed ticket status: {old} -> {next}", "Ticket", t.Id);
    return Ok(new { t.Id, Status = t.Status.ToString(), t.UpdatedAt, t.ResolvedAt });
}

[Authorize(Roles="Admin,Support")][HttpPost("{id}/assign")]
public async Task<IActionResult> Assign(int id, [FromBody] AssignTicketDto dto)
{
    var t = await db.Tickets.FirstOrDefaultAsync(x => x.Id == id);
    if (t == null) return NotFound();
    if (dto.AssignedToId.HasValue && !await db.Users.AnyAsync(x => x.Id == dto.AssignedToId.Value && x.Role != Role.Employee && x.IsActive))
        return BadRequest("Selected user is not an active support agent.");

    var old = t.AssignedToId;
    t.AssignedToId = dto.AssignedToId;
    t.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    if (t.AssignedToId.HasValue)
        await Notify(t.AssignedToId.Value, "Ticket assigned to you", $"Ticket #{t.Id}: {t.Title}", $"ticket:{t.Id}");
    await Log(old == null ? "Assigned ticket" : "Reassigned ticket", "Ticket", t.Id);
    return Ok(new { t.Id, t.AssignedToId });
}

[Authorize(Roles="Admin,Support")][HttpPut("{id}")] public async Task<IActionResult> Update(int id,Ticket input){var x=await db.Tickets.FindAsync(id);if(x==null)return NotFound();if(string.IsNullOrWhiteSpace(input.Title)||string.IsNullOrWhiteSpace(input.Description))return BadRequest("Title and description are required.");if(!Enum.IsDefined(input.Priority))return BadRequest("Invalid priority.");if(!Enum.IsDefined(input.Status))return BadRequest("Invalid ticket status.");if(input.DepartmentId.HasValue&&!await db.Departments.AnyAsync(d=>d.Id==input.DepartmentId.Value))return BadRequest("Selected department does not exist.");if(input.AssignedToId.HasValue&&!await db.Users.AnyAsync(u=>u.Id==input.AssignedToId.Value&&u.Role!=Role.Employee&&u.IsActive))return BadRequest("Selected user is not an active support agent.");var oldAssignee=x.AssignedToId;var oldStatus=x.Status;if(input.Status!=oldStatus&&!TicketRules.IsValidTransition(oldStatus,input.Status))return BadRequest($"Cannot move ticket from {oldStatus} to {input.Status}.");x.Title=input.Title.Trim();x.Description=input.Description.Trim();x.Priority=input.Priority;x.Status=input.Status;x.DepartmentId=input.DepartmentId;x.AssignedToId=input.AssignedToId;x.Tags=input.Tags?.Trim()??"";x.UpdatedAt=DateTime.UtcNow;x.SlaDueAt=Sla(x.Priority);if(x.Status is TicketStatus.Resolved or TicketStatus.Closed)x.ResolvedAt ??=DateTime.UtcNow;if(x.Status==TicketStatus.InProgress&&oldStatus==TicketStatus.Resolved)x.ResolvedAt=null;await db.SaveChangesAsync();if(x.AssignedToId.HasValue&&x.AssignedToId!=oldAssignee)await Notify(x.AssignedToId.Value,"Ticket assigned to you",$"Ticket #{x.Id}: {x.Title}",$"ticket:{x.Id}");if(x.Status!=oldStatus)await Notify(x.CreatedById,"Ticket status updated",$"Ticket #{x.Id} is now {x.Status}.",$"ticket:{x.Id}");await Log($"Updated ticket: {oldStatus} -> {x.Status}","Ticket",x.Id);return Ok(x);}
[HttpPost("{id}/comments")] public async Task<IActionResult> Comment(int id,[FromBody]string body){var t=await db.Tickets.FindAsync(id);if(t==null)return NotFound();db.TicketComments.Add(new TicketComment{TicketId=id,Body=body,UserId=U});t.UpdatedAt=DateTime.UtcNow;await Notify(t.CreatedById,"New ticket comment",$"A new comment was added to ticket #{id}.",$"ticket:{id}");if(t.AssignedToId.HasValue&&t.AssignedToId!=U)await Notify(t.AssignedToId.Value,"New ticket comment",$"A new comment was added to ticket #{id}.",$"ticket:{id}");await db.SaveChangesAsync();await Log("Added ticket comment","Ticket",id);return Ok();}
[HttpPost("{id}/rate")] public async Task<IActionResult> Rate(int id,[FromBody]RatingDto dto){if(dto.Rating<1||dto.Rating>5)return BadRequest("Rating must be 1-5");var t=await db.Tickets.FindAsync(id);if(t==null)return NotFound();if(t.CreatedById!=U&&!User.IsInRole("Admin"))return Forbid();t.Rating=dto.Rating;t.RatingComment=dto.Comment;await db.SaveChangesAsync();await Log($"Rated ticket {dto.Rating}/5","Ticket",id);return Ok();}
[Authorize(Roles="Admin,Support")][HttpDelete("{id}")] public async Task<IActionResult> Delete(int id){var x=await db.Tickets.FindAsync(id);if(x==null)return NotFound();db.Tickets.Remove(x);await db.SaveChangesAsync();await Log("Deleted ticket","Ticket",id);return NoContent();}}
public record RatingDto(int Rating,string? Comment);
public record StatusUpdateDto(string Status);
public record AssignTicketDto(int? AssignedToId);

public record CreateTicketDto(string Title, string Description, string? Priority, string? Tags, int? DepartmentId, int? AssignedToId);
