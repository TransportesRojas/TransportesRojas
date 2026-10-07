# 🛡️ Guía Educativa: Autenticación JWT, Roles con `[Authorize]` y Conexión Frontend

Esta guía explica en detalle cómo funciona el sistema de seguridad y autenticación implementado en la API de **Transportes Rojas**, cubriendo desde la teoría fundamental de JWT hasta el consumo práctico desde una aplicación Frontend (React, Vue, etc.).

---

## 🗺️ 1. Panorama General del Flujo

En las arquitecturas web modernas basadas en APIs REST, no se guardan sesiones en memoria del servidor (*Stateless*). En su lugar, el cliente se autentica una vez, recibe un **token digital firmado** y lo presenta en cada petición posterior.

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Frontend as Frontend (React / App)
    participant Auth as AutenticacionController
    participant Middleware as Middleware (JWT + Auth)
    participant Controller as CRUD Controller (Ej. Flotilla)

    Usuario->>Frontend: Ingresa credenciales (ID Empleado + Password)
    Frontend->>Auth: POST /api/autenticacion/login-empleado
    Auth->>Auth: Valida hash de contraseña y consulta roles
    Auth-->>Frontend: 200 OK + JSON { token: "eyJhbGciOi...", roles: ["Supervisor"] }
    
    Note over Frontend: Guarda el token en memoria o localStorage

    Usuario->>Frontend: Solicita ver Flotillas
    Frontend->>Middleware: GET /api/flotilla con Header Authorization: Bearer <token>
    Middleware->>Middleware: 1. Valida firma del token<br/>2. Comprueba expiración<br/>3. Extrae claims (Roles)
    alt Token válido y Rol permitido
        Middleware->>Controller: Da paso a la ejecución
        Controller-->>Frontend: 200 OK + Lista de flotillas
    else Rol no permitido
        Middleware-->>Frontend: 403 Forbidden (Acceso denegado)
    else Token ausente, corrupto o expirado
        Middleware-->>Frontend: 401 Unauthorized (No autenticado)
    end
```

---

## 🔑 2. ¿Qué es un JWT y cómo funciona?

**JWT (JSON Web Token)** es un estándar abierto ([RFC 7519](https://tools.ietf.org/html/rfc7519)) que define una forma compacta y autónoma de transmitir información segura entre partes como un objeto JSON.

### 2.1 Anatomía de un Token JWT

Un JWT está compuesto por 3 partes separadas por puntos (`.`):
$$\text{Token} = \color{red}{\text{Header}}\color{black}{.}\color{purple}{\text{Payload}}\color{black}{.}\color{blue}{\text{Signature}}$$

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sIjoiU3VwZXJ2aXNvciIsImV4cCI6MTcxOTU...u7a89sD_f...
```

1. **Header (Encabezado - Rojo):** Indica el tipo de token y el algoritmo de cifrado o firma utilizado (ejemplo: `HMAC SHA-256`).
   ```json
   { "alg": "HS256", "typ": "JWT" }
   ```
2. **Payload (Carga útil - Morado):** Contiene las declaraciones o **Claims** (datos sobre el usuario y metadatos).
   ```json
   {
     "sub": "15",
     "name": "Carlos Mendoza",
     "email": "carlos@transportesrojas.com",
     "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Supervisor",
     "rol": "Supervisor",
     "empleado_id": "4",
     "exp": 1727495000
   }
   ```
3. **Signature (Firma digital - Azul):** Se calcula tomando el Header en Base64, el Payload en Base64, y combinándolos con una **clave secreta** que solo el backend conoce:
   $$\text{Firma} = \text{HMACSHA256}(\text{Header} + "." + \text{Payload}, \text{claveSecreta})$$

> 💡 **Dato clave:** El payload **no está encriptado**, solo está codificado en Base64 (cualquiera puede leerlo). Lo que evita que alguien altere los datos es la **Firma**: si un usuario intenta cambiar su rol de `Chofer` a `RH` en el payload, la firma dejará de coincidir con la clave secreta del servidor y el token será automáticamente rechazado.

### 2.2 ¿Cómo se crea en nuestro Backend? (`JwtService.cs`)

En `Backend/Services/JwtService.cs`:
1. Obtenemos la clave simétrica configurada en `appsettings.json` (`Jwt:Key`).
2. Empacamos los **Claims** (nombre, email, id, roles, permisos):
   ```csharp
   foreach (var rol in roles)
   {
       // ClaimTypes.Role es el estándar de .NET para verificar roles
       claims.Add(new Claim(ClaimTypes.Role, rol));
       claims.Add(new Claim("rol", rol));
   }
   ```
