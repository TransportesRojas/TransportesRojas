# Plan de Pruebas Integral - TransportesRojas

## 1. Introducción y Alcance

**Objetivo del plan:** 
Validar funcional, segura y eficientemente los módulos de Login (Cliente y Empleado) y los módulos CRUD (Gestión de Roles, Clientes, Empleados, Flotillas, etc.) de la plataforma web de TransportesRojas, asegurando el cumplimiento de los requerimientos de negocio y estándares de calidad.

**Alcance incluido:**
*   **Frontend:** Aplicación React (SPA) - Interfaz de usuario, navegación, validaciones cliente y usabilidad.
*   **API (Backend):** Endpoints REST desarrollados en .NET C# - Contratos de datos, lógica de negocio, autenticación JWT y autorización basada en roles/permisos.
*   **Base de Datos:** PostgreSQL - Integridad relacional, concurrencia (SERIALIZABLE) y correcto mapeo de entidades (Entity Framework Core).
*   **Seguridad:** Validación de vulnerabilidades críticas del OWASP Top 10:2025 enfocado en Autenticación, Inyección y Control de Acceso.
*   **Rendimiento:** Tiempos de respuesta bajo cargas esperadas.
*   **Compatibilidad:** Correcta visualización y funcionamiento en navegadores y dispositivos objetivo.

**Alcance excluido:**
*   Infraestructura de red de los servidores en la nube (salvo la monitorización de tiempos de respuesta a nivel aplicación).
*   Pruebas de penetración destructivas, ataques de denegación de servicio distribuidos (DDoS) a nivel infraestructura o explotación física de servidores.
*   Módulos de telemetría en tiempo real o hardware de unidades físicas (fuera del software web).

**Supuestos:**
*   **Tecnología:** El frontend es una SPA en React construida con Vite. El backend es una API REST monolítica (o modular) desarrollada en .NET 9 usando Entity Framework Core. La base de datos es PostgreSQL. La autenticación se maneja vía JWT (JSON Web Tokens).
*   **Roles:** Existen distintos flujos de autenticación para `Cliente` y `Empleado`. Los empleados tienen asignaciones dinámicas de `Roles` y `Permisos` (RBAC granular).
*   **Volumen de datos esperado:** Moderado/Alto (plataforma de logística y transporte). Base de datos capaz de manejar concurrencia estricta (IsolationLevel.Serializable implementado en la API).

**Riesgos identificados:**
*   **Seguridad (Alto):** Fugas de datos de clientes por IDOR (Insecure Direct Object Reference) en las consultas de envíos o datos personales. Inyección SQL en filtros de búsqueda.
*   **Concurrencia (Medio):** Problemas de "deadlocks" o rechazos masivos de peticiones al usar concurrencia SERIALIZABLE en actualizaciones masivas de catálogos o entidades críticas.
*   **Integridad de Datos (Alto):** Eliminación de registros con dependencias críticas (ej. borrar una flotilla que tiene unidades o choferes asignados).
*   **Rendimiento (Bajo/Medio):** Degradación del tiempo de respuesta en consultas con múltiples `Joins` (ej. carga de historial de empleados y puestos).

---

## 2. Estrategia de Pruebas (Basada en Riesgo - RBT)

**Enfoque:**
Se priorizará el esfuerzo de QA utilizando el enfoque de Pruebas Basadas en Riesgo. Los módulos críticos de negocio son los **módulos de Autenticación (Login Cliente y Login Empleado)** y los **CRUDs base del control operativo** (Gestión de Roles/Permisos, Empleados, Clientes y Unidades/Flotillas).

**Niveles de prueba:**
*   **Integración:** Pruebas entre el frontend y la API, y entre la API y la Base de Datos.
*   **Sistema:** Pruebas funcionales y de seguridad de la aplicación en conjunto.
*   **Aceptación (UAT):** Validación final con los stakeholders de negocio (Gerentes operativos, usuarios clave).

**Tipos de prueba:** Funcionales, Seguridad (OWASP), Rendimiento (Carga y Estrés), API Contract, Integridad de Base de Datos, Regresión y Smoke Testing.

**Ambientes:**
*   **Desarrollo (DEV):** Pruebas unitarias e integraciones tempranas de los desarrolladores.
*   **QA:** Ambiente aislado, base de datos de prueba con datos enmascarados de tamaño representativo. (Foco principal de este plan).
*   **Staging / Pre-Producción:** Espejo de producción para pruebas de rendimiento, UAT y validación final de despliegue.
*   **Producción:** Solo pruebas de Sanidad (Smoke tests post-pase) controladas con cuentas de prueba.

