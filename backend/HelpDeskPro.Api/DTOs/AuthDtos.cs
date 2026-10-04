namespace HelpDeskPro.Api.DTOs; public record LoginDto(string Email,string Password); public record ChangePasswordDto(string CurrentPassword,string NewPassword);
