using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authentication;
using Backend.Models;
using Xunit;

[assembly: CollectionBehavior(DisableTestParallelization = true)]

namespace ApiTests;

public class TransportesRojasApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly HttpClient _unauthClient;

    public TransportesRojasApiTests(WebApplicationFactory<Program> factory)
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

        _unauthClient = customFactory.CreateClient();
    }

    [Fact]
    public async Task TC_ROL_004_GetRoles_WithAuth_ReturnsOk()
    {
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");

        var response = await _client.GetAsync("/api/Rol");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task A01_GetRoles_WithoutAuth_ReturnsUnauthorized()
    {
        var response = await _unauthClient.GetAsync("/api/Rol");

        Assert.True(response.StatusCode == HttpStatusCode.Unauthorized || response.StatusCode == HttpStatusCode.Redirect);
    }

    [Fact]
    public async Task TC_ROL_001_CreateRole_ReturnsCreated()
    {
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");
        var roleName = $"RolXUnit_{Guid.NewGuid().ToString().Substring(0, 8)}";
        var payload = new { nombre = roleName, descripcion = "Rol de pruebas C#" };

        var response = await _client.PostAsJsonAsync("/api/Rol", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task TC_ROL_002_CreateDuplicateRole_ReturnsConflict()
    {
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");
        var roleName = $"RolDup_{Guid.NewGuid().ToString().Substring(0, 8)}";
        var payload = new { nombre = roleName, descripcion = "Rol Dup" };

        await _client.PostAsJsonAsync("/api/Rol", payload);

        var response = await _client.PostAsJsonAsync("/api/Rol", payload);

        Assert.True(response.StatusCode == HttpStatusCode.Conflict || response.StatusCode == HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task TC_ROL_005_GetNonExistentRole_ReturnsNotFound()
    {
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");

        var response = await _client.GetAsync("/api/Rol/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task TC_LOG_004_Login_WithEmptyPayload_ReturnsBadRequest()
    {
        var response = await _unauthClient.PostAsJsonAsync("/api/Autenticacion/login-empleado", new { });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