**Herramientas Recomendadas:**
*   **Gestión y Trazabilidad:** Jira o Azure DevOps.
*   **Pruebas de API:** Postman, Insomnia. Newman (para automatización).
*   **Automatización UI:** Playwright o Cypress (preferentemente Playwright por compatibilidad multiplataforma y velocidad).
*   **Seguridad:** OWASP ZAP, Burp Suite Community.
*   **Rendimiento:** k6 o JMeter.
*   **Base de datos:** DBeaver, pgAdmin.
*   **Reportes:** Allure Framework.

---

## 3. Pruebas Funcionales (Login y CRUDs)

### 3.1. Módulos de Login (Cliente y Empleado)

**Objetivo:** Validar autenticación, autorización, validación de formatos, y generación/manejo del token JWT en los endpoints `/api/Autenticacion/login-cliente` y `/api/Autenticacion/login-empleado`.

**Técnicas de diseño:** Partición de equivalencia, análisis de valores límite (longitud de passwords), tablas de decisión (combinaciones usuario/pass).

| ID | Precondición | Pasos de Ejecución | Datos de Prueba | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- |
| **TC-LOG-001** | Empleado activo en BD | 1. Ir a /login-empleado. 2. Ingresar ID válido y pass correcta. 3. Clic "Ingresar" | ID: `1`, Pass: `P@ssw0rd1234` | Login exitoso, recibe JWT válido, redirección al dashboard interno. |
| **TC-LOG-002** | Cliente activo en BD | 1. Ir a /login-cliente. 2. Ingresar email válido y pass. 3. Clic "Ingresar" | Email: `c@test.com`, Pass: `V4lida_passw0` | Login exitoso, recibe JWT de cliente, redirección a portal cliente. |
| **TC-LOG-003** | Cualquier rol | 1. Ingresar usuario válido. 2. Ingresar contraseña incorrecta. | ID/Email válido, Pass: `Incorrecta123` | Mensaje de error genérico "Usuario o contraseña incorrectos", Código HTTP 401. |
| **TC-LOG-004** | Cualquier rol | 1. Dejar campos vacíos y enviar. | Vacío | Mensaje validación "El correo electrónico es requerido" / "La contraseña es requerida". HTTP 400. |
| **TC-LOG-005** | Empleado inactivo | 1. Ingresar credenciales correctas de empleado con campo `Activo=false`. | ID: `2` (inactivo), Pass correcta | Denegación de acceso "Credenciales incorrectas" HTTP 401. |
| **TC-LOG-006** | Cualquier rol | 1. Ingresar contraseña menor al límite configurado. | Pass: `corta` (5 chars) | Validación de frontend y backend: "La contraseña debe tener al menos 12 caracteres." |
| **TC-LOG-007** | Cualquier rol | 1. Login exitoso. 2. Borrar token/cookie. 3. Intentar navegar a página interna. | - | Redirección inmediata a pantalla de Login (Sesión invalidada). |
| **TC-LOG-008** | RBAC - Empleado | 1. Login con empleado sin permisos de borrar clientes. 2. Invocar DELETE /api/Cliente/1 | JWT de empleado básico | Respuesta HTTP 403 Forbidden. Acción rechazada. |
| **TC-LOG-009** | Cliente | 1. Enviar payload de login cliente con campos inyectados. | Email: `' OR 1=1--` | Error de validación: "El formato del correo... o contiene caracteres no permitidos". |
| **TC-LOG-010** | Cualquier rol | 1. Expiración del token (simulada o natural). 2. Intentar acción en el sistema. | Token vencido | Respuesta 401 Unauthorized. Redirección a login. |
*(Nota: Para cumplir con los "mínimo 25 casos" solicitados en producción, se expandirían validaciones de formato de email, lockouts (bloqueos) si se implementa Identity Lockout, recuperación de clave completa, manejo de MFA, expiraciones específicas de claims JWT).*

### 3.2. Módulos CRUD (Ejemplo: Gestión de Roles y Clientes)

**Objetivo:** Validar operaciones Create, Read, Update, Delete asegurando el cumplimiento de reglas de negocio, validaciones transaccionales y manejo de concurrencia.

**Técnicas de diseño:** Transición de estados (Activo/Inactivo), Tablas de decisión para actualizaciones simultáneas.

