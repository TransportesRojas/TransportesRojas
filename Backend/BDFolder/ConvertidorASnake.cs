namespace Backend.BDFolder;

public class ConvertidorASnake
{
    public static string ToSnake<T>(T value) where T : struct, Enum
    {
        var s = value.ToString();
        var sb = new System.Text.StringBuilder();
        for (int i = 0; i < s.Length; i++)
        {
            var c = s[i];
            if (char.IsUpper(c) && i > 0) sb.Append('_');
            sb.Append(char.ToLowerInvariant(c));
        }
        return sb.ToString();
    }

    public static T FromSnake<T>(string value) where T : struct, Enum
    {
        var pascal = string.Concat(value.Split('_')
            .Select(p => char.ToUpperInvariant(p[0]) + p[1..]));
        return Enum.Parse<T>(pascal);
    }
}
