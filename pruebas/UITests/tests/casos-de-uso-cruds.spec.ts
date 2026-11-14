import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  PERSONAS,
  abrirAccionTabla,
  crearEstadoInicial,
  expectMensajeAmigableSinFugas,
  inyectarSesion,
  montarApiSistema,
} from './support/e2eHelpers';

test.describe('Casos de Uso Admin CRUDs, Activación y Guardas RBAC (Suite v3)', () => {
  test('UI_CRUD_001: Puestos CRUD completo y detección de duplicado 409', async ({ page }) => {
    const state = crearEstadoInicial();
    await inyectarSesion(page, PERSONAS.jefe);
    await montarApiSistema(page, state);

    await page.goto(`${BASE_URL}/admin/puestos`);
    await page.locator('#btn-agregar-puesto').click();
    await page.locator('#fp-nombre').fill('Coordinador de Patio QA');
    await page.locator('#fp-desc').fill('Control de andenes');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('tbody')).toContainText(/Coordinador de Patio QA/i);

    await page.locator('#btn-agregar-puesto').click();
    await page.locator('#fp-nombre').fill('Coordinador de Patio QA');
    await page.locator('form button[type="submit"]').click();
    const alertDup = page.locator('[role="alert"]', { hasText: /Ya existe/i }).first();
    await expect(alertDup).toBeVisible();
    expectMensajeAmigableSinFugas(await alertDup.innerText());
    await page.keyboard.press('Escape');

    await abrirAccionTabla(page, 'Coordinador de Patio QA', 'Eliminar');
    await page.locator('#input-confirmar-puesto').fill('confirmar');
    await page.getByRole('button', { name: /Eliminar/i }).last().click();
    await expect(page.locator('tbody')).not.toContainText(/Coordinador de Patio QA/i);
  });

  test('UI_CRUD_002: Catálogo Tipo de Mantenimiento CRUD', async ({ page }) => {
    const state = crearEstadoInicial();
    await inyectarSesion(page, PERSONAS.jefe);
    await montarApiSistema(page, state);

    await page.goto(`${BASE_URL}/admin/tipomantenimiento`);
    await page.locator('#btn-agregar-tipomant').click();
    await page.locator('#ftm-nombre').fill('Servicio de Frenos ABS');
    await page.locator('#ftm-desc').fill('Revisión y cambio de balatas');
    await page.locator('#ftm-km').fill('15000');
    await page.locator('#ftm-aplica').fill('Camión 3.5 Ton');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('tbody')).toContainText(/Servicio de Frenos ABS/i);

    await abrirAccionTabla(page, 'Servicio de Frenos ABS', 'Eliminar');
    await page.locator('#input-confirmar-tm').fill('confirmar');
    await page.getByRole('button', { name: /Sí, eliminar/i }).click();
    await expect(page.locator('tbody tr', { hasText: 'Servicio de Frenos ABS' })).toContainText(/Inactivo/i);
  });

  test('UI_CRUD_003: Sucursales alta con autocompletado SEPOMEX (C.P. 01000) y edición', async ({
    page,
  }) => {
    const state = crearEstadoInicial();
    await inyectarSesion(page, PERSONAS.jefe);
    await montarApiSistema(page, state);

    await page.goto(`${BASE_URL}/admin/sucursales`);
    await page.locator('#btn-agregar-sucursal').click();
    await page.locator('#fs-nombre').fill('Sucursal Sur CDMX QA');
    await page.locator('#fs-alias').fill('San Ángel QA');
    await page.locator('#fs-codigo').fill('SUC-CDMX-QA');
    await page.locator('#fs-tel').fill('5512345678');
    await page.locator('#fs-cp').fill('01000');

    await expect(page.locator('#fs-estado')).toHaveValue(/Ciudad de México/i);
    await expect(page.locator('#fs-municipio')).toHaveValue(/Álvaro Obregón/i);
    await page.locator('#fs-calle').fill('Av. Revolución 1500');
    await page.locator('form button[type="submit"]').click();

    await expect(page.locator('tbody')).toContainText(/Sucursal Sur CDMX QA/i);
  });

  test('UI_CRUD_004: Roles CRUD y asignación de permisos en RolModalPermisos', async ({ page }) => {
    const state = crearEstadoInicial();
    await inyectarSesion(page, PERSONAS.jefe);
    await montarApiSistema(page, state);

    await page.goto(`${BASE_URL}/admin/roles`);
    await page.locator('#btn-agregar-rol').click();
    await page.locator('#fr-nombre').fill('Auditor Calidad QA');
    await page.locator('#fr-desc').fill('Rol de revisión');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('tbody')).toContainText(/Auditor Calidad QA/i);

    await abrirAccionTabla(page, 'Auditor Calidad QA', 'Permisos');
    await expect(page.locator('#modal-permisos-titulo')).toBeVisible();
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole('button', { name: /Guardar Asignación/i }).click();
    await expect(page.locator('[role="alert"]').first()).toContainText(/Permisos/i);
  });

  test('UI_CRUD_005: Clientes creación y edición auditada con motivo obligatorio', async ({ page }) => {
    const state = crearEstadoInicial();
    await inyectarSesion(page, PERSONAS.jefe);
    await montarApiSistema(page, state);

    await page.goto(`${BASE_URL}/admin/clientes`);
    await page.locator('#btn-agregar-cliente').click();
    await page.locator('#nombre').fill('Valeria');
    await page.locator('#apellido-paterno').fill('Quintero');
    await page.locator('#apellido-materno').fill('Sánchez');
    await page.locator('#email').fill('valeria.qa@clientes.mx');
    await page.locator('#telefono').fill('6675551234');
    await page.getByRole('button', { name: /Registrar cliente/i }).click();
    await expect(page.getByRole('button', { name: /Registrar cliente/i })).toBeHidden();
    await page.locator('button[title="Mostrar todos los registros"]').click();
    await expect(page.locator('tbody')).toContainText(/VALERIA/i);

    await abrirAccionTabla(page, 'VALERIA', 'Editar');
    await page.locator('#f-telefono').fill('6675559999');
    await page.locator('#f-motivo').fill('Actualización telefónica solicitada por cliente');
    await page.locator('#btn-guardar-cliente').click();
    await expect(page.locator('tbody')).toContainText('6675559999');
  });

  test('UI_CRUD_006: Empleados alta, cambio de puesto y suspensión/reactivación', async ({ page }) => {
    const state = crearEstadoInicial();
    await inyectarSesion(page, PERSONAS.rh);
    await montarApiSistema(page, state);

    await page.goto(`${BASE_URL}/admin/empleados`);
    await page.locator('#btn-agregar-empleado').click();
    await page.locator('#fe-nombre').fill('Mateo');
    await page.locator('#fe-ap-p').fill('Cebreros');
    await page.locator('#fe-ap-m').fill('Acosta');
    await page.locator('#fe-tel').fill('6678887766');
    await page.locator('#fe-email').fill('mateo.cebreros@transportesrojas.com');
    await page.locator('#fe-suc').click();
    await page.locator('.buscador-sucursal-wrap [role="button"]', { hasText: /Matriz Culiacán/i }).first().click();
    await page.locator('#fe-puesto').selectOption('2');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('tbody')).toContainText(/MATEO/i);

    await abrirAccionTabla(page, 'MATEO', 'Cambiar Puesto');
    await page.locator('#select-nuevo-puesto').selectOption('3');
    await page.locator('#txt-motivo-cambio').fill('Apoyo temporal en mostrador');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('tbody tr', { hasText: 'MATEO' })).toContainText(/Personal de sucursal/i);
  });

  test('UI_AUTH_007: Activación de cuenta de cliente (/activar-cuenta) token inválido y válido', async ({
    page,
  }) => {
    const state = crearEstadoInicial();
    await montarApiSistema(page, state);

    await page.goto(`${BASE_URL}/activar-cuenta?token=TOKEN_INVALIDO_QA`);
    await expect(page.getByRole('heading', { name: /No pudimos activar tu cuenta/i })).toBeVisible();
    const parrafoError = page.getByText(/El token de activación no es válido o ha expirado/i);
    await expect(parrafoError).toBeVisible();
    expectMensajeAmigableSinFugas(await parrafoError.innerText());

    await page.goto(`${BASE_URL}/activar-cuenta?token=TOKEN_VALIDO_ACT_2026`);
    await expect(page.getByRole('heading', { name: /Activación Completada/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ir a Iniciar Sesión/i })).toBeVisible();
  });

  test('UI_RBAC_008: Guardas RBAC bloquean módulos no autorizados renderizando Acceso Denegado o redirigiendo al portal', async ({
    browser,
  }) => {
    const casos: Array<{
      nombre: string;
      persona: typeof PERSONAS.rh;
      rutaProhibida: string;
      expectRedirect?: RegExp;
    }> = [
      { nombre: 'RH no accede a /admin/envios', persona: PERSONAS.rh, rutaProhibida: '/admin/envios' },
      {
        nombre: 'Chofer no accede a /admin/puestos (redirigido a /chofer)',
        persona: PERSONAS.chofer,
        rutaProhibida: '/admin/puestos',
        expectRedirect: /\/chofer/,
      },
      {
        nombre: 'Cliente no accede a /admin/envios',
        persona: PERSONAS.cliente,
        rutaProhibida: '/admin/envios',
      },
    ];

    for (const c of casos) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      await inyectarSesion(page, c.persona);
      await montarApiSistema(page, crearEstadoInicial());
      await page.goto(`${BASE_URL}${c.rutaProhibida}`);
      if (c.expectRedirect) {
        await expect(page, c.nombre).toHaveURL(c.expectRedirect);
      } else {
        await expect(page.getByRole('heading', { name: /Acceso Denegado/i }), c.nombre).toBeVisible();
        await expect(
          page.getByText(
            /No tienes los permisos o roles necesarios para ingresar al módulo|Esta área es de acceso exclusivo para el personal interno/i
          ),
          c.nombre
        ).toBeVisible();
      }
      await ctx.close();
    }
  });
});