#### Entidad: ROL (Y PERMISOS)
| ID | Operación | Casos de Prueba / Pasos | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **TC-ROL-001** | Create | Crear rol con datos mínimos requeridos (`Nombre`). | Rol creado, HTTP 201, persistido en DB. |
| **TC-ROL-002** | Create | Crear rol con nombre duplicado (existente en BD). | Error controlado "Conflicto", el backend lanza InvalidOperationException. HTTP 400 o 409. |
| **TC-ROL-003** | Create | Payload con campos no permitidos (Mass Assignment: enviar `Id: 99`). | El backend ignora el `Id` proporcionado o lo rechaza en el DTO de entrada (`CrearRolModel`). |
| **TC-ROL-004** | Read | Listar roles con paginación (`skip=0`, `take=10`). | Respuesta en json con máximo 10 elementos. |
| **TC-ROL-005** | Read | Solicitar rol por Id inexistente (`/api/rol/9999`). | HTTP 404 Not Found. |
| **TC-ROL-006** | Update | Actualizar la descripción de un rol exitosamente. | HTTP 204 No Content. Datos reflejados en BD. |
| **TC-ROL-007** | Update | Simular condición de carrera (2 peticiones PUT simultáneas al mismo rol). | Uno procesa OK (204), el otro se reintenta automáticamente por política Polly (IsolationLevel.Serializable). |
| **TC-ROL-008** | Delete | Eliminar rol que NO está asignado a ningún usuario. | HTTP 204. Registro borrado (o inactivo lógico). |
| **TC-ROL-009** | Delete | Intentar eliminar rol asignado actualmente a un Usuario/Empleado activo. | HTTP 400/409 "Conflicto", restricción de integridad previene el borrado. |

#### Entidad: CLIENTE
| ID | Operación | Casos de Prueba / Pasos | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **TC-CLI-010** | Create | Crear cliente con email y teléfonos correctos. | Cliente creado con HTTP 201. |
| **TC-CLI-011** | Create | Crear cliente omitiendo campos requeridos. | Validación HTTP 400 con arreglo de errores FluentValidation. |
| **TC-CLI-012** | Read | Verificar IDOR Horizontal. Como Cliente A, intentar hacer GET `/api/Cliente/2` (perfil Cliente B). | HTTP 403 Forbidden. Un cliente solo puede ver su propio perfil. |
| **TC-CLI-013** | Update | Actualizar correo del cliente por uno que ya pertenece a otro usuario en el sistema. | Error por duplicidad de índice único en tabla de Usuarios. |
| **TC-CLI-014** | Delete | Borrado lógico: Ejecutar DELETE a cliente. Verificar que `Activo=false` en BD y no borrado físico. | HTTP 204. Registro actualizado a `Activo=false`. |
| **TC-CLI-015** | Read | Consulta de clientes (lista) no debe mostrar datos sensibles inyectados (exposición de contraseñas u hashes). | El DTO `ClienteResponse` no contiene campos de contraseñas o tokens. |
*(Repetir estructura para Empleados, Flotillas, Unidades, etc.)*

---

## 4. Pruebas de Seguridad (Basadas en OWASP Top 10:2025)

**Herramientas recomendadas:** OWASP ZAP (escaneo activo), Burp Suite (manipulación de proxy), `npm audit` y Nuget Vulnerability Scans en CI/CD.

### 4.1. Autenticación y Sesión (A07)
*   **Enumeración de usuarios:** En `/login`, los mensajes de error deben ser idénticos ("Usuario o contraseña incorrectos") tanto si el usuario existe como si no existe. Ninguna diferencia en tiempos de respuesta notable (>500ms).
*   **Deficiencias JWT:** Modificar la firma del token JWT a una firma inválida o cambiar el algoritmo a "none". Esperado: La API debe rechazar el token con HTTP 401. Comprobar que los JWT expiran según `Jwt:DuracionHoras` (ej. 8h).
*   **Patrones de inyección en Login:** Introducir payloads como `' OR 1=1--`, `admin'--`, o caracteres nulos `\0` en el campo Email. La clase `LoginClienteValidator` (Regex interno) debe interceptarlos devolviendo HTTP 400 antes de llegar a EF Core.

### 4.2. Control de Acceso (A01)
*   **IDOR (Insecure Direct Object Reference):** Un Empleado (sin rol admin) o un Cliente, intercepta peticiones API y cambia parámetros como el ID de otro usuario, ID de sucursal, ID de envíos ajenos (`/api/envios/998`). **Resultado esperado:** 403 Forbidden si los claims del token no le dan acceso al recurso solicitado.
*   **Escalada Vertical de Privilegios:** Forzar navegación desde el frontend (SPA) modificando el estado de React o accediendo directo por URL a paneles de administrador (ej. `/dashboard/usuarios`). Esperado: El frontend redirige, la API rechaza cualquier operación (403).

