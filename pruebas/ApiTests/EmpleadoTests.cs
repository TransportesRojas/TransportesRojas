using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authentication;
using Backend.Models;
using Xunit;

namespace ApiTests;

public class EmpleadoTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public EmpleadoTests(WebApplicationFactory<Program> factory)
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
    public async Task TC_EMP_001_GetEmpleados_WithAuth_ReturnsOk()
    {
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");

        var response = await _client.GetAsync("/api/Empleado");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task TC_EMP_002_CreateEmpleado_ReturnsCreated()
    {
        _client.DefaultRequestHeaders.Add("X-Test-Role", "RH");
        var empleadoEmail = $"emp_{Guid.NewGuid().ToString().Substring(0, 8)}@test.com";
        var payload = new { 
            nombre = "Carlos", 
            apellidoPaterno = "Gomez",
            telefono = "55512345",
            email = empleadoEmail,
            rolId = 1
        };

        var response = await _client.PostAsJsonAsync("/api/Empleado", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }
}
