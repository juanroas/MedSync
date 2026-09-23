using System.Security.Cryptography;
using System.Text;
using MedSync.Application;

namespace MedSync.Infrastructure;

/// <summary>
/// TOTP (RFC 6238) sobre HOTP (RFC 4226), sem dependencia externa: HMAC-SHA1,
/// passo de 30s, 6 digitos, tolerancia de 1 passo pra cada lado (relogio do
/// autenticador levemente fora de sincronia).
/// </summary>
public sealed class TotpService : ITotpService
{
    private const int SecretBytes = 20;
    private const int Digits = 6;
    private const int StepSeconds = 30;
    private const int ToleranceSteps = 1;

    public string GenerateSecret()
    {
        var bytes = RandomNumberGenerator.GetBytes(SecretBytes);
        return Base32Encode(bytes);
    }

    public string BuildOtpAuthUri(string secret, string accountEmail, string issuer = "MedSync")
    {
        var label = Uri.EscapeDataString($"{issuer}:{accountEmail}");
        var issuerParam = Uri.EscapeDataString(issuer);
        return $"otpauth://totp/{label}?secret={secret}&issuer={issuerParam}&algorithm=SHA1&digits={Digits}&period={StepSeconds}";
    }

    public bool Verify(string secret, string code)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Length != Digits || !code.All(char.IsDigit))
            return false;

        var key = Base32Decode(secret);
        var currentStep = DateTimeOffset.UtcNow.ToUnixTimeSeconds() / StepSeconds;

        for (var offset = -ToleranceSteps; offset <= ToleranceSteps; offset++)
        {
            var candidate = ComputeCode(key, currentStep + offset);
            if (CryptographicOperations.FixedTimeEquals(
                    Encoding.ASCII.GetBytes(candidate),
                    Encoding.ASCII.GetBytes(code)))
                return true;
        }

        return false;
    }

    private static string ComputeCode(byte[] key, long counter)
    {
        var counterBytes = BitConverter.GetBytes(counter);
        if (BitConverter.IsLittleEndian)
            Array.Reverse(counterBytes);

        using var hmac = new HMACSHA1(key);
        var hash = hmac.ComputeHash(counterBytes);

        var offset = hash[^1] & 0x0F;
        var binary =
            ((hash[offset] & 0x7F) << 24) |
            ((hash[offset + 1] & 0xFF) << 16) |
            ((hash[offset + 2] & 0xFF) << 8) |
            (hash[offset + 3] & 0xFF);

        var otp = binary % (int)Math.Pow(10, Digits);
        return otp.ToString().PadLeft(Digits, '0');
    }

    private const string Base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    private static string Base32Encode(byte[] data)
    {
        var builder = new StringBuilder((data.Length * 8 + 4) / 5);
        int bitBuffer = 0, bitsInBuffer = 0;
        foreach (var b in data)
        {
            bitBuffer = (bitBuffer << 8) | b;
            bitsInBuffer += 8;
            while (bitsInBuffer >= 5)
            {
                bitsInBuffer -= 5;
                builder.Append(Base32Alphabet[(bitBuffer >> bitsInBuffer) & 0x1F]);
            }
        }
        if (bitsInBuffer > 0)
            builder.Append(Base32Alphabet[(bitBuffer << (5 - bitsInBuffer)) & 0x1F]);
        return builder.ToString();
    }

    private static byte[] Base32Decode(string base32)
    {
        var clean = base32.Trim().TrimEnd('=').ToUpperInvariant();
        var bytes = new List<byte>(clean.Length * 5 / 8);
        int bitBuffer = 0, bitsInBuffer = 0;
        foreach (var c in clean)
        {
            var index = Base32Alphabet.IndexOf(c);
            if (index < 0)
                continue;
            bitBuffer = (bitBuffer << 5) | index;
            bitsInBuffer += 5;
            if (bitsInBuffer >= 8)
            {
                bitsInBuffer -= 8;
                bytes.Add((byte)((bitBuffer >> bitsInBuffer) & 0xFF));
            }
        }
        return bytes.ToArray();
    }
}
