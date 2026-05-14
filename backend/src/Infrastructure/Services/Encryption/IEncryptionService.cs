using System;

namespace QorstackReportService.Infrastructure.Services.Encryption;

public interface IEncryptionService
{
    string Encrypt(string plainText);
    string Decrypt(string cipherText);
}
