import { test, expect } from '@playwright/test';

test.describe('Transportes Rojas - Pruebas UI E2E Fases 2 y 3', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const expTime = Math.floor(Date.now() / 1000) + 86400;
      const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        btoa(JSON.stringify({ exp: expTime, email: 'carlos.mendoza@transportesrojas.com' })) +
        '.signature';

      localStorage.setItem('token', fakeToken);
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 101,
          email: 'carlos.mendoza@transportesrojas.com',
          tipoUsuario: 'Empleado',
          nombreCompleto: 'Carlos Mendoza Silva',
          nombre: 'Carlos',
          roles: ['Jefe', 'RH', 'Supervisor'],
          permisos: ['*'],
        })
      );
    });

    // Mocks base para evitar redirecciones por 401
    await page.route('**/api/Sucursal**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, nombre: 'Sucursal Culiacán Central', nombreCorto: 'Matriz Culiacán', codigo: 'SUC-001' },
            { id: 2, nombre: 'Sucursal Mazatlán Puerto', nombreCorto: 'Zona Dorada', codigo: 'SUC-002' },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/Puesto**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, nombre: 'Chofer Foráneo' },
            { id: 2, nombre: 'Supervisor de Ruta' },
            { id: 3, nombre: 'Gerente General' },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/Rol**', async (route) => {
      if (route.request().url().includes('/permisos')) {
        await route.continue();
      } else if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 10, nombre: 'Chofer' },
            { id: 11, nombre: 'Supervisor' },
            { id: 12, nombre: 'Jefe' },
            { id: 13, nombre: 'Personal de sucursal' },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/Empleado**', async (route) => {
      if (route.request().url().includes('/cambiar-puesto') || route.request().url().includes('/historial-puestos')) {
        await route.continue();
      } else if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, nombre: 'Carlos', apellidoPaterno: 'Mendoza', puestoNombre: 'Jefe de Flotilla', activo: true },
            { id: 2, nombre: 'Javier', apellidoPaterno: 'Obregón', puestoNombre: 'Chofer Foráneo', activo: true },
          ]),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('TC_UI_001_TablaGenerica_BuscadorGlobal_FiltraEnTiempoReal', async ({ page }) => {
    await page.route('**/api/Sucursal', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            codigo: 'SUC-001',
            nombre: 'Sucursal Culiacán Central',
            nombreCorto: 'Matriz Culiacán',
            calle: 'Av. Álvaro Obregón 1240',
            municipio: 'Culiacán',
            estado: 'Sinaloa',
            codigoPostal: '80000',
            telefono: '6677123456',
          },
          {
            id: 2,
            codigo: 'SUC-002',
            nombre: 'Sucursal Mazatlán Puerto',
            nombreCorto: 'Zona Dorada',
            calle: 'Av. Del Mar 500',
            municipio: 'Mazatlán',
            estado: 'Sinaloa',
            codigoPostal: '82000',
            telefono: '6699876543',
          },
          {
            id: 3,
            codigo: 'SUC-003',
            nombre: 'Sucursal Guadalajara Abastos',
            nombreCorto: 'Occidente',
            calle: 'Calzada Lázaro Cárdenas 2100',
            municipio: 'Guadalajara',
            estado: 'Jalisco',
            codigoPostal: '44530',
            telefono: '3336123456',
          },
        ]),
      });
    });

    await page.goto('http://localhost:5173/admin/sucursales');
    await page.waitForLoadState('networkidle');

    const badgeObsoleto = page.locator('.cc-title-group .cc-badge');
    await expect(badgeObsoleto).toHaveCount(0);

    const inputGlobal = page.getByPlaceholder(/Buscar sucursales/i);
    await expect(inputGlobal).toBeVisible();

    await expect(page.locator('text=Matriz Culiacán')).toBeVisible();
    await expect(page.locator('text=Zona Dorada')).toBeVisible();
    await expect(page.locator('text=Guadalajara Abastos')).toBeVisible();

    await inputGlobal.fill('Guadalajara');
    await expect(page.locator('text=Guadalajara Abastos')).toBeVisible();
    await expect(page.locator('text=Matriz Culiacán')).not.toBeVisible();
    await expect(page.locator('text=Zona Dorada')).not.toBeVisible();

    const btnLimpiar = page.locator('button[title="Limpiar búsqueda"]');
    await btnLimpiar.click();
    await expect(page.locator('text=Matriz Culiacán')).toBeVisible();
    await expect(page.locator('text=Zona Dorada')).toBeVisible();
  });

  test('TC_UI_002_Sucursal_AltaConAliasYCodigo_Y_ToastExito', async ({ page }) => {
    let creacionEnviada = false;

    await page.route('**/api/Sucursal', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else if (route.request().method() === 'POST') {
        creacionEnviada = true;
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 15,
            nombre: postData.nombre,
            nombreCorto: postData.nombreCorto,
            codigo: postData.codigo,
            calle: postData.calle,
            municipio: postData.municipio,
            estado: postData.estado,
            codigoPostal: postData.codigoPostal,
            telefono: postData.telefono,
          }),
        });
      }
    });

    await page.goto('http://localhost:5173/admin/sucursales');
    await page.waitForLoadState('networkidle');

    await page.locator('#btn-agregar-sucursal').click();
    await expect(page.locator('#modal-suc-titulo')).toHaveText('Nueva sucursal');

    await page.locator('#fs-nombre').fill('Sucursal Los Mochis Industrial');
    await page.locator('#fs-alias').fill('Mochis Norte');
    await page.locator('#fs-codigo').fill('SUC-LMO-01');
    await page.locator('#fs-calle').fill('Blvd. Rosendo G. Castro 850');
    await page.locator('#fs-municipio').fill('Ahome');
    await page.locator('#fs-estado').fill('Sinaloa');
    await page.locator('#fs-cp').fill('81200');
    await page.locator('#fs-tel').fill('6688123456');

    await page.locator('button[type="submit"].cc-btn-save').click();

    const toast = page.locator('[role="alert"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Sucursal "Sucursal Los Mochis Industrial" creada correctamente');

    expect(creacionEnviada).toBeTruthy();
  });

  test('TC_UI_003_Clientes_ActivosPrimeroYFeedbackBaja', async ({ page }) => {
    await page.route('**/api/Cliente**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              usuarioId: null,
              nombre: 'Patricia',
              apellidoPaterno: 'Beltrán',
              apellidoMaterno: 'Vega',
              telefono: '6672345678',
              email: 'patricia.beltran@gmail.com',
              activo: false,
            },
            {
              id: 2,
              usuarioId: 105,
              nombre: 'Javier',
              apellidoPaterno: 'Obregón',
              apellidoMaterno: 'Castro',
              telefono: '6673456789',
              email: 'javier.obregon@gmail.com',
              activo: true,
            },
          ]),
        });
      } else if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204 });
      }
    });

    await page.goto('http://localhost:5173/admin/clientes');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('cell', { name: 'Javier', exact: true })).toBeVisible();

    const selectActivo = page.locator('select[name="activo"]');
    await selectActivo.selectOption('');
    await expect(page.getByRole('cell', { name: 'Javier', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Patricia', exact: true })).toBeVisible();
  });

  test('TC_UI_004_Empleados_PuestoAutoAsignaRol_Y_CambioPuesto', async ({ page }) => {
    await page.route('**/api/Empleado**', async (route) => {
      if (route.request().method() === 'GET' && route.request().url().includes('puestos-historial')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              puestoId: 1,
              puestoNombre: 'Chofer Foráneo',
              fechaInicio: '2025-01-10',
              fechaFin: null,
              motivoCambio: 'Ingreso inicial',
            },
          ]),
        });
      } else if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 50,
              usuarioId: 201,
              nombre: 'Fernando',
              apellidoPaterno: 'Valenzuela',
              apellidoMaterno: 'Angulo',
              telefono: '6675551234',
              email: 'fernando.valenzuela@transportesrojas.com',
              sucursalId: 1,
              sucursalNombre: 'Sucursal Culiacán Central',
              puestoId: 1,
              puestoNombre: 'Chofer Foráneo',
              roles: ['Chofer'],
              fechaIngreso: '2025-01-10',
              activo: true,
            },
          ]),
        });
      } else if (route.request().method() === 'POST' && route.request().url().includes('cambiar-puesto')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ mensaje: 'Puesto actualizado' }),
        });
      }
    });

    await page.goto('http://localhost:5173/admin/empleados');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=TR-050')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Fernando', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Chofer Foráneo', exact: true })).toBeVisible();

    await page.locator('#btn-agregar-empleado').click();
    await expect(page.locator('#modal-emp-titulo')).toHaveText('Nuevo empleado');

    await page.locator('#fe-puesto').selectOption({ label: 'Chofer Foráneo' });
    await expect(page.locator('text=Rol base predeterminado por puesto: Chofer')).toBeVisible();
    await page.locator('.cc-btn-cancel').click();

    const btnOpciones = page.locator('#btn-opciones-50');
    await btnOpciones.click();

    const btnCambiarPuesto = page.locator('text=Cambiar Puesto');
    await expect(btnCambiarPuesto).toBeVisible();
    await btnCambiarPuesto.click();

    await expect(page.locator('#modal-cambio-puesto-titulo')).toHaveText('Cambio de Puesto Laboral');
    await page.locator('#select-nuevo-puesto').selectOption({ label: 'Supervisor de Ruta' });
    await page.locator('#txt-motivo-cambio').fill('Promoción interna por excelente desempeño');

    await page.locator('button:has-text("Confirmar Cambio de Puesto")').click();

    const toast = page.locator('[role="alert"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Cambio de puesto registrado para Fernando Valenzuela');
  });

  test('TC_UI_005_Roles_AsignacionInteractivaPermisos', async ({ page }) => {
    let asignacionGuardada = false;

    await page.route('**/api/Rol**', async (route) => {
      if (route.request().url().includes('/permisos')) {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              { id: 1, codigo: 'clientes.consultar', modulo: 'Clientes', descripcion: 'Consultar clientes', asignado: true },
              { id: 2, codigo: 'clientes.crear', modulo: 'Clientes', descripcion: 'Crear clientes', asignado: false },
              { id: 3, codigo: 'empleados.consultar', modulo: 'Empleados', descripcion: 'Consultar empleados', asignado: true },
              { id: 4, codigo: 'empleados.editar', modulo: 'Empleados', descripcion: 'Editar empleados', asignado: false },
            ]),
          });
        } else if (route.request().method() === 'PUT') {
          asignacionGuardada = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ mensaje: 'Permisos actualizados' }),
          });
        }
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, nombre: 'Supervisor de Operaciones', descripcion: 'Supervisa rutas y flotilla' },
          ]),
        });
      }
    });

    await page.goto('http://localhost:5173/admin/roles');
    await page.waitForLoadState('networkidle');

    await page.locator('#btn-opciones-1').click();
    const btnAsignar = page.locator('text=Asignar Permisos');
    await expect(btnAsignar).toBeVisible();
    await btnAsignar.click();

    await expect(page.locator('#modal-permisos-titulo')).toContainText('Permisos del Rol:');
    const modalPermisos = page.locator('.cc-modal');
    await expect(modalPermisos.getByRole('button', { name: 'Clientes', exact: true })).toBeVisible();
    await expect(modalPermisos.getByRole('button', { name: 'Empleados', exact: true })).toBeVisible();

    await page.locator('button:has-text("Guardar Asignación")').click();
    const toast = page.locator('[role="alert"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Permisos asignados con éxito');

    expect(asignacionGuardada).toBeTruthy();
  });

  test('TC_UI_006_Flotilla_VerUnidadesYMantenimiento', async ({ page }) => {
    await page.route('**/api/Flotilla**', async (route) => {
      if (route.request().url().includes('/resumen')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            nombre: 'Flotilla Rutas del Pacífico',
            codigo: 'FLOT-PAC-01',
            sucursalNombre: 'Sucursal Mazatlán Puerto',
            supervisorNombre: 'Ing. Carlos Mendoza',
            activo: true,
            unidades: [
              {
                id: 10,
                numeroEconomico: 'TR-101',
                placas: 'VJ-4829-A',
                marca: 'Kenworth',
                modelo: 'T680',
                anio: 2023,
                estado: 'Operativa',
                activo: true,
              },
            ],
            mantenimientos: [
              {
                id: 5,
                unidadId: 10,
                unidadPlacas: 'VJ-4829-A',
                tipoMantenimientoNombre: 'Cambio de Aceite y Filtros',
                fecha: '2026-03-15',
                costo: 3850.0,
                estatus: 'Completado',
                observaciones: 'Servicio preventivo regular realizado en taller oficial',
              },
            ],
          }),
        });
      } else if (route.request().url().includes('/asignaciones')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            unidadesIds: [10],
            choferesIds: [1],
            unidadesDisponibles: [],
            choferesDisponibles: [],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              nombre: 'Flotilla Rutas del Pacífico',
              codigo: 'FLOT-PAC-01',
              sucursalId: 2,
              supervisorId: 1,
              activo: true,
            },
          ]),
        });
      }
    });

    await page.goto('http://localhost:5173/admin/flotillas');
    await page.waitForLoadState('networkidle');

    await page.locator('#btn-opciones-1').click();
    const btnVerResumen = page.locator('text=Ver Unidades y Mantenimiento');
    await expect(btnVerResumen).toBeVisible();
    await btnVerResumen.click();

    await expect(page.locator('#modal-flotilla-resumen-titulo')).toContainText('Flotilla:');
    await expect(page.locator('text=Kenworth T680')).toBeVisible();
    await expect(page.locator('text=VJ-4829-A')).toBeVisible();

    await page.locator('button:has-text("Historial Mantenimiento")').click();
    await expect(page.locator('text=Cambio de Aceite y Filtros')).toBeVisible();
    await expect(page.locator('text=$3,850.00')).toBeVisible();
  });

  test('TC_UI_007_Flotilla_EdicionConComboboxJefeYAsignacionUnidades', async ({ page }) => {
    let asignacionEnviada = false;

    await page.route('**/api/Flotilla**', async (route) => {
      if (route.request().url().includes('/asignaciones') && route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            unidadesIds: [10],
            choferesIds: [1],
            unidadesDisponibles: [
              { id: 10, placas: 'VJ-4829-A', tipoVehiculo: 'Tractocamión', modelo: 'T680', asignadaAOtraFlotilla: false },
              { id: 11, placas: 'UK-9912-B', tipoVehiculo: 'Rabón', modelo: 'International', asignadaAOtraFlotilla: true, flotillaNombre: 'Flotilla Sur' },
            ],
            choferesDisponibles: [
              { id: 1, clave: 'TR-001', nombreCompleto: 'Carlos Mendoza Silva', asignadoAOtraFlotilla: false },
              { id: 2, clave: 'TR-002', nombreCompleto: 'Javier Obregón Castro', asignadoAOtraFlotilla: false },
            ],
          }),
        });
      } else if (route.request().url().includes('/asignaciones') && route.request().method() === 'PUT') {
        asignacionEnviada = true;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ mensaje: 'ok' }) });
      } else if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            nombre: 'Flotilla Rutas del Pacífico Express',
            codigo: 'FLOT-PAC-01',
            sucursalId: 2,
            supervisorId: 1,
            activo: true,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              nombre: 'Flotilla Rutas del Pacífico',
              codigo: 'FLOT-PAC-01',
              sucursalId: 2,
              supervisorId: 1,
              activo: true,
            },
          ]),
        });
      }
    });

    await page.goto('http://localhost:5173/admin/flotillas');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Zona Dorada (Sucursal Mazatlán Puerto)')).toBeVisible();
    await expect(page.locator('text=Carlos Mendoza')).toBeVisible();

    await page.locator('#btn-opciones-1').click();
    const btnEditar = page.locator('text=Editar');
    await expect(btnEditar).toBeVisible();
    await btnEditar.click();

    await expect(page.locator('#modal-flt-titulo')).toContainText('Editar flotilla:');
    await expect(page.locator('.cc-modal button:has-text("Datos Generales")')).toBeVisible();
    await expect(page.locator('.cc-modal button:has-text("Unidades")')).toBeVisible();
    await expect(page.locator('.cc-modal button:has-text("Choferes")')).toBeVisible();

    const selectJefe = page.locator('#ff-jefe');
    await expect(selectJefe).toBeVisible();
    await expect(selectJefe).toContainText('TR-001 - Carlos Mendoza');

    await page.locator('.cc-modal button:has-text("Unidades")').click();
    await expect(page.locator('.cc-modal').getByText('VJ-4829-A')).toBeVisible();
    await expect(page.locator('.cc-modal').getByText('UK-9912-B')).toBeVisible();
    await page.locator('.cc-modal').getByText('UK-9912-B').click();

    await page.locator('.cc-modal button:has-text("Choferes")').click();
    await expect(page.locator('.cc-modal').getByText('Carlos Mendoza Silva')).toBeVisible();
    await expect(page.locator('.cc-modal').getByText('Javier Obregón Castro')).toBeVisible();
    await page.locator('.cc-modal').getByText('Javier Obregón Castro').click();

    await page.locator('button[type="submit"].cc-btn-save').click();

    const toast = page.locator('[role="alert"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('actualizada');
    expect(asignacionEnviada).toBeTruthy();
  });

  test('TC_UI_008_Empleado_ConsultarExpedienteLaboral_Y_BotonesVerdes', async ({ page }) => {
    await page.route('**/api/Empleado**', async (route) => {
      if (route.request().url().includes('/expediente')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 50,
            clave: 'TR-050',
            nombre: 'Fernando',
            apellidoPaterno: 'Valenzuela',
            apellidoMaterno: 'Angulo',
            nombreCompleto: 'Fernando Valenzuela Angulo',
            email: 'fernando.valenzuela@transportesrojas.com',
            telefono: '6675551234',
            sucursalId: 1,
            sucursalNombre: 'Sucursal Culiacán Central',
            sucursalAlias: 'Cul Centro',
            sucursalCodigo: 'SUC-01',
            puestoActual: 'Chofer Foráneo',
            fechaIngreso: '2025-01-10',
            antiguedadTexto: '1 año y 2 meses',
            activo: true,
            createdAt: '2025-01-10T12:00:00Z',
            roles: ['Chofer', 'Personal de sucursal'],
            trayectoriaLaboral: [
              {
                id: 1,
                puestoId: 1,
                puestoNombre: 'Chofer Foráneo',
                fechaInicio: '2025-01-10',
                fechaFin: null,
                motivo: 'Asignación inicial de ingreso',
              },
            ],
            sucursalesACargo: [],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 50,
              usuarioId: 201,
              nombre: 'Fernando',
              apellidoPaterno: 'Valenzuela',
              apellidoMaterno: 'Angulo',
              telefono: '6675551234',
              email: 'fernando.valenzuela@transportesrojas.com',
              sucursalId: 1,
              sucursalNombre: 'Sucursal Culiacán Central',
              puestoId: 1,
              puestoNombre: 'Chofer Foráneo',
              roles: ['Chofer'],
              fechaIngreso: '2025-01-10',
              activo: true,
            },
          ]),
        });
      }
    });

    await page.goto('http://localhost:5173/admin/empleados');
    await page.waitForLoadState('networkidle');

    const btnAgregar = page.locator('#btn-agregar-empleado');
    await expect(btnAgregar).toBeVisible();
    const btnAgregarColor = await btnAgregar.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(btnAgregarColor).not.toContain('214, 69, 69');

    await page.locator('#btn-opciones-50').click();
    const btnExpediente = page.locator('text=Consultar Expediente');
    await expect(btnExpediente).toBeVisible();
    await btnExpediente.click();

    await expect(page.locator('#modal-expediente-titulo')).toHaveText('Expediente Laboral');
    await expect(page.locator('.cc-modal').getByText('TR-050').first()).toBeVisible();
    await expect(page.locator('.cc-modal').getByText('Fernando Valenzuela Angulo')).toBeVisible();

    await expect(page.locator('.cc-modal').getByRole('heading', { name: 'Ficha de Identidad del Empleado' })).toBeVisible();
    await expect(page.locator('.cc-modal').getByRole('heading', { name: 'Sucursal y Adscripción Oficial' })).toBeVisible();

    await page.locator('.cc-modal button:has-text("Trayectoria Laboral")').click();
    await expect(page.locator('.cc-modal').getByText('Asignación inicial de ingreso')).toBeVisible();

    await page.locator('button:has-text("Cerrar Expediente")').click();
    await expect(page.locator('#modal-expediente-titulo')).not.toBeVisible();
  });

  test('TC_UI_009_Flotilla_BuscadorChoferesSinFiltroRolesPuestos', async ({ page }) => {
    await page.route('**/api/Flotilla**', async (route) => {
      if (route.request().url().includes('/asignaciones')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            unidadesIds: [],
            choferesIds: [1],
            unidadesDisponibles: [],
            choferesDisponibles: [
              { id: 1, clave: 'TR-001', nombreCompleto: 'Ricardo Rojas Medina', asignadoAOtraFlotilla: false },
              { id: 2, clave: 'TR-002', nombreCompleto: 'Roberto Diaz Medina', asignadoAOtraFlotilla: false },
              { id: 3, clave: 'TR-003', nombreCompleto: 'Carlos Gomez', asignadoAOtraFlotilla: false },
            ],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, nombre: 'Flotilla Rutas del Pacífico 4945', codigo: 'FLT-4945', sucursalId: 1, supervisorId: 1, activo: true },
          ]),
        });
      }
    });

    await page.goto('http://localhost:5173/admin/flotillas');
    await page.waitForLoadState('networkidle');

    await page.locator('#btn-opciones-1').click();
    await page.locator('text=Editar').click();
    await expect(page.locator('#modal-flt-titulo')).toBeVisible();

    await page.locator('.cc-modal button:has-text("Choferes")').click();

    const inputBusqueda = page.locator('#buscar-empleado-flotilla');
    await expect(inputBusqueda).toBeVisible();
    await expect(page.locator('.cc-modal select[name="rol"]')).not.toBeVisible();
    await expect(page.locator('.cc-modal select[name="puesto"]')).not.toBeVisible();

    await inputBusqueda.fill('TR-002');
    await expect(page.locator('.cc-modal').getByText('Roberto Diaz Medina')).toBeVisible();
    await expect(page.locator('.cc-modal').getByText('Ricardo Rojas Medina')).not.toBeVisible();

    await inputBusqueda.fill('Carlos');
    await expect(page.locator('.cc-modal').getByText('Carlos Gomez')).toBeVisible();
    await expect(page.locator('.cc-modal').getByText('Roberto Diaz Medina')).not.toBeVisible();

    await page.locator('.cc-modal button:has-text("Cancelar")').click();
  });

  test('TC_UI_010_Unidad_FlotillaDesdeBD_SoloKmInicial_EstadoDisponiblePorDefecto', async ({ page }) => {
    await page.route('**/api/Flotilla**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 10, nombre: 'Flotilla Rutas del Pacífico', codigo: 'FLT-PAC-01' },
          { id: 11, nombre: 'Flotilla Noreste Express', codigo: 'FLT-NOR-02' },
        ]),
      });
    });

    await page.route('**/api/Unidad**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('http://localhost:5173/admin/unidades');
    await page.waitForLoadState('networkidle');

    await page.locator('#btn-agregar-unidad').click();
    await expect(page.locator('#modal-uni-titulo')).toHaveText('Nueva unidad');

    const selectFlotilla = page.locator('#fu-flot');
    await expect(selectFlotilla).toBeVisible();
    await expect(selectFlotilla.locator('option')).toContainText(['Flotilla Rutas del Pacífico (FLT-PAC-01)']);

    await expect(page.locator('#fu-kmi')).toBeVisible();
    await expect(page.locator('#fu-kma')).not.toBeVisible();

    const inputEstado = page.locator('#fu-est');
    await expect(inputEstado).toBeVisible();
    await expect(inputEstado).toHaveValue('Disponible');

    await page.locator('.cc-modal button:has-text("Cancelar")').click();
  });

  test('TC_UI_011_Empleado_ExpedienteVistaCompletaYDossierImpresion', async ({ page }) => {
    await page.route('**/api/Empleado**', async (route) => {
      if (route.request().url().includes('/expediente')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 50,
            clave: 'TR-050',
            nombre: 'Fernando',
            apellidoPaterno: 'Valenzuela',
            apellidoMaterno: 'Angulo',
            nombreCompleto: 'Fernando Valenzuela Angulo',
            email: 'fernando.valenzuela@transportesrojas.com',
            telefono: '6675551234',
            sucursalId: 1,
            sucursalNombre: 'Sucursal Culiacán Central',
            sucursalAlias: 'Cul Centro',
            sucursalCodigo: 'SUC-01',
            puestoActual: 'Chofer Foráneo',
            fechaIngreso: '2025-01-10',
            antiguedadTexto: '1 año y 2 meses',
            activo: true,
            createdAt: '2025-01-10T12:00:00Z',
            roles: ['Chofer', 'Operador Federal'],
            trayectoriaLaboral: [
              {
                id: 1,
                puestoId: 1,
                puestoNombre: 'Chofer Foráneo',
                fechaInicio: '2025-01-10',
                fechaFin: null,
                motivo: 'Asignación inicial de ingreso',
              },
            ],
            sucursalesACargo: [],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 50,
              usuarioId: 201,
              nombre: 'Fernando',
              apellidoPaterno: 'Valenzuela',
              apellidoMaterno: 'Angulo',
              telefono: '6675551234',
              email: 'fernando.valenzuela@transportesrojas.com',
              sucursalId: 1,
              sucursalNombre: 'Sucursal Culiacán Central',
              puestoId: 1,
              puestoNombre: 'Chofer Foráneo',
              roles: ['Chofer'],
              fechaIngreso: '2025-01-10',
              activo: true,
            },
          ]),
        });
      }
    });

    await page.goto('http://localhost:5173/admin/empleados');
    await page.waitForLoadState('networkidle');

    await page.locator('#btn-opciones-50').click();
    await page.locator('text=Consultar Expediente').click();
    await expect(page.locator('#modal-expediente-titulo')).toBeVisible();

    const tabCompleto = page.locator('.cc-modal button:has-text("Vista Completa")');
    await expect(tabCompleto).toBeVisible();
    await tabCompleto.click();

    await expect(page.locator('.cc-modal').getByText('Transportes Rojas S.A. de C.V.').first()).toBeVisible();
    await expect(page.locator('.cc-modal').getByText('FOLIO: EXP-TR-050')).toBeVisible();
    await expect(page.locator('.cc-modal').getByText('I. Ficha de Identidad del Empleado')).toBeVisible();
    await expect(page.locator('.cc-modal').getByText('II. Adscripción Oficial y Centro Operativo')).toBeVisible();
    await expect(page.locator('.cc-modal').getByText('III. Trayectoria y Movimientos Laborales')).toBeVisible();
    await expect(page.locator('.cc-modal').getByText('IV. Roles y Privilegios en el Sistema Operativo')).toBeVisible();
    await expect(page.locator('.cc-modal').getByText('V. Constancia de Validación y Conformidad Institucional')).toBeVisible();
    await expect(page.locator('.cc-modal').getByText('Firma del Colaborador')).toBeVisible();
    await expect(page.locator('.cc-modal').getByText('Dirección de Capital Humano', { exact: true })).toBeVisible();

    const contenedorImpresion = page.locator('#expediente-documento-oficial');
    await expect(contenedorImpresion).toBeAttached();

    await page.locator('button:has-text("Cerrar Expediente")').click();
  });

  test('TC_UI_012_UsuarioMenuDesplegable_Y_CambioPassword', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'jefe@transportesrojas.test',
        tipoUsuario: 'Empleado',
        nombreCompleto: 'Ricardo Rojas Medina',
        roles: ['Jefe'],
        permisos: ['*'],
      }));
    });

    await page.route('**/api/Flotilla**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/Sucursal**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/Usuario/cambiar-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mensaje: 'Contraseña actualizada exitosamente.' }),
      });
    });

    await page.goto('http://localhost:5173/admin/flotillas');
    await page.waitForLoadState('networkidle');

    const btnUsuario = page.locator('#btn-usuario-menu');
    await expect(btnUsuario).toBeVisible();
    await expect(page.locator('#menu-usuario-desplegable')).not.toBeVisible();

    await btnUsuario.click();
    const menuDesplegable = page.locator('#menu-usuario-desplegable');
    await expect(menuDesplegable).toBeVisible();
    await expect(menuDesplegable.getByText('jefe@transportesrojas.test')).toBeVisible();
    await expect(page.locator('#btn-opcion-cambiar-password')).toBeVisible();
    await expect(page.locator('#btn-opcion-salir')).toBeVisible();

    await page.locator('#btn-opcion-cambiar-password').click();
    await expect(menuDesplegable).not.toBeVisible();
    await expect(page.locator('#modal-cambiar-password-titulo')).toHaveText('Cambiar Contraseña');

    await page.locator('#pwd-actual').fill('Admin123*');
    await page.locator('#pwd-nueva').fill('NuevaClave456*');
    await page.locator('#pwd-confirmar').fill('NuevaClave456*');

    await page.locator('#btn-guardar-cambio-password').click();

    await expect(page.locator('text=Tu contraseña ha sido actualizada con éxito.')).toBeVisible();
    await expect(page.locator('#modal-cambiar-password-titulo')).not.toBeVisible();
  });

  test('TC_UI_013_FlotillaModal_CentradoSinDesbordeInputs', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token-admin');
      localStorage.setItem('usuario_tipo', 'Empleado');
      localStorage.setItem('usuario_nombre', 'Ricardo Rojas Medina');
      localStorage.setItem('usuario_email', 'jefe@transportesrojas.test');
      localStorage.setItem('usuario_roles', JSON.stringify(['Jefe']));
      localStorage.setItem('usuario_permisos', JSON.stringify(['*']));
    });

    await page.route('**/api/Flotilla**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/Sucursal**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, nombre: 'Sucursal Central Mazatlán', nombreCorto: 'Central', codigo: 'SUC-01' },
        ]),
      });
    });

    await page.route('**/api/Empleado**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, nombre: 'Fernando', apellidoPaterno: 'Valenzuela Angulo', activo: true },
        ]),
      });
    });

    await page.goto('http://localhost:5173/admin/flotillas');
    await page.waitForLoadState('networkidle');

    await page.locator('#btn-agregar-flotilla').click();
    await expect(page.locator('#modal-flt-titulo')).toHaveText('Nueva flotilla');

    const modalBox = await page.locator('.cc-modal').boundingBox();
    expect(modalBox).not.toBeNull();

    const inputCodigoBox = await page.locator('#ff-codigo').boundingBox();
    expect(inputCodigoBox).not.toBeNull();

    const selectJefeBox = await page.locator('#ff-jefe').boundingBox();
    expect(selectJefeBox).not.toBeNull();

    if (modalBox && inputCodigoBox && selectJefeBox) {
      const modalRightEdge = modalBox.x + modalBox.width;
      const inputCodigoRight = inputCodigoBox.x + inputCodigoBox.width;
      const selectJefeRight = selectJefeBox.x + selectJefeBox.width;

      expect(inputCodigoRight).toBeLessThanOrEqual(modalRightEdge);
      expect(selectJefeRight).toBeLessThanOrEqual(modalRightEdge);
    }

    await page.locator('.cc-modal button:has-text("Cancelar")').click();
    await expect(page.locator('#modal-flt-titulo')).not.toBeVisible();
  });
});
