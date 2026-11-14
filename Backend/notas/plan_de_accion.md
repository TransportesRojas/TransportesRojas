# 📋 Plan de Acción Maestro y Matriz de Cumplimiento — Transportes Rojas

> **Documento de Control y Seguimiento:** Análisis comparativo de requerimientos de docentes y usuarios frente al repositorio `origin/main` y la versión local del sistema.  
> **Fecha de Actualización:** 2026-10-26  
> **Ubicación:** `Backend/notas/plan_de_accion.md`  
> **Estado General:** ✅ **Fase 1 (Backend & Datos), Fase 2 (Core Frontend) y Fase 3 (Estandarización de 10 Catálogos) 100% Implementadas y Verificadas con 22/22 Pruebas Automatizadas.**

---

## 1. Decisiones y Lineamientos Confirmados por el Usuario

1. **Punto 2 (Tema claro, contraste blanco y botones):** **NO TOCAR.** Aprobado tal como está en local.
2. **Punto 9 (Desplegable de perfil en correo):** **DESCARTADO.** Se conserva el botón directo de salir en la barra superior. No implementar menú desplegable, cambio de contraseña ni soporte en el perfil.
3. **Punto 11 (Puesto al crear empleado y múltiples roles):** Al seleccionar el **Puesto**, el sistema **asigna por defecto los roles correspondientes** a ese puesto, con la capacidad en UI de **marcar roles adicionales**.
4. **Punto 13 (Menú lateral de iconos siempre visible y navegación):** **NO TOCAR.** Aprobado tal como está.
5. **Punto 20 (Rol Superior "Jefe" y "Admin Dep"):** **IGNORAR "Admin Dep" por el momento.** Concentrado exclusivamente en consolidar y aprovechar el rol **Jefe** como máxima autoridad jerárquica.
6. **Punto 3 (Expediente):** **POSPUESTO.** Confirmado fuera de alcance para esta entrega por los profesores.
7. **Punto 21 (Intentos de Login):** Pospuesto para la fase complementaria de seguridad.

---

## 2. Matriz Comparativa de Cumplimiento Consolidada

