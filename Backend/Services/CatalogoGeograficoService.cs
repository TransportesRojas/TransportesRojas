using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class CatalogoGeograficoService
{
    private readonly IDbContextFactory<TransportesRojasDbContext> _factory;

    public CatalogoGeograficoService(IDbContextFactory<TransportesRojasDbContext> factory)
    {
        _factory = factory;
    }

    public async Task<List<EstadoGeograficoItem>> ObtenerEstadosAsync()
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        return await ctx.CatEstados
            .AsNoTracking()
            .Where(e => e.Activo)
            .OrderBy(e => e.Nombre)
            .Select(e => new EstadoGeograficoItem(
                e.Id,
                e.CveEnt.Trim(),
                e.Nombre,
                e.Abreviatura))
            .ToListAsync();
    }

    public async Task<List<MunicipioGeograficoItem>> ObtenerMunicipiosPorEstadoAsync(short estadoId)
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        return await ctx.CatMunicipios
            .AsNoTracking()
            .Where(m => m.Activo && m.EstadoId == estadoId)
            .OrderBy(m => m.Nombre)
            .Select(m => new MunicipioGeograficoItem(
                m.Id,
                m.EstadoId,
                m.CveMun.Trim(),
                m.Nombre,
                m.NomCab))
            .ToListAsync();
    }

    public async Task<ConsultaCodigoPostalResponse?> ConsultarPorCodigoPostalAsync(string codigoPostalRaw)
    {
        if (string.IsNullOrWhiteSpace(codigoPostalRaw))
            return null;

        var soloDigitos = new string(codigoPostalRaw.Trim().Where(char.IsDigit).ToArray());
        if (soloDigitos.Length is < 4 or > 5)
            return null;

        var cp = soloDigitos.PadLeft(5, '0');

        await using var ctx = await _factory.CreateDbContextAsync();

        var asentamientos = await ctx.CatAsentamientos
            .AsNoTracking()
            .Include(a => a.Estado)
            .Include(a => a.Municipio)
            .Where(a => a.Activo && a.DCodigo == cp)
            .OrderBy(a => a.DAsenta)
            .ToListAsync();

        if (asentamientos.Count == 0)
            return null;

        var primero = asentamientos[0];
        var estadoId = primero.EstadoId;
        var municipioId = primero.MunicipioId;
        var ciudad = asentamientos.Select(a => a.DCiudad).FirstOrDefault(c => !string.IsNullOrWhiteSpace(c))
                     ?? primero.Municipio.NomCab
                     ?? primero.Municipio.Nombre;

        var localidadCabecera = await ctx.CatLocalidades
            .AsNoTracking()
            .Where(l => l.Activo && l.MunicipioId == municipioId && l.CveLoc == "0001")
            .Select(l => new { l.Id, l.LatDecimal, l.LonDecimal })
            .FirstOrDefaultAsync();

        var cobertura = await ResolverCoberturaAsync(ctx, estadoId, municipioId, cp, primero.Estado.Nombre, primero.Municipio.Nombre);

        var colonias = asentamientos
            .Select(a => new ColoniaSepomexItem(
                a.Id,
                a.DAsenta,
                a.DTipoAsenta,
                a.DZona,
                a.DCiudad))
            .ToList();

        return new ConsultaCodigoPostalResponse(
            cp,
            estadoId,
            primero.Estado.Nombre,
            primero.Estado.Abreviatura,
            municipioId,
            primero.Municipio.Nombre,
            ciudad,
            localidadCabecera?.Id,
            localidadCabecera?.LatDecimal,
            localidadCabecera?.LonDecimal,
            colonias,
            cobertura);
    }

    public async Task<List<SucursalOperativaItem>> ObtenerSucursalesOperativasAsync()
    {
        await using var ctx = await _factory.CreateDbContextAsync();
        var sucursales = await ctx.Sucursales
            .AsNoTracking()
            .Include(s => s.Direccion)
            .Where(s => s.Activo)
            .OrderBy(s => s.Nombre)
            .ToListAsync();

        var sinCoords = sucursales
            .Where(s => (s.Direccion?.Latitud == null || s.Direccion?.Longitud == null) && s.Direccion?.MunicipioId != null)
            .Select(s => s.Direccion!.MunicipioId!.Value)
            .Distinct()
            .ToList();

        var coordsPorMun = new Dictionary<int, (decimal Lat, decimal Lon)>();
        if (sinCoords.Count > 0)
        {
            var locs = await ctx.CatLocalidades
                .AsNoTracking()
                .Where(l => l.Activo && sinCoords.Contains(l.MunicipioId) && l.LatDecimal != null && l.LonDecimal != null)
                .OrderBy(l => l.CveLoc == "0001" ? 0 : 1)
                .Select(l => new { l.MunicipioId, Lat = l.LatDecimal!.Value, Lon = l.LonDecimal!.Value })
                .ToListAsync();

            foreach (var l in locs)
            {
                coordsPorMun.TryAdd(l.MunicipioId, (l.Lat, l.Lon));
            }
        }

        return sucursales.Select(s =>
        {
            decimal? lat = s.Direccion?.Latitud;
            decimal? lon = s.Direccion?.Longitud;
            if ((!lat.HasValue || !lon.HasValue) && s.Direccion?.MunicipioId is int mId && coordsPorMun.TryGetValue(mId, out var c))
            {
                lat ??= c.Lat;
                lon ??= c.Lon;
            }

            return new SucursalOperativaItem(
                s.Id,
                s.Nombre,
                s.NombreCorto,
                s.Codigo,
                s.Direccion != null ? s.Direccion.Calle : null,
                s.Direccion != null ? s.Direccion.Municipio : null,
                s.Direccion != null ? s.Direccion.Estado : null,
                s.Direccion != null ? s.Direccion.CodigoPostal : null,
                s.Telefono,
                lat,
                lon);
        }).ToList();
    }

    // Cobertura geográfica

    private static async Task<CoberturaSugeridaResponse?> ResolverCoberturaAsync(
        TransportesRojasDbContext ctx,
        short estadoId,
        int municipioId,
        string cp,
        string estadoNombre,
        string municipioNombre)
    {
        var coberturasCandidatas = await ctx.SucursalesCobertura
            .AsNoTracking()
            .Include(sc => sc.Sucursal)
            .Where(sc =>
                sc.Activo &&
                sc.Sucursal.Activo &&
                sc.EstadoId == estadoId &&
                (sc.MunicipioId == null || sc.MunicipioId == municipioId) &&
                (sc.CodigoPostal == null || sc.CodigoPostal == cp))
            .ToListAsync();

        var mejorCobertura = coberturasCandidatas
            .OrderByDescending(sc => sc.CodigoPostal != null ? 3 : sc.MunicipioId != null ? 2 : 1)
            .ThenBy(sc => sc.DiasEstimados)
            .FirstOrDefault();

        if (mejorCobertura is not null)
        {
            return new CoberturaSugeridaResponse(
                mejorCobertura.SucursalId,
                mejorCobertura.Sucursal.Nombre,
                mejorCobertura.Sucursal.NombreCorto,
                mejorCobertura.Sucursal.Codigo,
                mejorCobertura.AplicaRecoleccion,
                mejorCobertura.AplicaEntrega,
                mejorCobertura.EsZonaExtendida,
                mejorCobertura.DiasEstimados);
        }

        var estadoUpper = estadoNombre.ToUpperInvariant();
        var municipioUpper = municipioNombre.ToUpperInvariant();

        var sucursalesActivas = await ctx.Sucursales
            .AsNoTracking()
            .Include(s => s.Direccion)
            .Where(s => s.Activo)
            .ToListAsync();

        var sucursalLocal = sucursalesActivas
            .OrderByDescending(s =>
                s.Direccion != null &&
                (s.Direccion.MunicipioId == municipioId ||
                 string.Equals(s.Direccion.Municipio, municipioUpper, StringComparison.OrdinalIgnoreCase))
                    ? 2
                    : s.Direccion != null &&
                      (s.Direccion.EstadoId == estadoId ||
                       string.Equals(s.Direccion.Estado, estadoUpper, StringComparison.OrdinalIgnoreCase))
                        ? 1
                        : 0)
            .FirstOrDefault(s =>
                s.Direccion != null &&
                (s.Direccion.MunicipioId == municipioId ||
                 s.Direccion.EstadoId == estadoId ||
                 string.Equals(s.Direccion.Municipio, municipioUpper, StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(s.Direccion.Estado, estadoUpper, StringComparison.OrdinalIgnoreCase)));

        if (sucursalLocal is not null)
        {
            return new CoberturaSugeridaResponse(
                sucursalLocal.Id,
                sucursalLocal.Nombre,
                sucursalLocal.NombreCorto,
                sucursalLocal.Codigo,
                AplicaRecoleccion: true,
                AplicaEntrega: true,
                EsZonaExtendida: false,
                DiasEstimados: 2);
        }

        return null;
    }
}

