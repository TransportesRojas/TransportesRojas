namespace Backend.Services;

using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

public class BrevoEmailService : IEmailService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<BrevoEmailService> _logger;

    public BrevoEmailService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<BrevoEmailService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> EnviarCorreoAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        var apiKey = _configuration["Brevo:ApiKey"]
            ?? Environment.GetEnvironmentVariable("BREVO_API_KEY");

        var senderName = _configuration["Brevo:SenderName"]
            ?? Environment.GetEnvironmentVariable("BREVO_SENDER_NAME")
            ?? "Transportes Rojas";

        var senderEmail = _configuration["Brevo:SenderEmail"]
            ?? Environment.GetEnvironmentVariable("BREVO_SENDER_EMAIL")
            ?? "notificaciones@transportesrojas.com";

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "tu_api_key_de_brevo_aqui")
        {
            _logger.LogInformation("================================================================================");
            _logger.LogInformation("[SIMULACIÓN BREVO - API KEY NO CONFIGURADA]");
            _logger.LogInformation("Para enviar correos reales, configura BREVO_API_KEY en .env o appsettings.json.");
            _logger.LogInformation("Para: {Name} <{Email}>", toName, toEmail);
            _logger.LogInformation("Asunto: {Subject}", subject);
            _logger.LogInformation("================================================================================");
            return true;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("api-key", apiKey);
            client.DefaultRequestHeaders.Add("accept", "application/json");

            var payload = new
            {
                sender = new { name = senderName, email = senderEmail },
                to = new[] { new { email = toEmail, name = string.IsNullOrWhiteSpace(toName) ? toEmail : toName } },
                subject = subject,
                htmlContent = htmlBody
            };

            var json = JsonSerializer.Serialize(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.PostAsync("https://api.brevo.com/v3/smtp/email", content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[Brevo] Correo enviado exitosamente a {Email}. Respuesta: {Response}", toEmail, responseBody);
                return true;
            }

            _logger.LogWarning("[Brevo] No se pudo enviar el correo a {Email}. Código: {Code}, Respuesta: {Response}",
                toEmail, response.StatusCode, responseBody);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Brevo] Excepción al enviar correo a {Email}", toEmail);
            return false;
        }
    }

    public async Task<bool> EnviarCorreoActivacionClienteAsync(
        string toEmail, string toName, string passwordGenerada, string tokenActivacion)
    {
        var frontendUrl = _configuration["Brevo:FrontendUrl"]
            ?? Environment.GetEnvironmentVariable("FRONTEND_URL")
            ?? "http://localhost:5173";

        var urlActivacion = $"{frontendUrl.TrimEnd('/')}/activar-cuenta?token={Uri.EscapeDataString(tokenActivacion)}";

        var logoCandidates = new[]
        {
            System.IO.Path.Combine(AppContext.BaseDirectory, "assets", "LogoCompleto.webp"),
            System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "assets", "LogoCompleto.webp"),
            System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "Backend", "assets", "LogoCompleto.webp"),
            System.IO.Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Frontend", "src", "assets", "LogoCompleto.webp"),
            System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "Frontend", "src", "assets", "LogoCompleto.webp")
        };
        var logoPath = logoCandidates.FirstOrDefault(System.IO.File.Exists);
        var logoSrc = !string.IsNullOrEmpty(logoPath)
            ? $"data:image/webp;base64,{Convert.ToBase64String(System.IO.File.ReadAllBytes(logoPath))}"
            : "cid:logo_transportes_rojas";

        var html = EmailTemplateHelper.GenerarHtmlActivacionCuenta(
            toName,
            toEmail,
            passwordGenerada,
            urlActivacion,
            logoSrc);

        return await EnviarCorreoAsync(toEmail, toName, "Activa tu cuenta en Transportes Rojas", html);
    }
}

