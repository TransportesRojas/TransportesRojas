# 🧪 Plan de Acción Integral de Pruebas — Transportes Rojas

> **Documento:** Plan de Acción y Estrategia de Pruebas (Backend & Frontend)  
> **Ubicación:** `Backend/notas/plan_de_pruebas_accion.md`  
> **Objetivo:** Cobertura de pruebas unitarias, de integración y E2E para todos los puntos del plan de acción.  
> **Criterio Obligatorio:** Todos los datos de prueba utilizan **nombres de personas reales**, **correos corporativos y personales válidos para humanos**, **direcciones reales de México** y **teléfonos con formato estándar de 10 dígitos**.
> **Estado Actual:** ✅ **22 de 22 Pruebas Automatizadas Superadas (100% OK)**

---

## 1. Banco de Datos de Prueba Humanizados

Para evitar identificadores aleatorios crípticos (como `emp_a8f9@test.com` o `test_1234`), todas las pruebas implementadas utilizan combinaciones del siguiente banco de datos:

### 👤 Personas (Empleados y Clientes)
| Nombre Completo | Correo Humano | Teléfono | Rol / Puesto Objetivo |
|-----------------|---------------|----------|-----------------------|
| Carlos Alberto Mendoza Vega | `carlos.mendoza@transportesrojas.com` | `6671234567` | Chofer / Chofer |
| Patricia Elena Beltrán Castro | `patricia.beltran@transportesrojas.com` | `6679876543` | Supervisor / Supervisor |
| Roberto Carlos Valenzuela Soto | `roberto.valenzuela@transportesrojas.com` | `6681122334` | Jefe de flotilla / Jefe de flotilla |
| Fernanda Sofía Torres Morales | `fernanda.torres@transportesrojas.com` | `6692233445` | RH / Recursos Humanos |
| Miguel Ángel Zazueta Leyva | `miguel.zazueta@transportesrojas.com` | `6673344556` | Personal de sucursal |
| Ricardo Alfonso Rojas Medina | `ricardo.rojas@transportesrojas.com` | `6672450918` | Jefe / Gerente General |
| Ana Laura Elizalde Félix | `ana.elizalde@gmail.com` | `6674455667` | Cliente Particular |
| Francisco Javier Obregón Ríos | `javier.obregon@agroindustrias.com` | `6685566778` | Cliente Empresarial |

### 🏢 Sucursales y Flotillas
- **Sucursal:** `Sucursal Culiacán Matriz` | Alias: `CUL-MATRIZ` | C.P. `80000`
- **Sucursal:** `Sucursal Mazatlán Puerto` | Alias: `MZT-PUERTO` | C.P. `82000`
- **Sucursal:** `Sucursal Los Mochis Norte` | Alias: `LMO-NORTE` | C.P. `81200`
- **Flotilla:** `Flotilla Rutas del Pacífico` | Código: `FLOT-PACIFICO`
- **Flotilla:** `Flotilla Distribución Urbana` | Código: `FLOT-URBANA`
- **Unidad:** `Tractocamión Kenworth T680` | Placas: `VNK-842-A` | Capacidad: `24000 KG`

---

## 2. Matriz de Pruebas por Requerimiento y Estado

| Requerimiento | Tipo de Prueba | Archivo de Prueba | Datos Utilizados | Estado |
|---|---|---|---|:---:|
| **P18: Inserción en MAYÚSCULAS** | Integración API (.NET) | `Fase1BackendTests.cs` | Nombre: `carlos alberto`, Apellido: `mendoza vega` | ✅ Superada |
| **P11: Puesto + Roles por Defecto + Roles Extra** | Integración API (.NET) | `Fase1BackendTests.cs` | Empleado: `Carlos Alberto Mendoza Vega`, Puesto: `Chofer`, Rol extra: `Personal de sucursal` | ✅ Superada |
| **P04: Cambio de Puesto con Historial** | Integración API (.NET) | `Fase1BackendTests.cs` | Empleado: `Patricia Beltrán`, Nuevo Puesto: `Supervisor` | ✅ Superada |
| **P10: Roles y Permisos Unificados** | Integración API (.NET) | `Fase1BackendTests.cs` | Rol: `Coordinador de Logística`, Permisos asignados | ✅ Superada |
| **P15: Detalle de Flotilla (Unidades y Mant.)** | Integración API (.NET) | `Fase1BackendTests.cs` | Flotilla: `Flotilla Rutas del Pacífico` | ✅ Superada |
| **P01: Alias de Sucursal y Código** | Playwright E2E (UI) | `fase2_fase3_cruds.spec.ts` | Nombre: `Sucursal Los Mochis Industrial`, Alias: `Mochis Norte`, Código: `SUC-LMO-01` | ✅ Superada |
| **P06: Prioridad de Activos** | Playwright E2E (UI) | `fase2_fase3_cruds.spec.ts` | Javier Obregón (activo) y Patricia Beltrán (inactivo) | ✅ Superada |
| **P12: Buscador General Superior** | Playwright E2E (UI) | `fase2_fase3_cruds.spec.ts` | Término: `Guadalajara` en `TablaGenerica` | ✅ Superada |
| **P16: Supresión de '5 de 5'** | Playwright E2E (UI) | `fase2_fase3_cruds.spec.ts` | Encabezados de los 10 catálogos sin `cc-badge` | ✅ Superada |
| **P17: Identificadores Visuales (#)** | Playwright E2E (UI) | `fase2_fase3_cruds.spec.ts` | Clave `#` o código de negocio en todas las tablas | ✅ Superada |
| **P19: Notificaciones Toast** | Playwright E2E (UI) | `fase2_fase3_cruds.spec.ts` | Toast flotante con auto-cierre y franja institucional | ✅ Superada |
| **P14: Nombres Amigables en Foráneas** | Playwright E2E (UI) | `fase2_fase3_cruds.spec.ts` | Puesto "Chofer Foráneo" y roles legibles en tabla | ✅ Superada |

---

## 3. Registro de Ejecución

### 📍 Parte 1: Backend & Normalización de Datos — ✅ COMPLETADA
- 16 pruebas ejecutadas con `dotnet test pruebas/ApiTests/ApiTests.csproj`.
- 16 superadas, 0 fallidas (100% éxito).

### 📍 Parte 2: Componentes Core de Frontend — ✅ COMPLETADA
- `TablaGenerica.tsx` actualizado con buscador global en tiempo real y columna visual `#`.
- `Toast.tsx` implementado como provider global con animación y barra de progreso.

### 📍 Parte 3: Estandarización de los 10 Catálogos — ✅ COMPLETADA
- Leyenda "5 de 5" eliminada de los 10 catálogos.
- Alias y código oficial integrados en Sucursales.
- Activos primero por defecto en Clientes y Empleados.
- Modal de Empleados con Puesto, roles automáticos y cambio de puesto laboral.
- Modal interactivo de asignación de permisos a roles.
- Modal de Flotillas con vista de unidades y mantenimientos.
- 6 pruebas E2E ejecutadas con `npx playwright test tests/fase2_fase3_cruds.spec.ts` (6 superadas, 100% éxito).