3. Configuramos la vigencia (ejemplo: 8 horas) y firmamos con `SecurityAlgorithms.HmacSha256`.

---

## 🎟️ 3. ¿Qué significa "Bearer"?

En la cabecera HTTP de las peticiones, el token se envía de la siguiente forma:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.1 Etimología y Analogía
- **"Bearer"** en inglés significa **"Portador"**.
- Proviene de la especificación [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750): *The OAuth 2.0 Authorization Framework: Bearer Token Usage*.
- **Analogía de la vida real:** Piensa en un **boleto de cine** o una **pulsera de festival**. El portero no te pide tu credencial de elector ni te toma huella digital para entrar a la sala; simplemente verifica que *quien porta el boleto* tenga un boleto legítimo.
- En HTTP, el servidor asume que quien presente (*bear*) el token válido es el propietario de los derechos que ese token otorga. Por esta razón, el token debe viajar siempre por conexiones seguras (`HTTPS`) para evitar que terceros lo intercepten.

### 3.2 ¿Cómo lo interpreta ASP.NET Core automáticamente?
En `Program.cs` se registran dos middlewares esenciales:
```csharp
app.UseAuthentication(); // 1. Lee el header y valida el token
app.UseAuthorization();  // 2. Evalúa si el usuario tiene permiso para la ruta
```

Cuando llega cualquier petición:
1. El middleware busca la cabecera `Authorization`.
2. Revisa que empiece con el prefijo `Bearer `.
3. Extrae la cadena posterior, decodifica y verifica la firma con la clave simétrica.
4. Si la firma es auténtica y no ha expirado, construye un `ClaimsPrincipal` y lo asigna a `HttpContext.User`.
5. Si no hay token o la firma no coincide, `HttpContext.User.Identity.IsAuthenticated` permanece como `false`.

---

## 🛡️ 4. El Atributo `[Authorize]` y Distinción de Roles

### 4.1 Niveles de Protección

El atributo `[Authorize]` puede usarse a nivel de **Controlador** o a nivel de **Método (Endpoint)**:

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize] // 🔒 Toda la clase exige estar autenticado
public class FlotillaController : ControllerBase
{
    // 👁️ Lectura: Disponible para Supervisor, RH y Jefe de flotilla
    [HttpGet]
    [Authorize(Roles = "Supervisor, RH, Jefe de flotilla")]
    public async Task<IActionResult> ObtenerTodos() { ... }

    // ✏️ Escritura: Solo el Supervisor puede crear flotillas
    [HttpPost]
    [Authorize(Roles = "Supervisor")]
    public async Task<IActionResult> Crear([FromBody] CrearFlotillaModel model) { ... }
}
```

### 4.2 ¿Cómo distingue los roles ASP.NET Core?

Cuando escribes `[Authorize(Roles = "RH, Supervisor")]`:
- El separador por comas `,` funciona como un operador **OR lógico** (el usuario debe tener al menos uno de esos roles).
- El runtime consulta `HttpContext.User.IsInRole("...")`.
- .NET busca dentro de los claims del token aquellos cuyo tipo sea `ClaimTypes.Role` (en JWT se mapea a `"role"` o al URI de Microsoft `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`).
- Si coincide con alguno de los roles listados, la petición continúa. Si no, retorna **403 Forbidden**.

### 4.3 Diferencia entre `401 Unauthorized` y `403 Forbidden`

| Código HTTP | Significado | Causa común |
|---|---|---|
| **`401 Unauthorized`** | No identificado | No enviaste el header `Authorization`, el formato no es `Bearer <token>` o el token ya expiró. |
| **`403 Forbidden`** | Identificado pero sin permiso | El token es válido (sabemos quién eres), pero tu rol no tiene autorización para esta acción (ej. un `Chofer` intentando hacer `DELETE` en `/api/sucursal`). |

---

## 💻 5. Cómo se comunica el Frontend

Para que el frontend pueda interactuar con los endpoints protegidos, debe seguir estos 3 pasos:

### Paso 1: Inicio de sesión (Login)
El frontend envía las credenciales mediante un `POST` al endpoint público (sin `[Authorize]`):

```javascript
// Ejemplo con Fetch API
async function iniciarSesion(empleadoId, password) {
  const respuesta = await fetch("http://localhost:5000/api/autenticacion/login-empleado", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ empleadoId: Number(empleadoId), password })
  });

  if (!respuesta.ok) {
    throw new Error("Credenciales inválidas");
  }

  const data = await respuesta.json();
  
  // Guardar el token en el almacenamiento local de la app
  localStorage.setItem("jwt_token", data.token);
  localStorage.setItem("usuario_roles", JSON.stringify(data.roles));
  
  return data;
}
```

### Paso 2: Envío del Token en cada petición CRUD
Cada vez que el frontend consulte o modifique datos protegidos, debe adjuntar el token en el encabezado `Authorization`:

```javascript
async function obtenerFlotillas() {
  const token = localStorage.getItem("jwt_token");

  const respuesta = await fetch("http://localhost:5000/api/flotilla", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      // 👇 Encabezado indispensable
      "Authorization": `Bearer ${token}`
    }
  });

  if (respuesta.status === 401) {
    // Sesión expirada o token inválido -> Redirigir a pantalla de Login
    localStorage.removeItem("jwt_token");
    window.location.href = "/login";
    return;
  }

  if (respuesta.status === 403) {
    alert("No tienes permiso de Supervisor, RH o Jefe de flotilla para ver este catálogo.");
    return;
  }

  return await respuesta.json();
}
```

### Paso 3: Configuración Automática con Axios (Recomendado)
Si en el frontend se utiliza **Axios**, se puede configurar un **Interceptor** global para no repetir la cabecera en cada llamada:

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api"
});

// Interceptor de Petición: Inyecta el token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de Respuesta: Atrapa errores 401 globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("jwt_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 🌐 6. ¿Por qué es crucial la política de CORS?

En `Backend/Program.cs`:
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirReact", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
            .AllowAnyHeader()  // 👈 CRUCIAL
            .AllowAnyMethod();
    });
});
```

