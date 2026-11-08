using System.Text.Json.Serialization;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;
using Ellp.Api.Modules.Inbox;
using Ellp.Api.Modules.Progress;
using Ellp.Api.Shared.Auth;
using Ellp.Api.Shared.Data;
using Ellp.Api.Shared.Email;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddSimpleConsole(o => { o.TimestampFormat = "yyyy-MM-dd HH:mm:ss'Z' "; o.UseUtcTimestamp = true; });

// ── options (no secrets in files: EMAIL_PASSWORD and the service-account path come from the environment) ──
var auth = builder.Configuration.GetSection("Auth").Get<AuthOptions>() ?? new AuthOptions();
var email = builder.Configuration.GetSection("Email").Get<EmailOptions>() ?? new EmailOptions();
email.Password = Environment.GetEnvironmentVariable("EMAIL_PASSWORD") ?? email.Password;
var storeMode = builder.Configuration["Store:Mode"] ?? "InMemory";

// fail closed: outside Development the Demo header must not be accepted and the in-memory store is not a real store
if (!builder.Environment.IsDevelopment())
{
    if (auth.Mode.Equals("Demo", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Auth:Mode=Demo is allowed in Development only");
    if (storeMode.Equals("InMemory", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Store:Mode=InMemory is allowed in Development only");
}

builder.Services.AddSingleton(auth);
builder.Services.AddSingleton(email);
// 1.2: signed video links (MEDIA_SIGNING_KEY; Development may use the built-in key)
var media = builder.Configuration.GetSection("Media").Get<Ellp.Api.Modules.Integrity.MediaOptions>() ?? new Ellp.Api.Modules.Integrity.MediaOptions();
media.SigningKey = Ellp.Api.Modules.Integrity.VideoTokenRules.ResolveKey(Environment.GetEnvironmentVariable("MEDIA_SIGNING_KEY") ?? media.SigningKey, builder.Environment.IsDevelopment());
builder.Services.AddSingleton(media);
// 1.3: payment gateways (OMISE_SECRET_KEY / OMISE_PUBLIC_KEY in the environment); the demo gateway moves no money
var omise = builder.Configuration.GetSection("Omise").Get<Ellp.Api.Modules.Commerce.OmiseOptions>() ?? new Ellp.Api.Modules.Commerce.OmiseOptions();
omise.SecretKey = Environment.GetEnvironmentVariable("OMISE_SECRET_KEY") ?? omise.SecretKey;
omise.PublicKey = Environment.GetEnvironmentVariable("OMISE_PUBLIC_KEY") ?? omise.PublicKey;
builder.Services.AddSingleton(omise);
builder.Services.AddSingleton<Ellp.Api.Modules.Commerce.IPaymentGateway, Ellp.Api.Modules.Commerce.DemoGateway>();
builder.Services.AddSingleton<Ellp.Api.Modules.Commerce.IPaymentGateway, Ellp.Api.Modules.Commerce.ManualGateway>();
builder.Services.AddHttpClient<Ellp.Api.Modules.Commerce.OmiseGateway>();
builder.Services.AddSingleton<Ellp.Api.Modules.Commerce.IPaymentGateway>(sp => sp.GetRequiredService<Ellp.Api.Modules.Commerce.OmiseGateway>());
builder.Services.AddSingleton<Ellp.Api.Modules.Commerce.GatewayDirectory>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<IProgressService, ProgressService>();
builder.Services.AddScoped<IInboxService, InboxService>();

// ── the store ──
if (storeMode.Equals("Firestore", StringComparison.OrdinalIgnoreCase))
{
    var credFile = builder.Configuration["Firebase:CredentialFile"] ?? Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS");
    var credential = string.IsNullOrWhiteSpace(credFile) ? GoogleCredential.GetApplicationDefault() : GoogleCredential.FromFile(credFile);
    if (FirebaseApp.DefaultInstance is null) FirebaseApp.Create(new AppOptions { Credential = credential, ProjectId = auth.FirebaseProjectId });
    builder.Services.AddSingleton(new FirestoreDbBuilder { ProjectId = auth.FirebaseProjectId, Credential = credential }.Build());
    builder.Services.AddSingleton<IEllpStore, FirestoreStore>();
}
else
{
    builder.Services.AddSingleton<IEllpStore, InMemoryStore>();
}

// ── email: real SMTP only when a host is configured and the password is present; otherwise log-only ──
if (!string.IsNullOrWhiteSpace(email.Host) && email.Host != "smtp.example.com" && !string.IsNullOrEmpty(email.Password))
    builder.Services.AddSingleton<IEmailService, SmtpEmailService>();
else
    builder.Services.AddSingleton<IEmailService, LogOnlyEmailService>();

// ── auth: Firebase ID tokens (Google publishes the keys at the issuer's OpenID configuration) ──
if (auth.Mode.Equals("Firebase", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
    {
        o.Authority = $"https://securetoken.google.com/{auth.FirebaseProjectId}";
        o.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"https://securetoken.google.com/{auth.FirebaseProjectId}",
            ValidateAudience = true,
            ValidAudience = auth.FirebaseProjectId,
            ValidateLifetime = true,
        };
    });
}

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "ELLP API", Version = "v1", Description = "English Learning Language Platform. In Development with Auth:Mode=Demo, send the header X-Demo-User: <uid> (u_mint, u_admin_ann, u_super ...)." });
    c.AddSecurityDefinition("demo", new OpenApiSecurityScheme { Type = SecuritySchemeType.ApiKey, In = ParameterLocation.Header, Name = "X-Demo-User", Description = "Demo mode: a seeded uid" });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "demo" } }, Array.Empty<string>() } });
});

var origin = builder.Configuration["Cors:FrontendOrigin"] ?? "http://localhost:5174";
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origin).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseCors();
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
if (auth.Mode.Equals("Firebase", StringComparison.OrdinalIgnoreCase)) app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
// the built web app, when copied into wwwroot (one deployable like TMCL-PR); the SPA takes every unknown path
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program { }
