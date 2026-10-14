using System.Globalization;
using System.Text;

namespace MedSync.Api;

// Static Pix "copia e cola" (BR Code, Manual de Padrões para Iniciação do Pix do Banco Central): the receiver's key,
// the amount and the invoice code as identifier (txid). Any bank app reads it; confirming the payment stays manual.
public static class PixPayload
{
    public static string Build(string key, string receiverName, string city, decimal amount, string txid)
    {
        var account = Field("00", "br.gov.bcb.pix") + Field("01", key.Trim());
        var payload = new StringBuilder()
            .Append(Field("00", "01"))
            .Append(Field("26", account))
            .Append(Field("52", "0000"))
            .Append(Field("53", "986"))
            .Append(Field("54", amount.ToString("0.00", CultureInfo.InvariantCulture)))
            .Append(Field("58", "BR"))
            .Append(Field("59", Plain(receiverName, 25)))
            .Append(Field("60", Plain(city, 15)))
            .Append(Field("62", Field("05", Txid(txid))))
            .Append("6304")
            .ToString();
        return payload + Crc16(payload).ToString("X4");
    }

    private static string Field(string id, string value) => $"{id}{value.Length:00}{value}";

    // Names travel without accents and in capitals, as the standard expects.
    private static string Plain(string value, int max)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var plain = new string(normalized.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray())
            .ToUpperInvariant()
            .Trim();
        return plain.Length <= max ? plain : plain[..max].Trim();
    }

    private static string Txid(string value)
    {
        var clean = new string(value.Where(char.IsAsciiLetterOrDigit).ToArray());
        return clean.Length == 0 ? "***" : clean.Length <= 25 ? clean : clean[..25];
    }

    // CRC16-CCITT (polynomial 0x1021, initial 0xFFFF), over the payload including "6304".
    internal static ushort Crc16(string value)
    {
        ushort crc = 0xFFFF;
        foreach (var b in Encoding.UTF8.GetBytes(value))
        {
            crc ^= (ushort)(b << 8);
            for (var i = 0; i < 8; i++)
                crc = (crc & 0x8000) != 0 ? (ushort)((crc << 1) ^ 0x1021) : (ushort)(crc << 1);
        }
        return crc;
    }
}

// Amount in words for the receipt ("cento e noventa e nove reais e noventa centavos").
public static class AmountInWords
{
    private static readonly string[] Units =
        ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze",
         "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
    private static readonly string[] Tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    private static readonly string[] Hundreds =
        ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

    public static string Reais(decimal amount)
    {
        var cents = (long)Math.Round(amount * 100, MidpointRounding.AwayFromZero);
        var whole = cents / 100;
        var fraction = cents % 100;
        var parts = new List<string>();
        if (whole > 0)
            parts.Add($"{Number(whole)}{(whole % 1_000_000 == 0 ? " de" : "")} {(whole == 1 ? "real" : "reais")}");
        if (fraction > 0)
            parts.Add($"{Number(fraction)} {(fraction == 1 ? "centavo" : "centavos")}");
        return parts.Count == 0 ? "zero real" : string.Join(" e ", parts);
    }

    private static string Number(long value)
    {
        if (value < 1000)
            return BelowThousand((int)value);
        if (value < 1_000_000)
        {
            var thousands = (int)(value / 1000);
            var rest = (int)(value % 1000);
            var head = thousands == 1 ? "mil" : $"{BelowThousand(thousands)} mil";
            return rest == 0 ? head : $"{head}{Joiner(rest)}{BelowThousand(rest)}";
        }
        var millions = value / 1_000_000;
        var remainder = value % 1_000_000;
        var millionWord = millions == 1 ? "um milhão" : $"{Number(millions)} milhões";
        return remainder == 0 ? millionWord : $"{millionWord}{Joiner((int)Math.Min(remainder, 999))}{Number(remainder)}";
    }

    // "mil e cem", "mil e vinte", but "mil duzentos e trinta".
    private static string Joiner(int rest) => rest < 100 || rest % 100 == 0 ? " e " : " ";

    private static string BelowThousand(int value)
    {
        if (value == 100)
            return "cem";
        if (value < 20)
            return Units[value];
        if (value < 100)
            return value % 10 == 0 ? Tens[value / 10] : $"{Tens[value / 10]} e {Units[value % 10]}";
        var rest = value % 100;
        return rest == 0 ? Hundreds[value / 100] : $"{Hundreds[value / 100]} e {BelowThousand(rest)}";
    }
}
