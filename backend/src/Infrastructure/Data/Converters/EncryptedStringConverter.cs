using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Infrastructure.Services.Encryption;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Microsoft.Extensions.DependencyInjection;

namespace QorstackReportService.Infrastructure.Data.Converters;

public class EncryptedStringConverter : ValueConverter<string, string>
{
    private static IServiceProvider? _serviceProvider;

    // Static method to set service provider
    public static void SetServiceProvider(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public EncryptedStringConverter()
        : base(
            v => Encrypt(v),
            v => Decrypt(v))
    {
    }

    private static string Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText))
            return plainText;

        try
        {
            var encryptionService = _serviceProvider?.GetService<IEncryptionService>();
            if (encryptionService != null)
            {
                return encryptionService.Encrypt(plainText);
            }
        }
        catch
        {
            // Return original if encryption fails
        }

        return plainText;
    }

    private static string Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText))
            return cipherText;

        try
        {
            var encryptionService = _serviceProvider?.GetService<IEncryptionService>();
            if (encryptionService != null)
            {
                return encryptionService.Decrypt(cipherText);
            }
        }
        catch
        {
            // Return original if decryption fails
        }

        return cipherText;
    }
}
