import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  PERSONAS,
  PNG_1X1_BUFFER,
  abrirAccionTabla,
  crearEstadoInicial,
  dibujarFirmaEnCanvas,
  expectMensajeAmigableSinFugas,
  inyectarSesion,
  limpiarSesion,
  montarApiSistema,
} from './support/e2eHelpers';

test.describe('Flujo normal de envío end-to-end (Suite v3)', () => {
  test('UI_FLJ_001: Ciclo completo Cliente -> SEPOMEX -> Recepción -> Ruta -> Chofer (Desvío + PIN + Foto + Firma) -> Rastreo Público', async ({
    browser,
  }) => {
    const state = crearEstadoInicial();
    const hoyIso = new Date().toISOString().slice(0, 10);
    let guiaGenerada = '';

    // Documentación del envío por cliente
    const ctxCliente = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageCliente = await ctxCliente.newPage();
    await inyectarSesion(pageCliente, PERSONAS.cliente);
    await montarApiSistema(pageCliente, state);

    await pageCliente.goto(`${BASE_URL}/cliente/bienvenida`);
    await pageCliente.locator('#btn-nuevo-envio-cliente, #btn-primer-envio-cliente').first().click();

    await expect(pageCliente.locator('#btn-cliente-sucursal-1')).toBeVisible();
    await pageCliente.locator('#btn-cliente-sucursal-1').click();

    await pageCliente.locator('#cliente-destino-cp').fill('80000');
    await expect(pageCliente.locator('#cliente-destino-estado')).toHaveValue(/Sinaloa/i);
    await expect(pageCliente.locator('#cliente-destino-municipio')).toHaveValue(/Culiacán/i);
    await pageCliente.locator('#cliente-destino-colonia').selectOption({ index: 1 });

    await pageCliente.locator('#cliente-destino-calle').fill('Blvd. Emiliano Zapata');
    await pageCliente.locator('#cliente-destino-num-ext').fill('450');
    await pageCliente.locator('#cliente-destino-entre-calles').fill('Entre Morelos y Victoria');
    await pageCliente.locator('#cliente-destino-referencias').fill('Fachada azul');

    await pageCliente.locator('#cliente-env-dest-nombre').fill('Sofía Ramírez Navarro');
    await pageCliente.locator('#cliente-env-dest-telefono').fill('6679876543');
    await pageCliente.locator('#cliente-env-dest-email').fill('sofia@destino.mx');

    await pageCliente.locator('button', { hasText: 'Mediano' }).first().click();
    await pageCliente.locator('#cliente-env-valor').fill('2500');
    await pageCliente.locator('#cliente-env-descripcion').fill('Refacciones industriales E2E');

    await pageCliente.locator('#btn-cliente-guardar-envio').click();
    await expect(pageCliente.locator('#cliente-comprobante-guia')).toBeVisible();
    guiaGenerada = (await pageCliente.locator('#cliente-comprobante-guia').innerText()).trim();
    expect(guiaGenerada).toMatch(/^TR-\d{8}-/);

    await pageCliente.locator('#btn-cliente-finalizar-envio').click();
    await expect(pageCliente.locator(`#lista-mis-envios [data-guia="${guiaGenerada}"]`)).toBeVisible();
    await expect(pageCliente.locator(`#lista-mis-envios [data-guia="${guiaGenerada}"]`)).toContainText(
      'Registrado'
    );

    // Recepción en sucursal
    const ctxSucursal = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageSucursal = await ctxSucursal.newPage();
    await inyectarSesion(pageSucursal, PERSONAS.sucursal);
    await montarApiSistema(pageSucursal, state);

    await pageSucursal.goto(`${BASE_URL}/admin/envios`);
    await expect(pageSucursal.locator('tbody tr', { hasText: guiaGenerada })).toBeVisible();

    await abrirAccionTabla(pageSucursal, guiaGenerada, 'Recibir en sucursal (pesaje)');
    await expect(pageSucursal.locator('#modal-recepcion-envio-titulo')).toBeVisible();
    await pageSucursal.locator('#rec-peso').fill('5.25');
    await pageSucursal.locator('#rec-largo').fill('35');
    await pageSucursal.locator('#rec-ancho').fill('25');
    await pageSucursal.locator('#rec-alto').fill('20');
    await pageSucursal.locator('#rec-sucursal').selectOption('1');
    await pageSucursal.locator('#rec-observaciones').fill('Caja sellada y pesada en mostrador');
    await pageSucursal.locator('#btn-confirmar-recepcion-envio').click();

    await expect(pageSucursal.locator('tbody tr', { hasText: guiaGenerada })).toContainText(
      /En sucursal|Recibido en sucursal/i
    );
    await ctxSucursal.close();

    // Planificación de ruta
    const ctxFlotilla = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageFlotilla = await ctxFlotilla.newPage();
    await inyectarSesion(pageFlotilla, PERSONAS.jefeFlotilla);
    await montarApiSistema(pageFlotilla, state);

    await pageFlotilla.goto(`${BASE_URL}/admin/rutas`);
    await pageFlotilla.locator('#btn-crear-nueva-ruta').click();
    await expect(pageFlotilla.locator('#modal-ruta-envio-titulo')).toBeVisible();

    await expect(pageFlotilla.locator('#asig-chofer')).toBeVisible();
    if ((await pageFlotilla.locator('#asig-flotilla').count()) > 0) {
      await pageFlotilla.locator('#asig-flotilla').selectOption('1');
    }
    await pageFlotilla.locator('#asig-chofer').selectOption('11');
    await pageFlotilla.locator('#asig-unidad').selectOption('10');
    await pageFlotilla.locator('#asig-fecha-ruta').fill(hoyIso);

    const checkEnvio = pageFlotilla
      .locator('label', { hasText: guiaGenerada })
      .locator('input[type="checkbox"]')
      .first();
    await expect(checkEnvio).toBeVisible();
    await checkEnvio.check();

    await pageFlotilla.locator('#btn-confirmar-ruta-envio').click();
    await expect(pageFlotilla.locator('#modal-ruta-envio-titulo')).toBeHidden();
    await ctxFlotilla.close();

    // Salida de ruta y notificación de desvío
    const ctxChofer = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageChofer = await ctxChofer.newPage();
    await inyectarSesion(pageChofer, PERSONAS.chofer);
    await montarApiSistema(pageChofer, state);

    await pageChofer.goto(`${BASE_URL}/chofer`);
    await expect(pageChofer.getByText(guiaGenerada)).toBeVisible();
    await pageChofer.getByRole('button', { name: /Iniciar Recorrido \(Salida\)/i }).click();
    await pageChofer.locator('input[placeholder*="125430"]').fill('15010');
    await pageChofer.getByRole('button', { name: /Confirmar Salida/i }).click();
    await expect(pageChofer.getByText(/En Tránsito Activo/i)).toBeVisible();

    await pageCliente.reload();
    await pageCliente.locator(`#lista-mis-envios [data-guia="${guiaGenerada}"]`).click();
    await expect(pageCliente.locator('#btn-toggle-pin-cliente')).toBeVisible();
    await pageCliente.locator('#btn-toggle-pin-cliente').click();
    await expect(pageCliente.locator('#detalle-cliente-pin-valor')).toContainText(state.pinActual);
    await ctxCliente.close();

    await pageChofer.getByRole('button', { name: /Notificar Desvío Vial/i }).click();
    await pageChofer
      .locator('form select')
      .last()
      .selectOption('Otro motivo operativo de fuerza mayor');
    await pageChofer
      .locator('input[placeholder*="causa del desvío"]')
      .fill('Cierre vial por obra hidráulica');
    await pageChofer
      .locator('input[placeholder*="Pedro Infante"]')
      .fill('Crucero Blvd. Pedro Infante y Zapata');
    await pageChofer
      .locator('textarea[placeholder*="vía alterna"]')
      .fill('Desvío controlado por Blvd. Sánchez Taboada hacia destino final');
    await pageChofer.locator('#afectaEntrega').check();
    await pageChofer.locator('form button[type="submit"]').last().click();
    await expect(
      pageChofer.locator('[role="alert"]', { hasText: /Desvío notificado|Folio/i }).first()
    ).toBeVisible();

    // Validación de entrega con PIN
    await pageChofer.getByRole('button', { name: /Validar Entrega/i }).first().click();
    await expect(pageChofer.locator('#val-pin-seguridad')).toBeVisible();

    await pageChofer.locator('#input-subir-foto').setInputFiles({
      name: 'evidencia-entrega.png',
      mimeType: 'image/png',
      buffer: PNG_1X1_BUFFER,
    });
    await dibujarFirmaEnCanvas(pageChofer, 'canvas');
    await pageChofer.locator('#val-observaciones').fill('Recibido en recepción por destinataria');

    await pageChofer.locator('#val-pin-seguridad').fill('000000');
    await pageChofer.locator('#btn-confirmar-validar-entrega').click();
    const alertaError = pageChofer
      .locator('[role="alert"]', { hasText: /código de seguridad|no es válido/i })
      .first();
    await expect(alertaError).toBeVisible();
    expectMensajeAmigableSinFugas(await alertaError.innerText());

    await pageChofer.locator('#val-pin-seguridad').fill(state.pinActual);
    await pageChofer.locator('#btn-confirmar-validar-entrega').click();
    await expect(pageChofer.locator('#val-pin-seguridad')).toBeHidden();
    await expect(pageChofer.getByText(/Entregado/i).first()).toBeVisible();
    await ctxChofer.close();

    // Consulta en rastreo público
    const ctxPublico = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pagePublico = await ctxPublico.newPage();
    await limpiarSesion(pagePublico);
    await montarApiSistema(pagePublico, state);

    await pagePublico.goto(`${BASE_URL}/login-clientes`);
    await pagePublico.locator('#btn-abrir-rastreo-publico').click();
    await expect(pagePublico.locator('#modal-rastreo-publico')).toBeVisible();
    await pagePublico.locator('#input-guia-publica').fill(guiaGenerada);
    await pagePublico.locator('#btn-rastrear-publico').click();

    await expect(pagePublico.locator('#resultado-rastreo-publico')).toBeVisible();
    const textoRastreo = await pagePublico.locator('#resultado-rastreo-publico').innerText();
    expect(textoRastreo).toMatch(/Entregado/i);
    expect(textoRastreo).not.toContain(state.pinActual);
    await ctxPublico.close();
  });

  test('UI_FLJ_002: Cliente autocancela envío propio cuando aún está en estado registrado', async ({
    page,
  }) => {
    const state = crearEstadoInicial();
    await inyectarSesion(page, PERSONAS.cliente);
    await montarApiSistema(page, state);

    await page.goto(`${BASE_URL}/cliente/bienvenida`);
    await page.locator('#btn-nuevo-envio-cliente, #btn-primer-envio-cliente').first().click();
    await page.locator('#btn-cliente-sucursal-1').click();
    await page.locator('#cliente-destino-cp').fill('80000');
    await expect(page.locator('#cliente-destino-estado')).toHaveValue(/Sinaloa/i);
    await page.locator('#cliente-destino-colonia').selectOption({ index: 1 });
    await page.locator('#cliente-destino-calle').fill('Av. Obregón');
    await page.locator('#cliente-destino-num-ext').fill('120');
    await page.locator('#cliente-destino-entre-calles').fill('Entre Rosales e Hidalgo');
    await page.locator('#cliente-destino-referencias').fill('Edificio esquina');
    await page.locator('#cliente-env-dest-nombre').fill('Pedro López');
    await page.locator('#cliente-env-dest-telefono').fill('6671112233');
    await page.locator('button', { hasText: 'Chico' }).first().click();
    await page.locator('#cliente-env-valor').fill('500');
    await page.locator('#cliente-env-descripcion').fill('Documentos cancelables');
    await page.locator('#btn-cliente-guardar-envio').click();

    const guia = (await page.locator('#cliente-comprobante-guia').innerText()).trim();
    await page.locator('#btn-cliente-finalizar-envio').click();

    await page.locator(`#lista-mis-envios [data-guia="${guia}"]`).click();
    await page.locator('#btn-abrir-cancelar-envio-cliente').click();
    await page.locator('#cliente-motivo-cancelacion').fill('El destinatario reprogramará su compra');
    await page.locator('#btn-confirmar-cancelacion-cliente').click();

    await expect(page.locator(`#lista-mis-envios [data-guia="${guia}"]`)).toContainText(/Cancelado/i);
  });

  test('UI_FLJ_003: Reprogramación rechaza fecha pasada (400) y flujo de devolución hasta cierre devuelto', async ({
    browser,
  }) => {
    const state = crearEstadoInicial();
    const idEnvio = 999;
    const guia = 'TR-20261112-DEV1';
    const ahora = new Date().toISOString();
    const baseEnvio = {
      id: idEnvio,
      guia,
      estado: 'recibido_sucursal',
      remitenteId: 21,
      remitenteNombre: 'CARLOS ALBERTO MENDOZA LÓPEZ',
      remitenteTelefono: '6673124589',
      destinatarioNombre: 'LUCÍA VALDEZ',
      destinatarioTelefono: '6673334455',
      destinoCiudadResumen: 'Culiacán, Sinaloa',
      destinoCodigoPostal: '80000',
      requiereRecoleccion: false,
      sucursalRecepcionId: 1,
      sucursalRecepcionNombre: 'Matriz Culiacán',
      sucursalDestinoId: 1,
      sucursalDestinoNombre: 'Matriz Culiacán',
      pesoKg: 4,
      largoCm: 20,
      anchoCm: 20,
      altoCm: 20,
      descripcion: 'Equipo de cómputo',
      valorDeclarado: 4500,
      intentoReparto: 0,
      flotillaAsignadaNombre: null,
      choferAsignadoNombre: null,
      unidadAsignadaPlacas: null,
      fechaCreacion: ahora,
      fechaEntregaEstimada: new Date(Date.now() + 86400000).toISOString(),
    };
    state.envios.push(baseEnvio);
    state.detalles[idEnvio] = { ...baseEnvio, eventos: [], citasRecoleccion: [], rutasAsignadas: [], entregas: [] };

    // Reprogramación
    const ctxAdmin = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageAdmin = await ctxAdmin.newPage();
    await inyectarSesion(pageAdmin, PERSONAS.administrativo);
    await montarApiSistema(pageAdmin, state);

    await pageAdmin.goto(`${BASE_URL}/admin/envios`);
    await abrirAccionTabla(pageAdmin, guia, 'Reprogramar entrega');
    await expect(pageAdmin.locator('#modal-estado-especial-titulo')).toBeVisible();
    await pageAdmin.locator('#esp-nueva-fecha').fill('2020-01-01T10:00');
    await pageAdmin.locator('#esp-motivo-reprog').fill('Prueba de fecha histórica inválida');
    await pageAdmin.locator('#btn-confirmar-estado-especial').click();

    const alertaFechaPasada = pageAdmin.locator('[role="alert"]').first();
    await expect(alertaFechaPasada).toBeVisible();
    expectMensajeAmigableSinFugas(await alertaFechaPasada.innerText());

    const manana = new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 16);
    await pageAdmin.locator('#esp-nueva-fecha').fill(manana);
    await pageAdmin.locator('#esp-motivo-reprog').fill('Cliente solicitó entrega vespertina mañana');
    await pageAdmin.locator('#btn-confirmar-estado-especial').click();
    await expect(pageAdmin.locator('tbody tr', { hasText: guia })).toContainText(/Reprogramado/i);
    await ctxAdmin.close();

    // Devolución al remitente
    const ctxSuc = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageSuc = await ctxSuc.newPage();
    await inyectarSesion(pageSuc, PERSONAS.sucursal);
    await montarApiSistema(pageSuc, state);

    await pageSuc.goto(`${BASE_URL}/admin/envios`);
    await abrirAccionTabla(pageSuc, guia, 'Iniciar devolución');
    await pageSuc.locator('#esp-motivo-devolucion').fill('Remitente acudió a solicitar retorno');
    await pageSuc.locator('#btn-confirmar-estado-especial').click();
    await expect(pageSuc.locator('tbody tr', { hasText: guia })).toContainText(/En devolución/i);

    await abrirAccionTabla(pageSuc, guia, 'Confirmar devolución');
    await expect(pageSuc.locator('#esp-conformidad-remitente')).toBeVisible();
    await pageSuc.locator('#esp-conformidad-remitente').selectOption('si');
    await pageSuc.locator('#btn-confirmar-estado-especial').click();
    await expect(pageSuc.locator('tbody tr', { hasText: guia })).toContainText(/Devuelto/i);
    await ctxSuc.close();
  });
});

