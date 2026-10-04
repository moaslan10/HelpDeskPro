using System.Net;
using System.Net.Mail;

namespace HelpDeskPro.Api.Services;

public record EmailSettings(bool Enabled, string Host, int Port, string Username, string Password, string From, bool EnableSsl);

public interface IEmailService
{
    Task SendAsync(string to, string subject, string body);
}

public sealed class EmailService : IEmailService
{
    private readonly IConfiguration config;
    public EmailService(IConfiguration config) => this.config = config;

    public async Task SendAsync(string to, string subject, string body)
    {
        var s = config.GetSection("Email");
        if (!bool.TryParse(s["Enabled"], out var enabled) || !enabled || string.IsNullOrWhiteSpace(to)) return;
        using var message = new MailMessage(s["From"] ?? s["Username"] ?? "no-reply@helpdeskpro.local", to, subject, body);
        using var smtp = new SmtpClient(s["Host"] ?? "localhost", int.TryParse(s["Port"], out var port) ? port : 25)
        {
            EnableSsl = bool.TryParse(s["EnableSsl"], out var ssl) && ssl,
            Credentials = string.IsNullOrWhiteSpace(s["Username"]) ? CredentialCache.DefaultNetworkCredentials : new NetworkCredential(s["Username"], s["Password"] ?? "")
        };
        await smtp.SendMailAsync(message);
    }
}
