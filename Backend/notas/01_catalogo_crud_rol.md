# 📚 Guía: Cómo se construye un Catálogo CRUD en el Backend

## ¿Qué es un "catálogo"?
Un **catálogo** es una tabla sencilla de la base de datos que guarda opciones o clasificaciones (Roles, Puestos, Estados, etc.). Son las tablas más simples porque generalmente solo tienen: `Id`, `Nombre`, y opcionalmente `Descripcion`.

El CRUD completo para un catálogo necesita **5 operaciones**:

| Operación | Verbo HTTP | Ruta | Código HTTP de respuesta |
|-----------|-----------|------|--------------------------|
| Listar todos | `GET` | `/api/rol` | `200 OK` |
| Obtener uno | `GET` | `/api/rol/{id}` | `200 OK` o `404 Not Found` |
| Crear | `POST` | `/api/rol` | `201 Created` o `409 Conflict` |
| Actualizar | `PUT` | `/api/rol/{id}` | `200 OK`, `404` o `409` |
| Eliminar | `DELETE` | `/api/rol/{id}` | `204 No Content`, `404` o `409` |

---

## Archivos que se crearon

### 1. `Models/RolModels.cs` — Los DTOs

**¿Qué es un DTO?** (Data Transfer Object) Es una clase cuyo único propósito es **transportar datos** entre el frontend y el backend. NO tiene lógica de negocio.

Se crearon **3 records**:

```csharp
// Lo que el frontend ENVÍA para CREAR
public record CrearRolModel(string Nombre, string? Descripcion);

// Lo que el frontend ENVÍA para ACTUALIZAR
public record ActualizarRolModel(string Nombre, string? Descripcion);

// Lo que el backend RESPONDE
public record RolResponse(long Id, string Nombre, string? Descripcion);
```

**¿Por qué `record` y no `class`?** Los `record` son inmutables y comparan por valor (no por referencia). Son perfectos para DTOs porque solo transportan datos y nunca los modifican.

---

### 💡 Pregunta clave: ¿No es lo mismo `Rol` en `Catalogos.cs` que `RolModels`?

A primera vista parecen casi lo mismo (ambos manejan `Nombre` y `Descripcion`), pero tienen **propósitos y estructuras completamente diferentes**:

#### Comparativa directa de código:

**La Entidad (`BDFolder/Catalogos.cs`):**
```csharp
public class Rol
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Descripcion { get; set; }

    // ⚠️ Propiedades de navegación (Relaciones de la Base de Datos)
    public ICollection<RolPermiso> RolPermisos { get; set; } = new List<RolPermiso>();
    public ICollection<UsuarioRol> UsuarioRoles { get; set; } = new List<UsuarioRol>();
}
```

**Los DTOs (`Models/RolModels.cs`):**
```csharp
// Solo lo que el cliente debe enviar al crear (sin Id, sin relaciones)
public record CrearRolModel(string Nombre, string? Descripcion);

// Solo lo que devuelves limpio al exterior
public record RolResponse(long Id, string Nombre, string? Descripcion);
```

#### 4 Razones críticas de por qué NO usar la entidad directamente:

1. **El problema del `Id` al crear:**
   - Al hacer `POST`, el `Id` aún no existe (PostgreSQL lo genera).
   - Si recibes la entidad `Rol`, el usuario podría enviarte `"id": 999` e intentar forzar o romper la secuencia de la BD. Con `CrearRolModel` es imposible que envíen un Id porque ni existe en el modelo.

2. **Error de bucle infinito (Object Cycle Exception):**
   - Si devuelves `Rol` directamente con `Ok(rol)`, ASP.NET intentará convertir a JSON también sus listas: `UsuarioRoles`... pero cada `UsuarioRol` tiene adentro otro `Rol`... y ese `Rol` tiene `UsuarioRoles`...
   - 💥 Esto provoca el temido error **HTTP 500: `JsonException: A possible object cycle was detected`**. Con `RolResponse` cortas las relaciones y entregas un JSON plano y seguro.

3. **Seguridad (Evitar Over-posting o Asignación Masiva):**
   - En modelos más grandes (como `Usuario`), la entidad tiene campos sensibles como `PasswordHash` o `EsAdmin`. Si usas la entidad directamente para recibir datos, un atacante podría enviar `"esAdmin": true` y sobreescribir permisos. Los DTOs actúan como un filtro estricto: solo entra lo que tú defines.

