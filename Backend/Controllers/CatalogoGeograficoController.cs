using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CatalogoGeograficoController : ControllerBase
{
    private readonly CatalogoGeograficoService _catalogoService;

    public CatalogoGeograficoController(CatalogoGeograficoService catalogoService)
    {
        _catalogoService = catalogoService;
    }

    [HttpGet("cp/{codigoPostal}")]
    public async Task<IActionResult> ConsultarCodigoPostal(string codigoPostal)
    {
        var soloDigitos = new string((codigoPostal ?? string.Empty).Trim().Where(char.IsDigit).ToArray());
        if (soloDigitos.Length is < 4 or > 5)
        {
            return BadRequest(new { mensaje = "El código postal debe contener 5 dígitos numéricos." });
        }

        var resultado = await _catalogoService.ConsultarPorCodigoPostalAsync(soloDigitos);
        if (resultado is null)
        {
            return NotFound(new { mensaje = $"No se encontraron colonias registradas en SEPOMEX para el código postal '{soloDigitos.PadLeft(5, '0')}'." });
        }

        return Ok(resultado);
    }

    [HttpGet("estados")]
    public async Task<IActionResult> ObtenerEstados()
    {
        var estados = await _catalogoService.ObtenerEstadosAsync();
        return Ok(estados);
    }

    [HttpGet("estados/{estadoId:int}/municipios")]
    public async Task<IActionResult> ObtenerMunicipiosPorEstado(int estadoId)
    {
        if (estadoId <= 0 || estadoId > short.MaxValue)
            return BadRequest(new { mensaje = "Identificador de estado no válido." });

        var municipios = await _catalogoService.ObtenerMunicipiosPorEstadoAsync((short)estadoId);
        return Ok(municipios);
    }

    [HttpGet("sucursales-operativas")]
    public async Task<IActionResult> ObtenerSucursalesOperativas()
    {
        var sucursales = await _catalogoService.ObtenerSucursalesOperativasAsync();
        return Ok(sucursales);
    }
}
