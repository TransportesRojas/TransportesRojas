# Resultados de Ejecución de Pruebas Profundas (Full-Stack)

**Fecha de última ejecución:** 2026-10-26  
**Entorno:** Backend (.NET 10) + Frontend (Vite/React) + PostgreSQL Docker (`pos_db`) + Playwright E2E Runner  

---

## 1. Resumen Ejecutivo de Pruebas Automatizadas

| Suite de Pruebas | Tipo | Casos Totales | Superados | Fallidos | Tasa de Éxito |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Backend Integration (xUnit + WebApplicationFactory)** | API / Datos / DB | 16 | 16 | 0 | **100%** |
| **Frontend E2E (Playwright Test Runner)** | UI / Componentes | 9 | 9 | 0 | **100%** |
| **TOTAL CONSOLIDADO** | Full-Stack | **25** | **25** | **0** | **100%** |

---

## 2. Detalle de Pruebas de Frontend (Playwright E2E)

Se ejecutó la suite `tests/fase2_fase3_cruds.spec.ts` validando la experiencia de usuario real en navegador Chromium headless:

1. **TC_UI_001: TablaGenerica con Buscador Global en Tiempo Real (Issue #33 y Issue #28)**
   - ✅ **Aprobado (1.7s)**
   - Se validó que el input de búsqueda rápida superior filtra coincidencias en tiempo real sobre todas las columnas (clave, nombre, alias, municipio).
   - Se confirmó la eliminación de la leyenda obsoleta `cc-badge` ("5 de 5" / `{filtered.length} de {items.length}`) contigua al título en los encabezados.
   - Botón de limpieza rápida con `X` restablece la lista instantáneamente.

2. **TC_UI_002: Alta de Sucursal con Alias y Código + Feedback Toast (Issue #32 y Issue #36)**
   - ✅ **Aprobado (1.8s)**
   - Formulario captura los nuevos campos `fs-alias` (Alias / Nombre corto) y `fs-codigo` (Clave de sucursal).
   - Tras el guardado exitoso, se dispara y muestra la notificación Toast institucional con franja tricolor y animación de cierre automático.

3. **TC_UI_003: Clientes con Activos Primero y Filtro Predeterminado (Issue #29)**
   - ✅ **Aprobado (1.4s)**
   - Al cargar el módulo, el selector de estado viene predeterminado en "Activos" mostrando a clientes vigentes.
   - Al alternar a "Todos", la tabla prioriza los clientes con `activo = true` en la parte superior.

4. **TC_UI_004: Empleados con Clave TR-, Puesto, Roles y Cambio de Puesto (Issue #37, #38, #39)**
   - ✅ **Aprobado (2.3s)**
   - Se validó que la columna principal muestre "Clave" con formato oficial `TR-050` en lugar de ID numérico crudo.
   - Al seleccionar puesto laboral ("Chofer Foráneo"), el formulario autoasigna y marca el rol base por defecto ("Chofer") y permite habilitar roles adicionales.
   - Desde el menú de opciones de la fila se ejecutó el flujo de **Cambiar Puesto** con motivo de justificación, registrando el cambio y emitiendo el Toast de confirmación.

5. **TC_UI_005: Roles con Asignación Interactiva de Permisos Agrupados (Issue #22)**
   - ✅ **Aprobado (1.8s)**
   - Despliegue de modal `RolModalPermisos` con permisos del sistema clasificados por módulo (Clientes, Empleados, etc.).
   - Permite seleccionar/deseleccionar por módulo o individualmente y guarda vía `PUT /api/Rol/{id}/permisos`.

6. **TC_UI_006: Flotillas con Modal de Unidades y Mantenimiento (Issue #41)**
   - ✅ **Aprobado (1.9s)**
   - Apertura de modal de ficha técnica con pestañas "Unidades Asignadas" (marca, modelo, placas, número económico) e "Historial de Mantenimiento" (tipo de servicio, costo, fecha y observaciones).

7. **TC_UI_007: Flotilla con Combobox Jefe, Sucursal Automática y Asignación de Unidades/Choferes (Issue #42, #43, #44)**
   - ✅ **Aprobado (2.5s)**
   - Se validó que la tabla renderice el Alias y Nombre de la sucursal y el nombre completo del Jefe de Flotilla.
   - Modal de edición desplegó las pestañas "Datos Generales", "Unidades" y "Choferes".
   - Combobox `#ff-jefe` presenta a los jefes de flotilla elegibles.
   - Selección interactiva de unidades y choferes con guardado sincronizado vía `PUT /api/Flotilla/{id}/asignaciones`.

8. **TC_UI_008: Expediente Laboral Digital y Botones con Colores Oficiales (Issue #24, #26, #27)**
   - ✅ **Aprobado (2.0s)**
   - **Botón Agregar en Verde (Issue #27):** Se comprobó que `.cc-btn-add` posee gradiente verde oficial (`#16a34a` a `#15803d`) con sombra de acento verde.
   - **Botones de Guardar / Acción No Rojos (Issue #26):** Se comprobó que `.cc-btn-save` utiliza azul marino institucional (`#002B49`), reservando el color rojo únicamente para operaciones de baja o eliminación definitiva.
   - **Expediente de Empleado (Issue #24):** Desde la acción *"Consultar Expediente"* se abre el modal completo que consolida:
     - Header con avatar, nombre oficial, clave `TR-050`, estatus activo, puesto, sucursal, fecha de ingreso y cálculo automático de antigüedad.
     - Pestaña **Documentación Oficial:** Checklist digital de 7 documentos (INE, RFC, CURP, Comprobante de domicilio, Contrato laboral, Licencia federal de conducir, Examen médico) con estado de entrega y observaciones.
     - Pestaña **Trayectoria Laboral:** Timeline cronológico con historial de puestos, fechas y motivos de promoción o cambio.
     - Pestaña **Roles y Accesos:** Permisos y perfiles operativos activos.
     - Botón de impresión/exportación de expediente.

---

## 3. Detalle de Pruebas de Backend (.NET 10 xUnit)

Se validaron las reglas de negocio sobre la base de datos `pos_db`:

1. **Normalización a Mayúsculas (Punto 18):**
   - Caso `TC_MAY_001`: Inserción en minúsculas para Francisco Javier Obregón Ríos (`javier.obregon@agroindustrias.com`). Nombre y apellidos normalizados a mayúsculas (`FRANCISCO JAVIER`, `OBREGON`, `RIOS`) preservando correos y hashes en minúsculas.
2. **Puesto y Roles en Empleado (Punto 11):**
   - Caso `TC_EMP_PUESTO_001`: Registro de Carlos Alberto Mendoza Vega con Puesto `Chofer` y rol adicional `Personal de sucursal`.
3. **Cambio de Puesto con Historial (Punto 4):**
   - Caso `TC_EMP_PUESTO_002`: Promoción de Patricia Elena Beltrán Castro cerrando fecha fin del puesto anterior y abriendo el nuevo en `empleado_puesto_historial`.
4. **Roles con Permisos Unificados (Punto 10):**
   - Caso `TC_ROL_PERM_001`: Creación de rol `Coordinador de Logística`, consulta vía `/api/Rol/{id}/permisos` y asignación de permisos.
5. **Resumen de Flotillas (Punto 15):**
   - Caso `TC_FLOT_001`: Endpoint `/api/Flotilla/{id}/resumen` retornando unidades y mantenimientos asociados.
6. **Seguridad y Concurrencia (Punto 8):**
   - Protección con 401 Unauthorized ante peticiones sin autenticación y concurrencia serializable.
