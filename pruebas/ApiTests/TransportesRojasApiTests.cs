using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authentication;
using Backend.Models; // DTOs
using Xunit;

namespace ApiTests;

public class TransportesRojasApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly HttpClient _unauthClient;

    public TransportesRojasApiTests(WebApplicationFactory<Program> factory)
    {
        // Custom factory configuration to mock authentication
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
                
                // Redefine default authorization policy to use TestScheme
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

        // Client without Authorization header for A01 testing
        _unauthClient = customFactory.CreateClient();
    }

    [Fact]
    public async Task TC_ROL_004_GetRoles_WithAuth_ReturnsOk()
    {
        // Arrange
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");

        // Act
        var response = await _client.GetAsync("/api/Rol");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task A01_GetRoles_WithoutAuth_ReturnsUnauthorized()
    {
        // Act
        var response = await _unauthClient.GetAsync("/api/Rol");

        // Assert - WebApplicationFactory redirects to login or returns 401
        Assert.True(response.StatusCode == HttpStatusCode.Unauthorized || response.StatusCode == HttpStatusCode.Redirect);
    }

    [Fact]
    public async Task TC_ROL_001_CreateRole_ReturnsCreated()
    {
        // Arrange
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");
        var roleName = $"RolXUnit_{Guid.NewGuid().ToString().Substring(0, 8)}";
        var payload = new { nombre = roleName, descripcion = "Rol de pruebas C#" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/Rol", payload);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task TC_ROL_002_CreateDuplicateRole_ReturnsConflict()
    {
        // Arrange
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");
        var roleName = $"RolDup_{Guid.NewGuid().ToString().Substring(0, 8)}";
        var payload = new { nombre = roleName, descripcion = "Rol Dup" };

        await _client.PostAsJsonAsync("/api/Rol", payload);

        // Act
        var response = await _client.PostAsJsonAsync("/api/Rol", payload);

        // Assert
        Assert.True(response.StatusCode == HttpStatusCode.Conflict || response.StatusCode == HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task TC_ROL_005_GetNonExistentRole_ReturnsNotFound()
    {
        // Arrange
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");

        // Act
        var response = await _client.GetAsync("/api/Rol/999999");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task TC_LOG_004_Login_WithEmptyPayload_ReturnsBadRequest()
    {
        // Act
        var response = await _unauthClient.PostAsJsonAsync("/api/Autenticacion/login-empleado", new { });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
