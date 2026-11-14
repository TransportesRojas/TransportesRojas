import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  PERSONAS,
  crearEstadoInicial,
  expectMensajeAmigableSinFugas,
  inyectarSesion,
  limpiarSesion,
  montarApiSistema,
} from './support/e2eHelpers';

test.describe('Sanitización de Errores (EH-05..EH-08) y Anti-Spam Toast/Submit (EH-09)', () => {
  test('UI_ERR_001 (EH-05): Sanitiza errores 500 de PostgreSQL, 502 HTML de gateway y corte de red', async ({
    browser,
  }) => {
    // Error 500 con fuga SQL
    const ctx500 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p500 = await ctx500.newPage();
    await inyectarSesion(p500, PERSONAS.jefe);
    await montarApiSistema(p500, crearEstadoInicial(), (route) => {
      const req = route.request();
      if (req.url().includes('/Puesto') && req.method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            mensaje:
              'Npgsql.PostgresException (0x80004005): 23505: duplicate key value violates unique constraint "PK_puestos" SELECT * FROM puestos Stack trace at System.DbUpdateException',
          }),
        });
        return true;
      }
      return false;
    });

    await p500.goto(`${BASE_URL}/admin/puestos`);
    await p500.locator('#btn-agregar-puesto').click();
    await p500.locator('#fp-nombre').fill('Prueba Sanitize 500');
    await p500.locator('form button[type="submit"]').click();

    const alerta500 = p500.locator('[role="alert"]').first();
    await expect(alerta500).toBeVisible();
    expectMensajeAmigableSinFugas(await alerta500.innerText());
    await ctx500.close();

    // Error 502 HTML de proxy
    const ctx502 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p502 = await ctx502.newPage();
    await inyectarSesion(p502, PERSONAS.jefe);
    await montarApiSistema(p502, crearEstadoInicial(), (route) => {
      if (route.request().url().includes('/Puesto') && route.request().method() === 'GET') {
        route.fulfill({
          status: 502,
          contentType: 'text/html',
          body: '<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head><body><h1>502 Bad Gateway</h1></body></html>',
        });
        return true;
      }
      return false;
    });

    await p502.goto(`${BASE_URL}/admin/puestos`);
    const alerta502 = p502.locator('[role="alert"]').first();
    await expect(alerta502).toBeVisible();
    expectMensajeAmigableSinFugas(await alerta502.innerText());
    await ctx502.close();

    // Fallo de red
    const ctxNet = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pNet = await ctxNet.newPage();
    await inyectarSesion(pNet, PERSONAS.jefe);
    await montarApiSistema(pNet, crearEstadoInicial(), (route) => {
      if (route.request().url().includes('/Puesto') && route.request().method() === 'GET') {
        route.abort('failed');
        return true;
      }
      return false;
    });

    await pNet.goto(`${BASE_URL}/admin/puestos`);
    const alertaNet = pNet.locator('[role="alert"]').first();
    await expect(alertaNet).toBeVisible();
    expectMensajeAmigableSinFugas(await alertaNet.innerText());
    await ctxNet.close();
  });

  test('UI_ERR_002 (EH-06): Logins de empleado y cliente ante HTTP 401 conservan aviso seguro sin fugas', async ({
    browser,
  }) => {
    const ctxEmp = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pEmp = await ctxEmp.newPage();
    await limpiarSesion(pEmp);
    await montarApiSistema(pEmp, crearEstadoInicial(), (route) => {
      if (route.request().url().includes('/Autenticacion/login-empleado')) {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ mensaje: 'Credenciales inválidas.' }),
        });
        return true;
      }
      return false;
    });

    await pEmp.goto(`${BASE_URL}/login-empleados`);
    await pEmp.locator('#emp').fill('9999');
    await pEmp.locator('#pwd').fill('Incorrecta#123');
    await pEmp.locator('button[type="submit"]').click();
    const errEmp = pEmp.getByText(/Credenciales incorrectas/i);
    await expect(errEmp).toBeVisible();
    expectMensajeAmigableSinFugas(await errEmp.innerText());
    await ctxEmp.close();

    const ctxCli = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pCli = await ctxCli.newPage();
    await limpiarSesion(pCli);
    await montarApiSistema(pCli, crearEstadoInicial(), (route) => {
      if (route.request().url().includes('/Autenticacion/login-cliente')) {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ mensaje: 'Correo, teléfono o contraseña incorrectos.' }),
        });
        return true;
      }
      return false;
    });

    await pCli.goto(`${BASE_URL}/login-clientes`);
    await pCli.locator('#identifier').fill('noexiste@clientes.mx');
    await pCli.locator('#pwd').fill('MalPassword#1');
    await pCli.locator('form button[type="submit"]').click();
    const errCli = pCli.locator('.lrc-shake');
    await expect(errCli).toBeVisible();
    expectMensajeAmigableSinFugas(await errCli.innerText());
    await ctxCli.close();
  });

  test('UI_ERR_003 (EH-08): Fallback automático a /Envio/:id/asignar-flotilla cuando /planificar-ruta responde 404', async ({
    page,
  }) => {
    const state = crearEstadoInicial();
    state.envios.push({
      id: 850,
      guia: 'TR-20261112-FBK1',
      estado: 'recibido_sucursal',
      remitenteId: 21,
      remitenteNombre: 'CARLOS ALBERTO MENDOZA LÓPEZ',
      destinatarioNombre: 'MARCO ANTONIO',
      destinatarioTelefono: '6672221100',
      destinoCiudadResumen: 'Culiacán, Sinaloa',
      destinoCodigoPostal: '80000',
      pesoKg: 6,
      largoCm: 30,
      anchoCm: 20,
      altoCm: 20,
      descripcion: 'Caja fallback QA',
      intentoReparto: 0,
      fechaCreacion: new Date().toISOString(),
    });
    state.detalles[850] = { ...state.envios[0], eventos: [] };

    let fallbackInvocado = false;
    await inyectarSesion(page, PERSONAS.jefeFlotilla);
    await montarApiSistema(page, state, (route) => {
      const req = route.request();
      if (req.url().endsWith('/Envio/planificar-ruta') && req.method() === 'POST') {
        route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
        return true;
      }
      if (req.url().includes('/Envio/850/asignar-flotilla') && req.method() === 'POST') {
        fallbackInvocado = true;
        const det = state.detalles[850] as Record<string, unknown>;
        det.estado = 'asignado_flotilla';
        det.flotillaAsignadaNombre = 'Flotilla Centro Culiacán';
        det.choferAsignadoNombre = 'LUIS FERNANDO SALAZAR';
        det.unidadAsignadaPlacas = 'VSL-402-A';
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(det) });
        return true;
      }
      return false;
    });

    await page.goto(`${BASE_URL}/admin/rutas`);
    await page.locator('#btn-crear-nueva-ruta').click();
    await expect(page.locator('#asig-chofer')).toBeVisible();
    if ((await page.locator('#asig-flotilla').count()) > 0) {
      await page.locator('#asig-flotilla').selectOption('1');
    }
    await page.locator('#asig-chofer').selectOption('11');
    await page.locator('#asig-unidad').selectOption('10');
    await page.locator('label', { hasText: 'TR-20261112-FBK1' }).locator('input[type="checkbox"]').check();
    await page.locator('#btn-confirmar-ruta-envio').click();

    await expect(page.locator('#modal-ruta-envio-titulo')).toBeHidden();
    expect(fallbackInvocado).toBe(true);
  });

  test('UI_TOAST_004 (EH-09): Deduplicación de notificaciones anti-spam, tope de 3 toasts y re-disparo tras cooldown', async ({
    page,
  }) => {
    const state = crearEstadoInicial();
    await inyectarSesion(page, PERSONAS.jefe);
    await montarApiSistema(page, state);

    await page.goto(`${BASE_URL}/admin/envios`);
    const btnRefrescar = page.locator('button[title="Actualizar bandeja de envíos"]');
    await expect(btnRefrescar).toBeVisible();

    for (let i = 0; i < 5; i++) {
      await btnRefrescar.click();
    }

    const alerts = page.locator('[role="alert"]');
    await expect(alerts.first()).toBeVisible();
    const countIdenticos = await page.locator('[role="alert"]', {
      hasText: 'Bandeja de envíos actualizada.',
    }).count();
    expect(countIdenticos).toBe(1);
    expect(await alerts.count()).toBeLessThanOrEqual(3);

    await page.waitForTimeout(3600);
    await btnRefrescar.click();
    await expect(
      page.locator('[role="alert"]', { hasText: 'Bandeja de envíos actualizada.' })
    ).toHaveCount(1);
  });

  test('UI_SPAM_005 (EH-09): Bloqueo de doble envío ante clics rápidos consecutivos en formulario', async ({
    page,
  }) => {
    const state = crearEstadoInicial();
    let postsCliente = 0;

    await inyectarSesion(page, PERSONAS.jefe);
    await montarApiSistema(page, state, async (route) => {
      const req = route.request();
      if (req.url().endsWith('/Cliente') && req.method() === 'POST') {
        postsCliente++;
        await new Promise((r) => setTimeout(r, 350));
        return false;
      }
      return false;
    });

    await page.goto(`${BASE_URL}/admin/clientes`);
    await page.locator('#btn-agregar-cliente').click();
    await page.locator('#nombre').fill('Doble');
    await page.locator('#apellido-paterno').fill('Clic');
    await page.locator('#email').fill('dobleclic@qa.mx');
    await page.locator('#telefono').fill('6671239876');

    const btnGuardar = page.getByRole('button', { name: /Registrar cliente/i });
    await btnGuardar.click();
    await btnGuardar.click({ force: true });

    await expect(page.getByRole('button', { name: /Registrar cliente/i })).toBeHidden();
    await page.locator('button[title="Mostrar todos los registros"]').click();
    await expect(page.locator('tbody')).toContainText(/DOBLE/i);
    expect(postsCliente).toBe(1);
  });
});

