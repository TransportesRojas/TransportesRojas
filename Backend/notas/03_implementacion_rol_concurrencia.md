# 🛠️ Implementación: Rol con Concurrencia SERIALIZABLE

## Resumen de cambios

Se reemplazó el `RolController` original (que hacía CRUD directo contra la BD) por una arquitectura en capas con manejo de concurrencia SERIALIZABLE y reintentos automáticos ante conflictos de PostgreSQL.

---

## Archivos creados

### 1. `Exceptions/RetryableException.cs` — Excepción personalizada

```csharp
public sealed class RetryableException : Exception
```

- Señala que la operación falló por un conflicto de serialización (SQLSTATE 40001).
- Polly **solo** reintenta esta excepción. Cualquier otra se propaga sin reintentar.

---

### 2. `Helpers/PostgresErrorHelper.cs` — Detector de errores 40001

```csharp
public static bool IsSerializationFailure(Exception ex)
```

- Recorre toda la cadena de `InnerException` buscando `PostgresException` con `SqlState == "40001"`.
- Necesario porque EF Core envuelve la excepción real dentro de `DbUpdateException`.

---

### 3. `Policies/PollyPolicies.cs` — Pipeline de reintentos

```csharp
public static ResiliencePipeline CrearPipelineSerializacion(ILogger logger)
```

| Configuración | Valor |
|---------------|-------|
| Tipo | Polly v8 `ResiliencePipeline` |
| Máximo reintentos | 3 (4 intentos en total) |
| Backoff | Exponencial: 200ms → 400ms → 800ms |
| Solo reintenta | `RetryableException` |
| Logging | Sí, cada reintento se registra con `ILogger` |

---

### 4. `Services/RolService.cs` — Capa de negocio

**Dependencias inyectadas:**
- `IDbContextFactory<TransportesRojasDbContext>` — Crea contextos limpios por reintento.
- `ILogger<RolService>` — Logging de operaciones y reintentos.

**Métodos de LECTURA** (READ COMMITTED, sin transacción):

| Método | Retorno | Descripción |
|--------|---------|-------------|
| `GetRolesAsync()` | `List<RolResponse>` | Lista todos los roles con `AsNoTracking` |
| `GetRolByIdAsync(long id)` | `RolResponse?` | Busca un rol por Id, retorna `null` si no existe |

**Métodos de ESCRITURA** (SERIALIZABLE + Polly):

| Método | Retorno | Descripción |
|--------|---------|-------------|
| `CreateRolAsync(CrearRolModel)` | `RolResponse` | Crea rol. Lanza `InvalidOperationException` si nombre duplicado |
| `UpdateRolAsync(long id, ActualizarRolModel)` | `bool` | Actualiza rol. Retorna `false` si no existe |
| `DeleteRolAsync(long id)` | `bool` | Elimina rol. Valida que no esté asignado a usuarios |

**Flujo de cada método de escritura:**
```
1. Crear DbContext limpio (via Factory)
2. BEGIN TRANSACTION SERIALIZABLE
3. Ejecutar lógica (validar + modificar)
4. SaveChangesAsync()
5. COMMIT
   ├── Si 40001 → ROLLBACK + throw RetryableException (Polly reintenta)
   ├── Si validación falla → ROLLBACK + throw InvalidOperationException (NO reintentar)
   └── Si otro error → ROLLBACK + rethrow (NO reintentar)
```

---

### 5. `Controllers/RolController.cs` — Controlador REST (reemplazado)

**Ruta base:** `/api/rol` (usando `[Route("api/[controller]")]`)

| Endpoint | Método | Aislamiento | Respuestas |
|----------|--------|-------------|------------|
| `GET /api/rol` | `ObtenerTodos` | READ COMMITTED | 200 |
| `GET /api/rol/{id}` | `ObtenerPorId` | READ COMMITTED | 200 / 404 |
| `POST /api/rol` | `Crear` | SERIALIZABLE | 201 / 400 / 409 |
| `PUT /api/rol/{id}` | `Actualizar` | SERIALIZABLE | 204 / 400 / 404 / 409 |
| `DELETE /api/rol/{id}` | `Eliminar` | SERIALIZABLE | 204 / 400 / 404 / 409 |

**Mapeo de excepciones a HTTP:**

| Excepción | Código HTTP | Significado |
|-----------|-------------|-------------|
| `InvalidOperationException` | 400 Bad Request | Validación de negocio fallida |
| `RetryableException` | 409 Conflict | Reintentos agotados por conflictos |
| Resultado `null` o `false` | 404 Not Found | Rol no existe |

**Diferencia clave con el controlador anterior:**
El controlador ahora es "delgado" — no tiene lógica de BD directamente. Solo recibe la petición, invoca al servicio, y traduce el resultado a HTTP.

---

## Cambios en `Program.cs`

Se agregaron dos registros de dependencias:

```csharp
// Fábrica de contextos (contextos limpios por reintento)
builder.Services.AddDbContextFactory<TransportesRojasDbContext>(
    options => options.UseNpgsql(connectionString),
    ServiceLifetime.Scoped);

// Servicio de roles (un servicio por request HTTP)
builder.Services.AddScoped<Backend.Services.RolService>();
```

---

## Dependencia nueva: Polly 8.5.2

Agregada al `Backend.csproj`:
```xml
<PackageReference Include="Polly" Version="8.5.2" />
```

Instalada con:
```bash
dotnet add package Polly --version 8.5.2
```

---

## Estructura final de archivos (nuevos en negrita)

```
Backend/
├── BDFolder/
│   └── Catalogos.cs              ← Entidad Rol (sin cambios)
├── Controllers/
│   └── RolController.cs          ← REEMPLAZADO (ahora usa RolService)
├── **Exceptions/**
│   └── RetryableException.cs     ← NUEVO
├── **Helpers/**
│   └── PostgresErrorHelper.cs    ← NUEVO
├── Models/
│   └── RolModels.cs              ← Sin cambios (DTOs)
├── **Policies/**
│   └── PollyPolicies.cs          ← NUEVO
├── **Services/**
│   └── RolService.cs             ← NUEVO
├── ContextoBd.cs                 ← Sin cambios
├── Program.cs                    ← MODIFICADO (+2 registros DI)
└── notas/
    ├── 01_catalogo_crud_rol.md
    ├── 02_concurrencia_serializable_educativo.md  ← NUEVO
    └── 03_implementacion_rol_concurrencia.md      ← NUEVO (este archivo)
```

---

## Cómo probar

```bash
# Compilar
dotnet build

# Ejecutar
dotnet run

# Crear un rol
curl -X POST http://localhost:5000/api/rol \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Supervisor", "descripcion": "Supervisa operaciones"}'

# Listar roles
curl http://localhost:5000/api/rol

# Actualizar
curl -X PUT http://localhost:5000/api/rol/1 \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Supervisor General", "descripcion": "Supervisa todo"}'

# Eliminar
curl -X DELETE http://localhost:5000/api/rol/1
```
