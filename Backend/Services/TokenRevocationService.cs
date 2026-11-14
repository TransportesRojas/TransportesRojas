using System.Collections.Concurrent;

namespace Backend.Services;

public interface ITokenRevocationService
{
    void RevocarToken(string jti, DateTimeOffset expiracion);
    bool EstaRevocado(string jti);
}

public class TokenRevocationService : ITokenRevocationService
{
    private readonly ConcurrentDictionary<string, DateTimeOffset> _tokensRevocados = new();

    public void RevocarToken(string jti, DateTimeOffset expiracion)
    {
        if (string.IsNullOrWhiteSpace(jti)) return;
        _tokensRevocados[jti] = expiracion;
        LimpiarExpirados();
    }

    public bool EstaRevocado(string jti)
    {
        if (string.IsNullOrWhiteSpace(jti)) return false;
        if (_tokensRevocados.TryGetValue(jti, out var exp))
        {
            if (DateTimeOffset.UtcNow <= exp)
            {
                return true;
            }
            _tokensRevocados.TryRemove(jti, out _);
        }
        return false;
    }

    private void LimpiarExpirados()
    {
        if (_tokensRevocados.Count > 500)
        {
            var ahora = DateTimeOffset.UtcNow;
            foreach (var kv in _tokensRevocados)
            {
                if (kv.Value < ahora)
                {
                    _tokensRevocados.TryRemove(kv.Key, out _);
                }
            }
        }
    }
}

