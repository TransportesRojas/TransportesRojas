# Documentación Técnica Completa: Transportes Rojas

Este documento proporciona una visión panorámica e integral de todo el sistema "Transportes Rojas". Sirve como manual de referencia arquitectónica detallando las tecnologías, librerías, y la organización del código tanto en el servidor como en el cliente.

---

## 1. Visión General del Sistema
**Transportes Rojas** es un sistema de planificación de recursos empresariales (ERP) y logística, enfocado en el manejo de flotillas, mantenimiento, rutas, clientes, sucursales y administración de personal. Su arquitectura está dividida en dos capas principales (Frontend y Backend) comunicadas de forma asíncrona y segura a través de una API RESTful.

---

## 2. Capa Backend (Servidor y API)

El backend es el motor lógico y de seguridad del sistema. Está construido con el ecosistema de Microsoft, destacando por su fuerte tipado y alto rendimiento.

### Tecnologías Core:
*   **Framework:** .NET 10 (C#) bajo el modelo ASP.NET Core Web API.
*   **Base de Datos:** PostgreSQL 17 (Relacional).
*   **ORM:** Entity Framework (EF) Core. Maneja las consultas a base de datos usando programación orientada a objetos (C# LINQ) en lugar de consultas SQL manuales.

### Librerías Principales (Paquetes NuGet):
1.  **Npgsql.EntityFrameworkCore.PostgreSQL:** El proveedor oficial (Driver) que permite que EF Core traduzca el código C# a sentencias óptimas de PostgreSQL.
2.  **Polly:** Librería de control de fallos y resiliencia. En este proyecto es **crucial**, ya que se usa para interceptar errores de concurrencia de la base de datos (nivel de aislamiento `Serializable`) y ejecutar "reintentos automáticos" (`Retry Pipeline`) sin que el sistema colapse o el usuario note el fallo.
3.  **Microsoft.AspNetCore.Authentication.JwtBearer:** Librería encargada de decodificar y validar los Tokens de seguridad (JSON Web Tokens) inyectados en las cabeceras HTTP de cada petición del frontend.
4.  **FluentValidation:** Se utiliza de forma nativa para definir reglas de negocio fluidas y estructuradas a la hora de validar los datos que el usuario envía (`Payloads`), garantizando que no entren datos inconsistentes a la base de datos.
5.  **Microsoft.AspNetCore.OpenApi / Swagger:** Usado para generar la documentación interactiva de la API durante el desarrollo.

### Arquitectura de Software del Backend:
*   **Controllers (Controladores):** Los puntos de entrada de la API (ej. `EmpleadoController`, `SucursalController`). Reciben las peticiones, validan permisos (`[Authorize]`), y delegan el trabajo.
*   **Services (Servicios):** La capa de "Lógica de Negocio". Aquí es donde ocurre la magia (ej. `EmpleadoService`). Se instancian las transacciones, se hace el _hash_ de contraseñas, y se envían los datos a EF Core.
*   **Models / DTOs (Data Transfer Objects):** Clases puras de C# (usualmente `records` inmutables) que definen la estructura exacta de lo que entra y sale de la API (ej. `CrearEmpleadoCompleto`).

---

## 3. Capa Frontend (Cliente de Interfaz de Usuario)

El Frontend es una *Single Page Application* (SPA) reactiva y moderna. Su objetivo es brindar una interfaz de usuario extremadamente fluida sin necesidad de recargar el navegador web.

### Tecnologías Core:
*   **Librería Principal:** React 18+.
*   **Lenguaje:** TypeScript (Añade tipado estricto a JavaScript, reduciendo enormemente los errores en tiempo de ejecución).
*   **Empaquetador (Bundler):** Vite. Extremadamente rápido para compilar los recursos en tiempo de desarrollo.

### Librerías Principales (NPM):
1.  **lucide-react:** Una moderna librería de iconografía en formato SVG (usada ampliamente en todos los CRUDs y menús para los iconos de lápiz, basura, flechas, etc.).
2.  **ESLint / oxlint:** Herramientas de análisis de código estático para asegurar que los desarrolladores siguen buenas prácticas al escribir React.

### Arquitectura y Patrones del Frontend:
*   **`/services/api.ts` (Interceptor Global):** Un archivo estratégico que centraliza **todas** las peticiones al servidor. Se encarga automáticamente de buscar el Token JWT en el navegador (`localStorage`) y adjuntarlo a las peticiones. Si el backend rechaza la petición, este componente formatea el error.
*   **Componentes Reutilizables (DRY):** Se destacan componentes genéricos como `TablaGenerica`. En lugar de reprogramar la paginación, la barra de búsqueda y el ordenamiento en cada módulo (Sucursales, Clientes, Roles), todas las pantallas consumen este mismo componente pasándole sus propias columnas y datos.
*   **CSS Puro y Modular:** Se apostó por CSS vainilla organizado lógicamente (ej. `estilos/cruds.css`) para mantener un control granular sobre las animaciones, *hovers* y la experiencia de usuario (UX) sin inflar el proyecto con frameworks pesados de clases genéricas.

---

## 4. Infraestructura de Pruebas (QA)

La calidad del software se aseguró mediante marcos de trabajo líderes en la industria para automatización.

### Tecnologías de Pruebas:
1.  **xUnit & WebApplicationFactory (Backend):** Toda la carpeta `pruebas/ApiTests` es un proyecto en C# diseñado para probar la integración de toda la API. `WebApplicationFactory` permite arrancar un clon del servidor en memoria sin consumir puertos locales. A través de `TestAuthHandler`, se simula cualquier rol de usuario para certificar que el sistema rechaza a los intrusos (Devuelve HTTP 401 Unauthorized o 409 Conflict) y acepta los flujos legítimos (Devuelve HTTP 200/201).
2.  **Playwright (Frontend E2E):** Instalado en `pruebas/UITests`. Es la herramienta más moderna (creada por Microsoft) para hacer pruebas *End-to-End*. Emula un navegador Chromium invisible para verificar que las interfaces gráficas y las redirecciones hacia las pantallas de *Login* operan de manera correcta en el mundo real.

---

### Resumen del Flujo de un Dato
1. El usuario llena un formulario en **React** (`Frontend`).
2. **React** procesa el estado, `api.ts` añade la credencial JWT invisiblemente y envía un JSON vía HTTP POST.
3. El **Controller** del **Backend** (.NET) intercepta el request, valida que la firma JWT no haya sido alterada y que el rol del usuario esté autorizado.
4. **FluentValidation** examina el JSON (¿El email es válido? ¿No está vacío?).
5. El **Service** ejecuta una transacción y genera las contraseñas criptográficas.
6. **Entity Framework Core** transforma el objeto a `SQL INSERT`.
7. **PostgreSQL** ejecuta el INSERT, acciona el Trigger `updated_at`, verifica si no hay una colisión `Serializable`, y confirma el guardado.
8. La respuesta HTTP 201 viaja de vuelta al Frontend, el cual actualiza la tabla genérica reactivamente.