4. **Desacoplamiento (Tu BD es privada, tu API es pública):**
   - La **Entidad** representa la estructura física en la base de datos (PostgreSQL).
   - El **DTO** representa el contrato público con tus clientes (Frontend, apps móviles).
   - Si el día de mañana cambias el nombre de una columna o normalizas una tabla en la BD, la entidad cambia pero tu DTO sigue igual, evitando romper las aplicaciones externas.

| Concepto | Archivo | Responsabilidad |
| :--- | :--- | :--- |
| **Entidad (`Rol`)** | `BDFolder/Catalogos.cs` | Mapeo 1 a 1 con la tabla física en PostgreSQL. Controlada por Entity Framework. |
| **DTO Entrada (`CrearRolModel`)** | `Models/RolModels.cs` | Formulario de entrada limpio. Solo pide los datos requeridos para esa acción. |
| **DTO Salida (`RolResponse`)** | `Models/RolModels.cs` | Paquete de salida seguro y plano. Sin propiedades de navegación ni datos sensibles. |

---

### 2. `Controllers/RolController.cs` — El Controlador

#### Anatomía del controlador

```csharp
[ApiController]                    // ← "Soy una API, no una página web"
[Route("api/[controller]")]        // ← Mi ruta base es /api/rol
public class RolController(TransportesRojasDbContext contexto) : ControllerBase
//                         ↑ Inyección de dependencias: ASP.NET nos da el contexto de BD
```

**Inyección de dependencias (DI):** No creamos el `contexto` con `new`. ASP.NET lo crea por nosotros y lo pasa al constructor. Esto se configuró en `Program.cs` con `builder.Services.AddDbContext<>()`.

---

#### Los 5 endpoints explicados

##### GET `/api/rol` — Listar todos
```csharp
var roles = await contexto.Roles
    .Select(r => new RolResponse(r.Id, r.Nombre, r.Descripcion))
    .ToListAsync();
return Ok(roles);   // HTTP 200
```
- `Select()` → Proyecta la entidad a DTO (como un `map` en JavaScript)
- `ToListAsync()` → Ejecuta la consulta SQL y devuelve una lista
- `Ok()` → Retorna HTTP 200 con el JSON

##### GET `/api/rol/{id}` — Obtener uno
```csharp
var rol = await contexto.Roles.FindAsync(id);
if (rol is null)
    return NotFound(...);   // HTTP 404
return Ok(new RolResponse(...));  // HTTP 200
```
- `FindAsync()` → Busca por clave primaria (es más eficiente que `FirstOrDefault` para PKs)
- Siempre validar si es `null` antes de usarlo

##### POST `/api/rol` — Crear
```csharp
// 1. Validar que no exista duplicado
var existeNombre = await contexto.Roles.AnyAsync(r => r.Nombre == model.Nombre);
if (existeNombre) return Conflict(...);   // HTTP 409

// 2. Crear la entidad
var nuevoRol = new Rol { Nombre = model.Nombre, Descripcion = model.Descripcion };

// 3. Guardar
contexto.Roles.Add(nuevoRol);
await contexto.SaveChangesAsync();

// 4. Retornar con HTTP 201
return CreatedAtAction(nameof(ObtenerPorId), new { id = nuevoRol.Id }, new RolResponse(...));
```

**¿Por qué validamos el nombre duplicado en código si ya hay un índice UNIQUE en la BD?**
Porque si dejamos que la BD lance la excepción, el usuario vería un error genérico (500 Internal Server Error). Validando antes, le damos un mensaje claro con HTTP 409 (Conflict).

##### PUT `/api/rol/{id}` — Actualizar
```csharp
// 1. Buscar el rol
var rol = await contexto.Roles.FindAsync(id);
if (rol is null) return NotFound(...);

// 2. Validar nombre duplicado (excluyendo el mismo rol)
var existeNombre = await contexto.Roles.AnyAsync(r => r.Nombre == model.Nombre && r.Id != id);
if (existeNombre) return Conflict(...);

// 3. Modificar y guardar
rol.Nombre = model.Nombre;
rol.Descripcion = model.Descripcion;
await contexto.SaveChangesAsync();
```

