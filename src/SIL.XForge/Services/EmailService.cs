using System;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using SIL.XForge.Configuration;

namespace SIL.XForge.Services
{
    public class EmailService : IEmailService
    {
        private readonly IOptions<SiteOptions> _options;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IOptions<SiteOptions> options, ILogger<EmailService> logger)
        {
            _options = options;
            _logger = logger;
        }

        public async Task SendEmailAsync(string email, string subject, string body)
        {
            SiteOptions siteOptions = _options.Value;
            string fromAddress = siteOptions.EmailFromAddress;
            string title = siteOptions.Name;
            using var mimeMessage = new MimeMessage();
            mimeMessage.From.Add(new MailboxAddress(title, fromAddress));
            mimeMessage.To.Add(new MailboxAddress("", email));
            mimeMessage.Subject = subject;

            var bodyBuilder = new BodyBuilder { HtmlBody = body };
            mimeMessage.Body = bodyBuilder.ToMessageBody();

            if (siteOptions.SendEmail)
            {
                using var client = new SmtpClient();
                await client.ConnectAsync(
                    siteOptions.SmtpServer,
                    Convert.ToInt32(siteOptions.PortNumber),
                    SecureSocketOptions.None
                );
                await client.SendAsync(mimeMessage);
                await client.DisconnectAsync(true);
            }
            _logger.LogInformation("Email Sent\n{0}", mimeMessage.ToString());
        }
    }
}