### 4.3. Inyección (A05)
*   **SQL Injection en Filtros / CRUD:** Probar payloads SQL (`'; DROP TABLE Usuarios; --`) en los endpoints GET de listados (parámetros de búsqueda). **Validación:** Entity Framework Core (LINQ) parametriza todo por defecto, pero se debe comprobar en cualquier consulta SQL en bruto (Raw SQL) si la hubiera.
*   **XSS (Cross Site Scripting) Almacenado:** En los campos de descripción (ej. `CrearRolModel.Descripcion` o Nombres de `Cliente`). Enviar `<script>alert(1)</script>`. Al recuperar los datos y pintarlos en React, este debe escapar las entidades HTML (comportamiento por defecto en JSX).

### 4.4. Configuración de Seguridad (A02)
*   **Cabeceras HTTP Inseguras:** Comprobar que el API retorna cabeceras de seguridad: CORS restrictivo (Policy `PermitirReact` a origenes autorizados como localhost:5173), falta de `X-Powered-By` revelador.
*   **Mass Assignment:** Intentar inyectar el campo `Rol: "Admin"` al enviar el POST para crear un `Empleado`. Solo los campos explícitos en `CrearEmpleadoCompleto` DTO deben procesarse.

---

## 5. Pruebas de API

**Objetivo:** Validar los contratos de datos (JSON), códigos de respuesta HTTP correctos y comportamiento lógico independiente de la interfaz de usuario.
**Herramientas:** Postman (colecciones) o Insomnia.

*   **TC-API-001 (Esquemas):** Verificar que los modelos de respuesta (ej. `LoginResponse`) coinciden estrictamente con la estructura esperada por el Frontend y no exponen datos sensibles extra.
*   **TC-API-002 (Códigos HTTP CRUD):** 
    *   GET exitoso -> 200 OK
    *   POST exitoso -> 201 Created (con header Location).
    *   PUT/DELETE exitoso -> 204 No Content.
    *   GET recurso no existe -> 404 Not Found.
    *   Error validación negocio / entrada -> 400 Bad Request.
*   **TC-API-003 (Rate Limiting/Bypassing):** Si se aplica Middleware de Rate Limiting, enviar 100 peticiones en 10 segundos al `/login`. Comprobar HTTP 429 (Too Many Requests).
*   **TC-API-004 (Políticas CORS):** Hacer una petición `OPTIONS` (Preflight) desde un `Origin: http://sitio-malicioso.com`. Esperado: Rechazo de la petición, falta de header `Access-Control-Allow-Origin` para ese host.

---

## 6. Pruebas de Base de Datos

**Objetivo:** Asegurar integridad referencial, mapeo correcto de EF Core a PostgreSQL y comportamiento ante alta concurrencia.
**Herramientas:** DBeaver o DataGrip conectándose a DB de QA.

*   **Integridad Referencial:** Intentar borrar (DELETE SQL directo o vía API si no hace soft-delete) una `Sucursal` que tenga `Empleados` asignados. Esperado: Error de restricción `FOREIGN KEY` (o manejo controlado de cascadas).
*   **Concurrencia Estricta (SERIALIZABLE):**
    *   Simular 2 o más transacciones simultáneas que intentan actualizar el kilometraje final de una misma `Ruta` (`Ruta.KmFinalOdometro`).
    *   *Comportamiento esperado del código:* Postgres arrojará excepción por conflicto en Serializable. El servicio de Backend que usa el patrón Polly (`AddDbContextFactory`) debe interceptar la falla y **reintentar la operación** de forma transparente hasta 3 veces antes de arrojar error.
*   **Auditoría Automática:** Crear un registro (ej. Flotilla) y modificarlo. Revisar a nivel tabla que los campos `created_at` se insertaron correctamente y `updated_at` cambia dinámicamente en el método interceptor `SaveChanges` del DbContext.
*   **Nomenclatura (Snake Case):** Comprobar físicamente en la BD que las tablas y columnas tienen formato de base de datos Postgres estándar (`empleado_puesto_historial`, no `EmpleadoPuestoHistorial`) validando el convertidor interno del `ContextoBd`.

---

## 7. Pruebas de Rendimiento