Cuando un navegador detecta una petición con encabezados personalizados (como `Authorization: Bearer ...`), automáticamente realiza primero una petición preliminar llamada **Preflight (`OPTIONS`)** preguntándole al servidor: *"¿Permites que el cliente envíe el encabezado Authorization?"*.

Si `.AllowAnyHeader()` no estuviera configurado, el servidor respondería negativamente y el navegador bloquearía la petición antes de que llegue al controlador, disparando el típico error en consola:
> *"Request header field authorization is not allowed by Access-Control-Allow-Headers in preflight response"*.

---

## 📋 7. Matriz de Autorización Configurada

A continuación se resume qué roles pueden acceder a cada una de las operaciones CRUD implementadas:

| Catálogo | Lectura (`GET` / `GET by Id`) | Creación (`POST`) | Actualización (`PUT`) | Eliminación (`DELETE`) |
|---|---|---|---|---|
| **`sucursal`** | `RH`, `Supervisor`, `Jefe de flotilla`, `Personal administrativo`, `Personal de sucursal` | `RH` | `RH` | `RH` |
| **`rol`** | `RH` | `RH` | `RH` | `RH` |
| **`puesto`** | `RH`, `Supervisor` | `RH` | `RH` | `RH` |
| **`permiso`** | `RH` | `RH` | `RH` | `RH` |
| **`tipo_mantenimiento`** | `RH`, `Supervisor`, `Jefe de flotilla` | `RH` | `RH` | `RH` |
| **`flotilla`** | `Supervisor`, `RH`, `Jefe de flotilla` | `Supervisor` | `Supervisor` | `Supervisor` |
| **`usuario`** | **Todos:** `RH`, `Personal administrativo`<br>**Por Id:** `RH`, `Personal administrativo`, `Chofer` *(propio)* | `RH`, `Personal administrativo` *(clientes)* | `RH`, `Personal administrativo`, `Chofer` *(propio)* | `RH`, `Personal administrativo` |
| **`empleado`** | `RH`, `Supervisor`, `Jefe de flotilla` | `RH` | `RH` | `RH` |
| **`cliente`** | `Personal administrativo`, `RH`, `Supervisor`, `Jefe de flotilla`, `Chofer`, `Personal de sucursal` | `Personal administrativo`, `RH` | `Personal administrativo` | `Personal administrativo` |
| **`unidad`** | **Todos:** `Supervisor`, `RH`, `Jefe de flotilla`<br>**Por Id:** `Supervisor`, `RH`, `Jefe de flotilla`, `Chofer` | `Supervisor` | `Supervisor` | `Supervisor` |