**Detalle clave:** La cláusula `r.Id != id` es importante: sin ella, al actualizar un rol **sin cambiarle el nombre**, el sistema diría "ya existe" (porque se encontraría a sí mismo).

##### DELETE `/api/rol/{id}` — Eliminar
```csharp
// 1. Buscar
var rol = await contexto.Roles.FindAsync(id);
if (rol is null) return NotFound(...);

// 2. Verificar que no esté en uso
var estaEnUso = await contexto.UsuarioRoles.AnyAsync(ur => ur.RolId == id);
if (estaEnUso) return Conflict(...);

// 3. Eliminar
contexto.Roles.Remove(rol);
await contexto.SaveChangesAsync();
return NoContent();  // HTTP 204
```

**⚠️ IMPORTANTE:** Siempre verifica dependencias antes de eliminar. Si un rol está asignado a usuarios y lo borras sin validar, la BD lanza un error de **foreign key constraint**.

---

## Patrón para replicar en otros catálogos

Para crear el catálogo de **Puesto** (u otro), sigue estos pasos:

### Paso 1: Crear `Models/PuestoModels.cs`
```csharp
namespace Backend.Models;

public record CrearPuestoModel(string Nombre, string? Descripcion);
public record ActualizarPuestoModel(string Nombre, string? Descripcion);
public record PuestoResponse(long Id, string Nombre, string? Descripcion);
```

### Paso 2: Crear `Controllers/PuestoController.cs`
Copia `Controllers/RolController.cs` y reemplaza:
- `Rol` → `Puesto`
- `contexto.Roles` → `contexto.Puestos`
- Las referencias de relación (en DELETE, verificar `EmpleadosPuestosHistorial` en vez de `UsuarioRoles`)

### Paso 3: Compilar y probar
```bash
dotnet build
dotnet run
```

---

## Cómo probar los endpoints (sin frontend)

Puedes usar **curl** desde la terminal:

```bash
# Listar todos los roles
curl http://localhost:5000/api/rol

# Obtener un rol por Id
curl http://localhost:5000/api/rol/1

# Crear un rol
curl -X POST http://localhost:5000/api/rol \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Administrador", "descripcion": "Acceso total al sistema"}'

# Actualizar un rol
curl -X PUT http://localhost:5000/api/rol/1 \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Admin", "descripcion": "Acceso total"}'

# Eliminar un rol
curl -X DELETE http://localhost:5000/api/rol/1
```

También puedes usar la documentación OpenAPI que ya tienes configurada. Corre `dotnet run` y visita `/openapi/v1.json` para ver los endpoints disponibles.

---

## Resumen del flujo de una petición

```
Cliente (curl/Postman)
    │
    ▼
POST /api/rol { nombre: "Admin" }
    │
    ▼
ASP.NET Middleware (CORS, routing, etc.)
    │
    ▼
RolController.Crear(CrearRolModel)
    │
    ├── 1. contexto.Roles.AnyAsync(...) → SELECT EXISTS(...)
    │       └── ¿Existe duplicado? → Sí: return 409 Conflict
    │
    ├── 2. new Rol { Nombre = ..., Descripcion = ... }
    │
    ├── 3. contexto.Roles.Add(nuevoRol)
    │
    ├── 4. SaveChangesAsync() → INSERT INTO rol (...) → PostgreSQL genera el Id
    │
    └── 5. return 201 Created + RolResponse { Id = 1, Nombre = "Admin" }
```

---

## Conceptos clave aprendidos

| Concepto | Descripción |
|----------|-------------|
| **DTO (record)** | Clase inmutable para transportar datos entre capas |
| **DbContext** | Puente entre C# y la base de datos |
| **DbSet<T>** | Representa una tabla de la BD |
| **FindAsync** | Busca por clave primaria (eficiente) |
| **AnyAsync** | Verifica si existe al menos un registro que cumpla la condición |
| **Select** | Proyecta/transforma datos (como `map` en JS) |
| **ToListAsync** | Ejecuta la consulta y materializa los resultados |
| **Add / Remove** | Marca entidades para insertar/eliminar |
| **SaveChangesAsync** | Ejecuta todos los cambios pendientes en la BD |
| **Ok()** | HTTP 200 |
| **NotFound()** | HTTP 404 |
| **Conflict()** | HTTP 409 |
| **CreatedAtAction()** | HTTP 201 + header Location |
| **NoContent()** | HTTP 204 |