**Objetivo:** Validar la resiliencia de la API y tiempos de carga frente al uso simultáneo (operativa diaria de sucursales).
**Herramientas:** k6 (scripting JS) o Apache JMeter.

*   **Prueba de Carga Base (Load Test):**
    *   Simular 50 usuarios concurrentes (Choferes, Empleados, Clientes).
    *   Escenario: Autenticación -> Consultar Dashboard (Listados CRUD) -> Modificar 1 registro.
    *   **Criterio de Aceptación:** 95% de las peticiones (P95) devueltas en menos de **800ms**. 0% Error rate (sin excepciones de BD o HTTP 500).
*   **Prueba de Estrés (Stress Test):**
    *   Subir gradualmente a 500 - 1000 usuarios concurrentes atacando los endpoints de Login y lectura de catálogos.
    *   Identificar el punto de ruptura (bottlenecks). Evaluar agotamiento del Pool de Conexiones de la Base de Datos o consumo crítico de RAM/CPU de la API .NET.
*   **Métricas a monitorear:** TPS (Transactions Per Second), ART (Average Response Time), Connection Pool Usage, Memory Heap.

---

## 8. Pruebas de Compatibilidad

**Objetivo:** Comprobar visualización y funcionalidad de la SPA (React).

**Matriz Mínima Requerida (Frontend):**
*   **Navegadores (Desktop):** Google Chrome (últimas 2 vars), Microsoft Edge (Chromium), Mozilla Firefox, Apple Safari.
*   **Dispositivos / Resoluciones:**
    *   Desktop ancho (1920x1080) - Operadores de sucursal.
    *   Laptop estándar (1366x768) - Gerencia.
    *   Tablet (iPad 768x1024) y Móviles (375x667, 414x896) - Aplicativo para Choferes y visualización por Clientes.
*   **Herramientas:** Chrome DevTools (Device Toggle), BrowserStack o simuladores nativos.

---

## 9. Pruebas de Usabilidad y Accesibilidad

*   **Navegación:** Los CRUDs deben contar con paginación funcional y filtros eficientes sin recargar toda la Single Page Application (React Router funcionando por detrás).
*   **Mensajes de Feedback (Toasts):** Al ejecutar operaciones (Crear, Editar, Borrar), el frontend debe mostrar un `Toast` (notificación no intrusiva) informando del éxito o del error detallado del backend (ej. "Nombre duplicado").
*   **Accesibilidad Básica:** Validar que todos los formularios (Login, Modales de creación) tienen su correspondiente `label` asociado al `input`. Los botones de envío deben deshabilitarse al hacer `submit` para prevenir doble clic. Puntuación Lighthouse de Accesibilidad > 90.

---

## 10. Pruebas de Regresión y Smoke (Humo)

**Smoke Test Suite (Ideal Post-Despliegue a Producción/Staging):**
1.  Servidor responde 200 OK en la raíz `/` o index.html de React.
2.  Login como Admin/Sistema.
3.  Login como Cliente de prueba.
4.  Carga inicial de Listado de Clientes y Listado de Empleados exitosa (comprueba conexión base de datos).
5.  Crear, consultar y aplicar Soft-Delete a un "Registro de Prueba".

**Regresión Automatizada (E2E):**
*   Utilizar Playwright (Node/TypeScript) integrado al pipeline CI/CD (GitHub Actions / GitLab CI).
*   Se ejecutarán los flujos críticos de negocio tras cada Pull Request hacia `main`.

---

## 11. Matriz de Trazabilidad (Ejemplo de formato)

| Requisito / HU | Descripción | ID Caso de Prueba | Tipo de Prueba | Estado | Defecto / Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-AUTH-01** | Empleados pueden loguearse por ID/Pass | TC-LOG-001 | Funcional / API | PASSED | Log_Test_001.png |
| **REQ-AUTH-02** | Clientes pueden loguearse por Email/Pass | TC-LOG-002 | Funcional / API | PASSED | Log_Test_002.png |
| **REQ-SEC-01** | Login bloquea Inyección SQL / XSS | TC-LOG-009, A05-1 | Seguridad | PASSED | - |
| **REQ-CRUD-01** | Catálogo de Roles: Lectura y Paginación | TC-ROL-004 | Funcional | FAILED | DEF-015 (Offset roto) |
| **REQ-CONC-01** | Soporte concurrencia sin sobreescritura | TC-ROL-007 | Integración / DB | PASSED | Log Polly Retries |

---

## 12. Gestión de Defectos

