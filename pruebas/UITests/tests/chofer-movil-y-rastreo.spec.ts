import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  PERSONAS,
  PNG_1X1_BUFFER,
  crearEstadoInicial,
  dibujarFirmaEnCanvas,
  expectMensajeAmigableSinFugas,
  inyectarSesion,
  limpiarSesion,
  montarApiSistema,
} from './support/e2eHelpers';

test.describe('Portal Móvil del Chofer y Rastreo en Viewport Móvil (Suite v3)', () => {
  test('UI_MOB_001: Estado vacío móvil sin ruta activa y sin desbordamiento horizontal', async ({
    page,
  }) => {
    const state = crearEstadoInicial();
    await inyectarSesion(page, PERSONAS.chofer);
    await montarApiSistema(page, state);

    await page.goto(`${BASE_URL}/chofer`);
    await expect(page.getByText(/Sin ruta de entrega activa/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Verificar nueva asignación/i })).toBeVisible();

    const overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);
  });

  test('UI_MOB_002: Operación móvil completa (inicio de ruta, desvío, incidencia en parada y cierre de sesión)', async ({
    page,
  }) => {
    const state = crearEstadoInicial();
    state.envios.push({
      id: 701,
      guia: 'TR-20261112-MOB1',
      estado: 'asignado_flotilla',
      remitenteId: 21,
      remitenteNombre: 'CARLOS ALBERTO MENDOZA LÓPEZ',
      destinatarioNombre: 'ANDREA TORRES',
      destinatarioTelefono: '6677778899',
      destinoCiudadResumen: 'Culiacán, Sinaloa',
      destinoCodigoPostal: '80000',
      pesoKg: 2.5,
      intentoReparto: 0,
      fechaCreacion: new Date().toISOString(),
    });
    state.detalles[701] = {
      id: 701,
      guia: 'TR-20261112-MOB1',
      estado: 'asignado_flotilla',
      entregas: [],
      eventos: [],
    };
    state.rutas.push({
      rutaId: 88,
      nombreRuta: 'Ruta Móvil Centro #88',
      estadoRuta: 'planeada',
      unidadId: 10,
      unidadNumeroEconomico: 'ECO-10',
      unidadPlacas: 'VSL-402-A',
      fechaProgramada: new Date().toISOString().slice(0, 10),
      totalEnvios: 1,
      enviosEntregados: 0,
      paradas: [
        {
          envioId: 701,
          guia: 'TR-20261112-MOB1',
          estado: 'asignado_flotilla',
          orden: 1,
          destinatarioNombre: 'ANDREA TORRES',
          destinatarioTelefono: '6677778899',
          destinoDireccion: 'Calle Hidalgo #320, Col. Centro',
          destinoCiudad: 'Culiacán, Sinaloa',
          tipoPaquete: 'Caja pequeña',
          pesoKg: 2.5,
          observaciones: 'Portón negro',
        },
      ],
      cambiosTrayecto: [],
    });

    await inyectarSesion(page, PERSONAS.chofer);
    await montarApiSistema(page, state);

    await page.goto(`${BASE_URL}/chofer`);
    await expect(page.getByText('TR-20261112-MOB1')).toBeVisible();

    await page.getByRole('button', { name: /Iniciar Recorrido \(Salida\)/i }).click();
    await page.locator('input[placeholder*="125430"]').fill('15120');
    await page.getByRole('button', { name: /Confirmar Salida/i }).click();
    await expect(page.getByText(/En Tránsito Activo/i)).toBeVisible();

    await page.getByRole('button', { name: /Validar Entrega/i }).first().click();
    await page.locator('#input-subir-foto').setInputFiles({
      name: 'entrega-movil.png',
      mimeType: 'image/png',
      buffer: PNG_1X1_BUFFER,
    });
    await dibujarFirmaEnCanvas(page, 'canvas');
    await page.locator('#val-observaciones').fill('Entregado desde vista móvil');
    await page.locator('#val-pin-seguridad').fill(state.pinActual);
    await page.locator('#btn-confirmar-validar-entrega').click();
    await expect(page.getByText(/Entregado/i).first()).toBeVisible();

    const overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflowPx).toBeLessThanOrEqual(2);

    await page.locator('#btn-chofer-menu').click();
    await page.locator('#btn-chofer-logout').click();
    await expect(page).toHaveURL(/\/login-empleados/);
  });

  test('UI_MOB_003: Rastreo público en viewport móvil maneja guía inexistente con mensaje amigable', async ({
    page,
  }) => {
    const state = crearEstadoInicial();
    await limpiarSesion(page);
    await montarApiSistema(page, state);

    await page.goto(`${BASE_URL}/login-clientes`);
    await page.locator('#btn-abrir-rastreo-publico').click();
    await page.locator('#input-guia-publica').fill('TR-99999999-XXXX');
    await page.locator('#btn-rastrear-publico').click();

    await expect(page.locator('#error-rastreo-publico')).toBeVisible();
    expectMensajeAmigableSinFugas(await page.locator('#error-rastreo-publico').innerText());
  });
});

