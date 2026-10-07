# Guía de Defensa del Proyecto: Transportes Rojas

Este documento recopila los puntos técnicos más importantes, decisiones de arquitectura y patrones de diseño implementados en el proyecto. Está diseñado como una guía de estudio para responder posibles preguntas de un profesor o evaluador técnico.

---

## 1. Arquitectura General y Tecnologías

**¿Cuál es el Stack Tecnológico del proyecto y por qué se eligió?**
*   **Backend:** .NET 10 con ASP.NET Core (API REST). Se eligió por su alto rendimiento, tipado fuerte y su ecosistema maduro empresarial.
*   **Frontend:** React con Vite y TypeScript. Permite crear una Single Page Application (SPA) modular, rápida y mantenible.
*   **Base de Datos:** PostgreSQL. Base de datos relacional robusta, ideal para manejar el alto nivel de integridad referencial y las concurrencias requeridas en el transporte.
*   **ORM:** Entity Framework Core (EF Core). Facilita el mapeo de objetos a bases de datos (Object-Relational Mapping) y previene inyecciones SQL nativamente.

## 2. Manejo de Concurrencia (Punto Crítico)

**Pregunta del Profesor: ¿Qué pasa si dos usuarios intentan modificar o asignar la misma unidad o empleado exactamente al mismo tiempo?**
*   **Respuesta:** El proyecto utiliza el nivel de aislamiento más estricto de base de datos: **`IsolationLevel.Serializable`**. 
*   **¿Cómo se maneja en código?** Al ser tan estricto, Postgres arroja un error de concurrencia (`40001` - *serialization_failure*) si hay un conflicto. Para que el usuario final no vea un error, implementamos **Polly** (una librería de resiliencia en C#) en el backend. 
*   A través de `PollyPolicies.CrearPipelineSerializacion`, el backend intercepta el error de Postgres y **reintenta automáticamente la transacción** de forma transparente, garantizando que los datos siempre sean precisos sin arruinar la experiencia del usuario.

## 3. Seguridad: Autenticación y Autorización (RBAC)

**Pregunta del Profesor: ¿Cómo está protegida la API? ¿Cómo validan quién puede hacer qué?**
*   **Autenticación (JWT):** El sistema es _Stateless_. Al hacer Login (vía `AutenticacionController`), el backend valida las credenciales y emite un token JWT (JSON Web Token) firmado criptográficamente. El frontend guarda este token (en `localStorage`) y lo envía en la cabecera `Authorization: Bearer <token>` en cada petición.
*   **Autorización (RBAC):** Se utiliza Control de Acceso Basado en Roles (Role-Based Access Control). Los endpoints de los controladores están protegidos mediante atributos como `[Authorize(Roles = "RH, Supervisor")]`. Esto asegura que solo el personal con esos Claims específicos pueda realizar las acciones.
*   **Encriptación de contraseñas:** Las contraseñas **no** se guardan en texto plano. Se cifran utilizando `PasswordHasher` integrado en ASP.NET Core Identity (usa algoritmos de derivación como PBKDF2/SHA256).

## 4. Lógica de Negocio y Abstracción (Ej. Empleados)

**Pregunta del Profesor: Al crear un Empleado, ¿Cómo manejan su acceso al sistema?**
*   **Respuesta:** En el `EmpleadoService.CreateEmpleadoAsync`, la creación es un proceso atómico (transaccional). Al ingresar un Empleado:
    1. El sistema verifica que el email no esté duplicado.
    2. Genera una **contraseña automática** basada en un algoritmo interno (primeras letras del nombre/apellido + teléfono).
    3. Hashea la contraseña y crea el registro en la tabla `usuario`.
    4. Enlaza el registro en `usuario_rol` para asignarle permisos (ej. RH, Supervisor).
    5. Finalmente, crea el registro en la tabla `empleado` asociándolo mediante su `usuario_id`.
    Todo esto ocurre dentro de un `BeginTransactionAsync`; si cualquier paso falla, se hace un `Rollback` y no se guarda basura en la base de datos.

## 5. Integridad de Base de Datos y Postgres

**Pregunta del Profesor: ¿Qué mecanismos de integridad y auditoría utilizaron directamente en la base de datos?**
*   **Respuesta:** 
    *   **Auditoría Automática (Triggers):** Se definió la función `set_updated_at()` y triggers asociados a las tablas. Cuando un registro sufre un `UPDATE`, el trigger actualiza automáticamente la columna `updated_at` a la fecha `NOW()`. El backend no tiene que preocuparse por esto.
    *   **Extensiones:** Uso de `pgcrypto` para funciones criptográficas nativas si fueran necesarias.
    *   **Eliminación Lógica:** En lugar de hacer un `DELETE` físico de los registros (lo cual rompería historiales de envíos o flotillas), se utiliza el campo booleano `activo = false`. (Soft-Delete).

## 6. Frontend: Patrones y Consumo de API

**Pregunta del Profesor: ¿Cómo se organiza el código de interfaz y cómo se comunican con el Backend?**
*   **Respuesta:** 
    *   Se utiliza un **Wrapper de Fetch** centralizado (`api.ts`). Este interceptor atrapa todos los request, inyecta el Token de seguridad de forma invisible, y si el backend devuelve un HTTP 401 (Expirado/Inválido) arroja excepciones controladas.
    *   **Manejo de Estado:** Uso intensivo de `useState` y `useEffect`.
    *   La paginación, filtros de búsqueda y ordenamiento de tablas están programados mediante componentes reutilizables genéricos (`TablaGenerica`), lo cual hace que el código (DRY - Don't Repeat Yourself) sea limpio.

## 7. QA y Pruebas (Vital si preguntan por Calidad)

**Pregunta del Profesor: ¿Cómo garantizan que el código del backend funciona si hacen un cambio mañana?**
*   **Respuesta:** Implementamos **Pruebas de Integración In-Memory** usando `xUnit` y `WebApplicationFactory`.
*   Esto significa que nuestro proyecto de pruebas (en la carpeta `/pruebas/ApiTests`) levanta el API real en memoria de la computadora y ejecuta peticiones HTTP (POST, GET) directamente, mockeando la seguridad con un `TestAuthHandler`. Validamos desde la estructura HTTP (201 Created, 404 NotFound) hasta la lógica interna sin necesidad de scripts manuales frágiles.

---
**Tip Final:** Cuando expliques el proyecto, enfócate en la palabra **"Transaccionalidad"** (EF Core/Serializable) y en la **"Seguridad Stateless"** (JWT). Son los conceptos de ingeniería de software más avanzados del sistema.
