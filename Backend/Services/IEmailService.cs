namespace Backend.Services;

public interface IEmailService
{
    Task<bool> EnviarCorreoAsync(string toEmail, string toName, string subject, string htmlBody);
    Task<bool> EnviarCorreoActivacionClienteAsync(string toEmail, string toName, string passwordGenerada, string tokenActivacion);
}