| # | Requerimiento / Observación | Origen | Estado en `origin/main` | Estado en Local | Veredicto & Decisión |
|---|---|---|---|---|:---:|
| **1** | **Alias a las sucursales (`nombre_corto` y `código`)** | Profesores / Usuario | ❌ No existe | ✅ Implementado en Backend y Frontend (Formulario, tabla y exportación Excel con alias). | ✅ **CUMPLIDO** |
| **2** | **Tema claro, contraste blanco y botones oficiales** | Profesores / Usuario | ❌ Tema oscuro/opaco, bajo contraste | ✅ Paleta institucional blanca/azul/roja en Tailwind y `index.css`. | ✅ **CUMPLIDO (Aprobado)** |
| **3** | **Expediente de empleados / Consultar expediente** | Usuario | ❌ No existe | ⏸️ Pospuesto por docentes | ⏸️ **Pospuesto** |
| **4** | **Cambio de puesto para empleados con historial** | Profesores / Usuario | ❌ No existe | ✅ Implementado en Backend (`POST /api/Empleado/{id}/cambiar-puesto`) y Frontend (Modal de cambio de puesto e historial visual). | ✅ **CUMPLIDO** |
| **5** | **Consultar, editar y dar de baja a cliente** | Profesores / Usuario | ⚠️ Incompleto | ✅ Backend completo con soft-delete (`Activo=false`). Frontend con tabla, edición, baja y alertas Toast. | ✅ **CUMPLIDO** |
| **6** | **Que primero se vean los activos (Empleados y Clientes)** | Profesores / Usuario | ❌ No implementado | ✅ Filtro inicial por defecto en "Activos" y ordenamiento con prioridad a activos (`activo === true` al inicio). | ✅ **CUMPLIDO** |
| **7** | **Requerimientos y descripción completa de Roles** | Profesores / Usuario | ❌ Roles básicos | ✅ Roles con descripción, consulta atómica y vinculación interactiva con permisos. | ✅ **CUMPLIDO** |
| **8** | **CRUD completo para los 10 catálogos (Alta, Consulta, Edición, Baja)** | Profesores / Usuario | ❌ Varios catálogos sin PUT o DELETE | ✅ Los 10 catálogos cuentan con endpoints transaccionales y modales estandarizados. | ✅ **CUMPLIDO** |
| **9** | **Menú de perfil al hacer clic en el correo** | Profesores / Usuario | ❌ Solo botón "Cerrar sesión" | ✅ Botón "Salir" actual funcional y conservado. | 🚫 **DESCARTADO** |
| **10** | **Asignación interactiva de Permisos a Roles** | Profesores / Usuario | ❌ Inexistente | ✅ Implementado en Backend (`GET/PUT /api/Rol/{id}/permisos`) y Frontend (`RolModalPermisos` con checklist agrupado por módulos). | ✅ **CUMPLIDO** |
| **11** | **Puesto al crear empleado con roles por defecto + roles adicionales** | Profesores / Usuario | ❌ Inexistente | ✅ Selector de puesto con asignación automática de roles por defecto y checkboxes para roles extra (probado en API y UI). | ✅ **CUMPLIDO** |
| **12** | **Filtro general arriba de la tabla (buscador global)** | Profesores / Cliente | ❌ Inexistente | ✅ Input general superior en `TablaGenerica.tsx` que filtra en tiempo real sobre todas las columnas con botón `X`. | ✅ **CUMPLIDO** |
| **13** | **Menú lateral de iconos siempre visible y navegación** | Profesores / Cliente | ❌ Sin barra lateral | ✅ `ModuleSidebar` colapsable con iconos y retorno al panel funcionando. | ✅ **CUMPLIDO (Aprobado)** |
| **14** | **Alias entendibles en todos los catálogos (no IDs foráneos)** | Profesores / Usuario | ❌ Muestra IDs numéricos | ✅ Tablas muestran nombres legibles (`Puesto`, `Sucursal`, `Roles`) en lugar de claves foráneas numéricas. | ✅ **CUMPLIDO** |
| **15** | **Flotillas con acceso a Unidades y Mantenimiento** | Cliente / Usuario | ❌ Catálogo plano | ✅ Implementado endpoint `/resumen` y modal `FlotillaModalResumen` con pestañas de Unidades e Historial de Mantenimientos. | ✅ **CUMPLIDO** |
| **16** | **Quitar contador "5 de 5" junto al título del CRUD** | Profesores / Usuario | ❌ Visible | ✅ Eliminado elemento `.cc-badge` junto al título en los 10 catálogos; total conservado en barra de paginación inferior. | ✅ **CUMPLIDO** |
| **17** | **No mostrar IDs reales de BD (usar códigos oficiales/visuales)** | Profesores / Usuario | ❌ Primera columna `ID` | ✅ Sustituido por clave oficial de negocio (`Código`, `Placas`) o identificador visual `#` formateado en monoespaciado. | ✅ **CUMPLIDO** |
| **18** | **Todo lo que se inserta a la BD en MAYÚSCULAS** | Profesores / Usuario | ❌ Sin transformación | ✅ Interceptor `NormalizarMayusculas` en `ContextoBd` (resguardando correos, contraseñas, hashes y enums). | ✅ **CUMPLIDO** |
| **19** | **Alertas visuales Toast de éxito y error** | Profesores / Cliente | ❌ Sin alertas visuales | ✅ `ToastProvider` global con animaciones, barra de progreso y colores institucionales (#0B2D4A, #D64545, verde). | ✅ **CUMPLIDO** |
| **20** | **Rol superior "Jefe"** *(Admin Dep ignorado)* | Profesores / Cliente | ❌ No existía rol `Jefe` | ✅ Rol `Jefe` plenamente integrado y autorizado en Backend y Frontend. | ✅ **CUMPLIDO** |
| **21** | **Control de Intentos de Login y Bloqueo de Cuenta** | Cliente | ❌ Sin control | ⏸️ Pospuesto para fase complementaria de seguridad. | ⏸️ **Pospuesto** |

---

## 3. Resumen de Pruebas Automatizadas (100% Aprobadas)

Para garantizar la máxima confiabilidad sin datos robóticos ni hashes crípticos, se ejecutaron 22 pruebas automatizadas completas utilizando personas reales de México (Carlos Mendoza, Patricia Beltrán, Javier Obregón, Fernando Valenzuela):

1. **Backend Integration Tests (.NET 10 xUnit):** 16 de 16 superadas (`Fase1BackendTests.cs`, `EmpleadoTests.cs`, `SucursalTests.cs`).
2. **Frontend E2E Tests (Playwright Chromium):** 6 de 6 superadas (`fase2_fase3_cruds.spec.ts`).
3. **Total:** **22 de 22 superadas (100%)**.
