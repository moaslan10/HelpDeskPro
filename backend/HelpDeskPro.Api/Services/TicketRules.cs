using HelpDeskPro.Api.Models;
namespace HelpDeskPro.Api.Services;

public static class TicketRules
{
    public static int SlaHours(Priority priority) => priority switch
    {
        Priority.Critical => 4,
        Priority.High => 8,
        Priority.Medium => 24,
        _ => 48
    };

    public static DateTime CalculateSla(Priority priority, DateTime? from = null) => (from ?? DateTime.UtcNow).AddHours(SlaHours(priority));

    public static bool IsValidTransition(TicketStatus current, TicketStatus next) => (current, next) switch
    {
        (TicketStatus.Open, TicketStatus.InProgress) => true,
        (TicketStatus.InProgress, TicketStatus.Pending) => true,
        (TicketStatus.InProgress, TicketStatus.Resolved) => true,
        (TicketStatus.Pending, TicketStatus.InProgress) => true,
        (TicketStatus.Resolved, TicketStatus.Closed) => true,
        (TicketStatus.Resolved, TicketStatus.InProgress) => true,
        (TicketStatus.Closed, TicketStatus.InProgress) => true,
        _ => current == next
    };
}
