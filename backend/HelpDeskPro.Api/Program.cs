using System.Text;
using HelpDeskPro.Api.Data;
using HelpDeskPro.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = null);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o => o.SwaggerDoc("v1", new OpenApiInfo { Title="HelpDeskPro API", Version="v1" }));
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<AuthService>();
builder.Services.AddSingleton<IEmailService, EmailService>();
builder.Services.AddSignalR();
var jwt = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters { ValidateIssuer=true, ValidateAudience=true, ValidateLifetime=true, ValidateIssuerSigningKey=true, ValidIssuer=jwt["Issuer"], ValidAudience=jwt["Audience"], IssuerSigningKey=new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!)) };
    o.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/notifications"))
                context.Token = accessToken;
            return Task.CompletedTask;
        }
    };
});
builder.Services.AddAuthorization();
builder.Services.AddCors(o => o.AddPolicy("frontend", p => p.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin()));
var app = builder.Build();
using (var scope = app.Services.CreateScope()) { var db=scope.ServiceProvider.GetRequiredService<AppDbContext>(); db.Database.EnsureCreated(); SeedData.Initialize(db); }
app.UseCors("frontend");
app.UseAuthentication(); app.UseAuthorization();
app.UseSwagger(); app.UseSwaggerUI();
app.MapGet("/api/health", () => Results.Ok(new { status="ok", service="HelpDeskPro API" }));
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");
app.Run();
