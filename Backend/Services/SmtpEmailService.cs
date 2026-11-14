namespace Backend.Services;

using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Net.Mime;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(
        IConfiguration configuration,
        ILogger<SmtpEmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> EnviarCorreoAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        var host = _configuration["Smtp:Host"]
            ?? Environment.GetEnvironmentVariable("SMTP_HOST")
            ?? "smtp.gmail.com";

        var portStr = _configuration["Smtp:Port"]
            ?? Environment.GetEnvironmentVariable("SMTP_PORT");
        var port = int.TryParse(portStr, out var p) ? p : 587;

        var enableSslStr = _configuration["Smtp:EnableSsl"]
            ?? Environment.GetEnvironmentVariable("SMTP_ENABLE_SSL");
        var enableSsl = bool.TryParse(enableSslStr, out var ssl) ? ssl : true;

        var user = _configuration["Smtp:User"]
            ?? Environment.GetEnvironmentVariable("SMTP_USER");

        var password = _configuration["Smtp:Password"]
            ?? Environment.GetEnvironmentVariable("SMTP_PASS")
            ?? Environment.GetEnvironmentVariable("SMTP_PASSWORD");

        var senderEmail = _configuration["Smtp:SenderEmail"]
            ?? Environment.GetEnvironmentVariable("SMTP_SENDER_EMAIL");
        if (string.IsNullOrWhiteSpace(senderEmail))
            senderEmail = user;

        var senderName = _configuration["Smtp:SenderName"]
            ?? Environment.GetEnvironmentVariable("SMTP_SENDER_NAME")
            ?? "Transportes Rojas";

        if (string.IsNullOrWhiteSpace(user) || string.IsNullOrWhiteSpace(password) || user.Contains("tu_correo"))
        {
            _logger.LogInformation("================================================================================");
            _logger.LogInformation("[SIMULACIÓN SMTP (GMAIL) - CREDENCIALES PENDIENTES DE CONFIGURAR]");
            _logger.LogInformation("Para enviar correos reales por Gmail, configura en appsettings.json o .env:");
            _logger.LogInformation("  Smtp:User = tu_correo@gmail.com");
            _logger.LogInformation("  Smtp:Password = tu_contraseña_de_aplicacion_gmail (16 caracteres)");
            _logger.LogInformation("Servidor: {Host}:{Port} (SSL: {Ssl})", host, port, enableSsl);
            _logger.LogInformation("Para: {Name} <{Email}>", toName, toEmail);
            _logger.LogInformation("Asunto: {Subject}", subject);
            _logger.LogInformation("================================================================================");
            return true;
        }

        try
        {
            using var smtpClient = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(user.Trim(), password.Trim()),
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 15000
            };

            using var mailMessage = new MailMessage
            {
                From = new MailAddress(senderEmail!, senderName),
                Subject = subject
            };

            mailMessage.To.Add(new MailAddress(toEmail, string.IsNullOrWhiteSpace(toName) ? toEmail : toName));

            var logoCandidates = new[]
            {
                Path.Combine(AppContext.BaseDirectory, "assets", "LogoCompleto.webp"),
                Path.Combine(Directory.GetCurrentDirectory(), "assets", "LogoCompleto.webp"),
                Path.Combine(Directory.GetCurrentDirectory(), "Backend", "assets", "LogoCompleto.webp"),
                Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Frontend", "src", "assets", "LogoCompleto.webp"),
                Path.Combine(Directory.GetCurrentDirectory(), "Frontend", "src", "assets", "LogoCompleto.webp")
            };

            var logoPathEncontrado = logoCandidates.FirstOrDefault(File.Exists);

            var htmlView = AlternateView.CreateAlternateViewFromString(htmlBody, Encoding.UTF8, MediaTypeNames.Text.Html);

            if (!string.IsNullOrEmpty(logoPathEncontrado))
            {
                var logoResource = new LinkedResource(logoPathEncontrado, "image/webp")
                {
                    ContentId = "logo_transportes_rojas",
                    TransferEncoding = TransferEncoding.Base64
                };
                htmlView.LinkedResources.Add(logoResource);
            }

            mailMessage.AlternateViews.Add(htmlView);

            await smtpClient.SendMailAsync(mailMessage);
            _logger.LogInformation("[SMTP] Correo enviado exitosamente a {Email} vía {Host}", toEmail, host);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SMTP] Error al enviar correo a {Email} mediante {Host}:{Port}", toEmail, host, port);
            return false;
        }
    }

    public async Task<bool> EnviarCorreoActivacionClienteAsync(
        string toEmail, string toName, string passwordGenerada, string tokenActivacion)
    {
        var frontendUrl = _configuration["Smtp:FrontendUrl"]
            ?? _configuration["Brevo:FrontendUrl"]
            ?? Environment.GetEnvironmentVariable("FRONTEND_URL")
            ?? "http://localhost:5173";

        var urlActivacion = $"{frontendUrl.TrimEnd('/')}/activar-cuenta?token={Uri.EscapeDataString(tokenActivacion)}";

        var html = EmailTemplateHelper.GenerarHtmlActivacionCuenta(
            toName,
            toEmail,
            passwordGenerada,
            urlActivacion,
            "cid:logo_transportes_rojas");

        return await EnviarCorreoAsync(toEmail, toName, "Activa tu cuenta en Transportes Rojas", html);
    }
}
