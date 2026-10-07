using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authentication;
using Backend.Models;
using Xunit;

namespace ApiTests;

public class SucursalTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public SucursalTests(WebApplicationFactory<Program> factory)
    {
        var customFactory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.AddAuthentication("TestScheme")
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("TestScheme", options => { });

                services.Configure<AuthenticationOptions>(options =>
                {
                    options.DefaultAuthenticateScheme = "TestScheme";
                    options.DefaultChallengeScheme = "TestScheme";
                    options.DefaultScheme = "TestScheme";
                });
                
                services.AddAuthorization(options =>
                {
                    options.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder("TestScheme")
                        .RequireAuthenticatedUser()
                        .Build();
                });
            });
        });

        _client = customFactory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
        });

        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("TestScheme");
    }

    [Fact]
    public async Task TC_SUC_001_GetSucursales_WithAuth_ReturnsOk()
    {
        // Arrange
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");

        // Act
        var response = await _client.GetAsync("/api/Sucursal");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task TC_SUC_002_CreateSucursal_ReturnsCreated()
    {
        // Arrange
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");
        var sucursalNombre = $"SucursalXUnit_{Guid.NewGuid().ToString().Substring(0, 8)}";
        var payload = new { nombre = sucursalNombre, direccion = "Calle de Prueba 123" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/Sucursal", payload);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task TC_SUC_003_GetNonExistentSucursal_ReturnsNotFound()
    {
        // Arrange
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");

        // Act
        var response = await _client.GetAsync("/api/Sucursal/999999");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