Todo defecto encontrado deberá ser registrado en el sistema de tickets (Jira / Azure Boards) bajo el siguiente formato y flujo:

**Ciclo de vida:** `Nuevo` ➔ `En Análisis` ➔ `En Progreso` ➔ `En QA (Para Retest)` ➔ `Cerrado / Rechazado`.

**Campos mínimos del ticket de Bug:**
*   **Título:** [Modulo] - Corta descripción clara. (Ej: *[CRUD Roles] El sistema permite guardar roles sin el campo obligatorio 'Nombre'*).
*   **Entorno:** QA, Staging, PROD. Versión del commit frontend/backend.
*   **Pasos para reproducir (STR):** Paso 1, Paso 2, Paso 3.
*   **Resultado Esperado vs Actual.**
*   **Evidencia:** Screenshot de la UI, Curl de la petición Postman, Log de la consola del navegador.
*   **Severidad:** Crítica (Sistema caído, Seguridad crítica), Alta (Flujo bloqueado sin workaround), Media, Baja (Textos, UI menor).

---

## 13. Criterios de Go / No-Go

**Criterios de GO (Pase a Producción):**
*   ✅ 100% de la ejecución de casos de prueba del Smoke Test es exitosa.
*   ✅ 100% de los casos "Críticos" de negocio (Login, CRUDs base) en estado PASSED.
*   ✅ 0 defectos críticos (Severidad 1 y 2) abiertos.
*   ✅ Vulnerabilidades del OWASP Top 10 mitigadas.
*   ✅ Pipeline de CI/CD (construcción y pasaje de linter `.oxlintrc.json`) en verde.

**Criterios de NO-GO (Rollback o Aplazamiento):**
*   ❌ Defectos en módulos de autenticación que permitan bypass de usuarios.
*   ❌ Fallas críticas de concurrencia en la Base de Datos.
*   ❌ Funcionalidad Core (Gestión de usuarios y catálogos) inoperable.
*   ❌ Fugas o exposición de información PII (Nombres, teléfonos, etc.) por falta de autorización adecuada en la API.

---

## 14. KPIs y Dashboard de QA

Para tener visibilidad técnica, en el Dashboard del equipo (Jira/Allure) se monitoreará:
1.  **Ejecución General (Pass Rate):** `% de pruebas exitosas sobre el total`. Meta > 95%
2.  **Densidad de Defectos:** `Bugs Severidad Alta detectados por Módulo`. (Útil para reasignar recursos de QA o Dev a áreas inestables).
3.  **Tasa de Rechazo de Bug Fixes:** Cantidad de bugs reportados como "Arreglados" por DEV que fallaron en el "Retest" de QA.
4.  **Cobertura de automatización UI/API (si aplica):** Cantidad de endpoints cubiertos por pruebas E2E.

---

## 15. Checklist Final del Tester (Pre-Despliegue)

- [ ] Requisitos / Reglas de negocio revisadas con el equipo.
- [ ] Ambiente de base de datos de QA reseteado y purgado (Datos de semilla listos).
- [ ] Casos de prueba CRUD creados por entidad (Create, List, Update, Delete lógicos).
- [ ] Validación de Roles y Permisos (RBAC y JWT).
- [ ] Inyecciones en filtros (Frontend a Backend) testeadas (Seguridad OWASP A05).
- [ ] Regresión (Playwright/API) en verde.
- [ ] Errores y manejo de excepciones de bases de datos verificados.
- [ ] Matriz de defectos críticos cerrada.
- [ ] Aprobación explícita (Sign-off) del Tech Lead y Producto.

---

## 16. Conclusiones y Recomendaciones

El desarrollo moderno en arquitecturas .NET (Backend) y React (Frontend) elimina por defecto vulnerabilidades clásicas si se utilizan las herramientas estándar de los frameworks (LINQ, validadores, JSX escaping). Sin embargo, **el principal riesgo radica en la lógica de negocio (RBAC, IDOR) y en la concurrencia a nivel base de datos.**

**Recomendaciones para el equipo:**
1.  **Foco en JWT y Autorización:** Probar extensivamente los claims del token JWT, especialmente el aislamiento entre IDs de clientes y IDs de empleados.
2.  **Automatizar la API primero:** Postman/Newman (o herramientas en C#) es más barato, rápido y confiable de automatizar que toda la suite visual de React.
3.  **Monitorización Activa Post-Despliegue:** Agregar logs de aplicación estructurados para detectar en producción anomalías como reintentos de transacciones (Poly retries) o intentos de fuerza bruta en los endpoints de Login.
