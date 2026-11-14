import { test, expect, type Locator } from '@playwright/test';
import {
  BASE_URL,
  PERSONAS,
  abrirAccionTabla,
  crearEstadoInicial,
  inyectarSesion,
  montarApiSistema,
  type EstadoSimulacion,
} from './support/e2eHelpers';

async function assertSoloAceptaNumericos(
  input: Locator,
  tecleoMixto: string,
  esperadoTecleo: string,
  pegaConLetras: string,
  esperadoPega: string
) {
  await expect(input).toBeVisible();
  await expect(input).not.toHaveAttribute('type', 'number');
  await input.click();
  await input.fill('');
  await input.pressSequentially(tecleoMixto);
  await expect(input).toHaveValue(esperadoTecleo);
  await input.fill(pegaConLetras);
  await expect(input).toHaveValue(esperadoPega);
}

async function assertNombreSinNumeros(
  input: Locator,
  tecleoConNumeros: string,
  esperadoTecleo: string,
  pegaConNumeros: string,
  esperadoPega: string
) {
  await expect(input).toBeVisible();
  await input.click();
  await input.fill('');
  await input.pressSequentially(tecleoConNumeros);
  await expect(input).toHaveValue(esperadoTecleo);
  await input.fill(pegaConNumeros);
  await expect(input).toHaveValue(esperadoPega);
}

function seedEnvioConEstado(
  state: EstadoSimulacion,
  id: number,
  guia: string,
  estado: string,
  numeroExterior: string | null = '450',
  calle = 'Blvd. Emiliano Zapata'
) {
  const ahora = new Date().toISOString();
  const base = {
    id,
    guia,
    estado,
    remitenteId: 21,
    remitenteNombre: 'CARLOS ALBERTO MENDOZA LÓPEZ',
    remitenteTelefono: '6673124589',
    destinatarioNombre: 'ANDREA TORRES',
    destinatarioTelefono: '6677778899',
    destinoCiudadResumen: 'Culiacán, Sinaloa',
    destinoCodigoPostal: '80000',
    requiereRecoleccion: false,
    sucursalRecepcionId: 1,
    sucursalRecepcionNombre: 'Matriz Culiacán',
    sucursalDestinoId: 1,
    sucursalDestinoNombre: 'Matriz Culiacán',
    pesoKg: 3.5,
    largoCm: 30,
    anchoCm: 25,
    altoCm: 20,
    descripcion: 'Paquete QA',
    valorDeclarado: 1500,
    intentoReparto: 0,
    fechaCreacion: ahora,
    fechaEntregaEstimada: new Date(Date.now() + 86400000).toISOString(),
  };
  state.envios.push(base);
  state.detalles[id] = {
    ...base,
    direccionDestino: {
      asentamientoId: 5001,
      localidadId: 1001,
      estadoId: 25,
      municipioId: 25006,
      codigoPostal: '80000',
      estado: 'Sinaloa',
      municipio: 'Culiacán',
      localidad: 'Culiacán Rosales',
      colonia: 'Centro',
      calle,
      numeroExterior,
    },
    eventos: [],
    citasRecoleccion: [],
    rutasAsignadas: [],
    entregas: [],
  };
}

function seedRutaParaChofer(
  state: EstadoSimulacion,
  rutaId: number,
  envioId: number,
  guia: string,
  estadoRuta: 'planeada' | 'en_curso' = 'planeada'
) {
  const estadoEnvio = estadoRuta === 'en_curso' ? 'en_ruta' : 'asignado_flotilla';
  seedEnvioConEstado(state, envioId, guia, estadoEnvio);
  state.rutas.push({
    rutaId,
    nombreRuta: `Ruta Centro #${rutaId}`,
    estadoRuta,
    unidadId: 10,
    unidadNumeroEconomico: 'ECO-10',
    unidadPlacas: 'VSL-402-A',
    fechaProgramada: new Date().toISOString().slice(0, 10),
    totalEnvios: 1,
    enviosEntregados: 0,
    paradas: [
      {
        envioId,
        guia,
        estado: estadoEnvio,
        orden: 1,
        destinatarioNombre: 'ANDREA TORRES',
        destinatarioTelefono: '6677778899',
        destinoDireccion: 'Calle Hidalgo #320, Col. Centro',
        destinoCiudad: 'Culiacán, Sinaloa',
        tipoPaquete: 'Paquetería',
        pesoKg: 3.5,
        observaciones: 'Portón negro',
      },
    ],
    cambiosTrayecto: [],
  });
}

test.describe('Validaciones Numéricas, Estado Residual en Modales, S/N y Cierre Odómetro (Todos los Componentes)', () => {
  test('UI_CMP_001: Limpieza de estado residual al cancelar, presionar Escape o cambiar modo en modales y confirmaciones', async ({
    browser,
  }) => {
    const state = crearEstadoInicial();
    seedRutaParaChofer(state, 91, 901, 'TR-20261112-EST1', 'planeada');

    // Gestión de acceso en empleados
    const ctxRh = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageRh = await ctxRh.newPage();
    await inyectarSesion(pageRh, PERSONAS.rh);
    await montarApiSistema(pageRh, state);

    await pageRh.goto(`${BASE_URL}/admin/empleados`);
    await abrirAccionTabla(pageRh, 'LUIS FERNANDO', 'Dar de baja definitiva');
    const txtMotivoAcceso = pageRh.locator('form textarea').first();
    const inpConfirmAcceso = pageRh.locator('input[placeholder="confirmar"]').first();
    await txtMotivoAcceso.fill('Motivo borrador confidencial que no debe persistir');
    await inpConfirmAcceso.fill('confirmar');
    await pageRh.getByRole('button', { name: 'Cancelar' }).first().click();

    await abrirAccionTabla(pageRh, 'LUIS FERNANDO', 'Dar de baja definitiva');
    await expect(txtMotivoAcceso).toHaveValue('');
    await expect(inpConfirmAcceso).toHaveValue('');

    await txtMotivoAcceso.fill('Rescisión temporal de prueba QA');
    await inpConfirmAcceso.fill('confirmar');
    await pageRh.locator('form button[type="submit"]').last().click();
    await expect(txtMotivoAcceso).toBeHidden();

    const btnTodosQuick = pageRh.getByRole('button', { name: 'Todos', exact: true });
    if (await btnTodosQuick.isVisible()) {
      await btnTodosQuick.click();
    }
    await expect(pageRh.locator('tbody tr', { hasText: 'LUIS FERNANDO' })).toContainText(/Inactivo/i);
    await abrirAccionTabla(pageRh, 'LUIS FERNANDO', 'Reactivar acceso');
    await expect(pageRh.locator('form textarea').first()).toHaveValue('');
    await pageRh.getByRole('button', { name: 'Cancelar' }).first().click();

    // Cambio de contraseña
    await pageRh.locator('#btn-usuario-menu').click();
    await pageRh.locator('#btn-opcion-cambiar-password').click();
    await expect(pageRh.locator('#modal-cambiar-password-titulo')).toBeVisible();
    await pageRh.locator('#pwd-actual').fill('ClaveAntigua123!');
    await pageRh.locator('#pwd-nueva').fill('ClaveNueva456!');
    await pageRh.locator('#pwd-confirmar').fill('ClaveNueva456!');
    await pageRh.getByRole('button', { name: 'Cancelar' }).last().click();
    await expect(pageRh.locator('#modal-cambiar-password-titulo')).toBeHidden();

    await pageRh.locator('#btn-usuario-menu').click();
    await pageRh.locator('#btn-opcion-cambiar-password').click();
    await expect(pageRh.locator('#pwd-actual')).toHaveValue('');
    await expect(pageRh.locator('#pwd-nueva')).toHaveValue('');
    await expect(pageRh.locator('#pwd-confirmar')).toHaveValue('');
    await ctxRh.close();

    // Baja de clientes y cancelación del portal
    const ctxJefe = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageJefe = await ctxJefe.newPage();
    await inyectarSesion(pageJefe, PERSONAS.jefe);
    await montarApiSistema(pageJefe, state);
    await pageJefe.goto(`${BASE_URL}/admin/clientes`);
    await abrirAccionTabla(pageJefe, 'CARLOS ALBERTO', 'Dar de baja');
    await pageJefe.locator('#input-confirmar').fill('conf');
    await pageJefe.keyboard.press('Escape');
    await expect(pageJefe.locator('#input-confirmar')).toBeHidden();
    await abrirAccionTabla(pageJefe, 'CARLOS ALBERTO', 'Dar de baja');
    await expect(pageJefe.locator('#input-confirmar')).toHaveValue('');
    await ctxJefe.close();

    const ctxCli = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageCli = await ctxCli.newPage();
    await inyectarSesion(pageCli, PERSONAS.cliente);
    await montarApiSistema(pageCli, state);
    await pageCli.goto(`${BASE_URL}/cliente/bienvenida`);
    await pageCli.locator('#lista-mis-envios [data-guia="TR-20261112-EST1"]').click();
    state.envios[0].estado = 'registrado';
    state.detalles[901].estado = 'registrado';
    await pageCli.reload();
    await pageCli.locator('#lista-mis-envios [data-guia="TR-20261112-EST1"]').click();
    await pageCli.locator('#btn-abrir-cancelar-envio-cliente').click();
    await pageCli.locator('#cliente-motivo-cancelacion').fill('Motivo temporal de prueba');
    await pageCli.getByRole('button', { name: 'Volver' }).click();
    await pageCli.locator('#btn-abrir-cancelar-envio-cliente').click();
    await expect(pageCli.locator('#cliente-motivo-cancelacion')).toHaveValue('');
    await ctxCli.close();

    // Limpieza en portal del chofer
    const ctxChf = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageChf = await ctxChf.newPage();
    await inyectarSesion(pageChf, PERSONAS.chofer);
    await montarApiSistema(pageChf, state);
    await pageChf.goto(`${BASE_URL}/chofer`);
    await pageChf.locator('#btn-chofer-iniciar-ruta').click();
    await pageChf.locator('#chofer-km-inicial-input').fill('15999');
    await pageChf.getByRole('button', { name: 'Cancelar' }).last().click();
    await pageChf.locator('#btn-chofer-iniciar-ruta').click();
    await expect(pageChf.locator('#chofer-km-inicial-input')).toHaveValue('');
    await pageChf.locator('#chofer-km-inicial-input').fill('15010');
    await pageChf.getByRole('button', { name: /Confirmar Salida/i }).click();
    await expect(pageChf.locator('#btn-chofer-notificar-desvio')).toBeVisible();

    await pageChf.locator('#btn-chofer-notificar-desvio').click();
    await pageChf.locator('form select').last().selectOption('Otro motivo operativo de fuerza mayor');
    await pageChf.locator('input[placeholder*="causa del desvío"]').fill('Obra carretera sin enviar');
    await pageChf.locator('input[placeholder*="Pedro Infante"]').fill('Crucero temporal');
    await pageChf.locator('textarea[placeholder*="vía alterna"]').fill('Ruta alterna temporal');
    await pageChf.getByRole('button', { name: 'Cancelar' }).last().click();
    await pageChf.locator('#btn-chofer-notificar-desvio').click();
    await expect(pageChf.locator('input[placeholder*="causa del desvío"]')).toBeHidden();
    await expect(pageChf.locator('input[placeholder*="Pedro Infante"]')).toHaveValue('');
    await expect(pageChf.locator('textarea[placeholder*="vía alterna"]')).toHaveValue('');
    await ctxChf.close();
  });

  test('UI_CMP_002: Campos numéricos rechazan letras, palabras y signos (+/-e) en todos los formularios del sistema', async ({
    browser,
  }) => {
    const state = crearEstadoInicial();
    seedRutaParaChofer(state, 92, 902, 'TR-20261112-NUM1', 'planeada');
    seedEnvioConEstado(state, 903, 'TR-20261112-REC1', 'registrado');

    // Clientes
    const ctxJefe = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageJefe = await ctxJefe.newPage();
    await inyectarSesion(pageJefe, PERSONAS.jefe);
    await montarApiSistema(pageJefe, state);

    await pageJefe.goto(`${BASE_URL}/admin/clientes`);
    await pageJefe.locator('#btn-agregar-cliente').click();
    await assertNombreSinNumeros(pageJefe.locator('#nombre'), 'María123 José4', 'María José', '7Ana8 Lucía9', 'Ana Lucía');
    await assertNombreSinNumeros(pageJefe.locator('#apellido-paterno'), 'Núñez5-Díaz6', 'Núñez-Díaz', '0Peña1-2', 'Peña-');
    await assertNombreSinNumeros(pageJefe.locator('#apellido-materno'), 'De3 la Cruz4', 'De la Cruz', '9O\'Connor0', 'O\'Connor');
    await assertSoloAceptaNumericos(pageJefe.locator('#telefono'), '667abcXYZ+-e1234', '6671234', 'tel6679998877abc', '6679998877');
    await pageJefe.keyboard.press('Escape');
    await abrirAccionTabla(pageJefe, 'CARLOS ALBERTO', 'Editar');
    await assertNombreSinNumeros(pageJefe.locator('#f-nombre'), 'Carlos123 Alberto4', 'Carlos Alberto', '5José6 Ángel7', 'José Ángel');
    await assertNombreSinNumeros(pageJefe.locator('#f-ap-paterno'), 'Mendoza8', 'Mendoza', '7Núñez8-9', 'Núñez-');
    await assertNombreSinNumeros(pageJefe.locator('#f-ap-materno'), 'López0', 'López', '1Quintero2', 'Quintero');
    await assertSoloAceptaNumericos(pageJefe.locator('#f-telefono'), '55no123456', '55123456', '667abc3124589', '6673124589');
    await pageJefe.locator('#btn-cancelar-modal').click();

    // Empleados
    await pageJefe.goto(`${BASE_URL}/admin/empleados`);
    await pageJefe.locator('#btn-agregar-empleado').click();
    await assertNombreSinNumeros(pageJefe.locator('#fe-nombre'), 'Luis123 Fernando4', 'Luis Fernando', '8Rosa9 Elena0', 'Rosa Elena');
    await assertNombreSinNumeros(pageJefe.locator('#fe-ap-p'), 'Gómez5-Ríos6', 'Gómez-Ríos', '3Vázquez4', 'Vázquez');
    await assertNombreSinNumeros(pageJefe.locator('#fe-ap-m'), '7Soto8', 'Soto', '1De la O2', 'De la O');
    await assertSoloAceptaNumericos(pageJefe.locator('#fe-tel'), '667letras88', '66788', '6678887766abc', '6678887766');
    await pageJefe.getByRole('button', { name: 'Cancelar' }).first().click();

    // Sucursales
    await pageJefe.goto(`${BASE_URL}/admin/sucursales`);
    await pageJefe.locator('#btn-agregar-sucursal').click();
    await assertSoloAceptaNumericos(pageJefe.locator('#fs-tel'), 'abc551234', '551234', '5512345678xyz', '5512345678');
    await assertSoloAceptaNumericos(pageJefe.locator('#fs-cp'), 'cp80a00', '8000', 'xyz01000', '01000');
    await pageJefe.keyboard.press('Escape');

    // Tipos de mantenimiento
    await pageJefe.goto(`${BASE_URL}/admin/tipomantenimiento`);
    await pageJefe.locator('#btn-agregar-tipomant').click();
    await assertSoloAceptaNumericos(pageJefe.locator('#ftm-km'), '10mil+-e500', '10500', 'abc15000km', '15000');
    await pageJefe.keyboard.press('Escape');

    // Unidades
    await pageJefe.goto(`${BASE_URL}/admin/flotillas`);
    await pageJefe.getByRole('button', { name: 'Unidades' }).click();
    await pageJefe.locator('#btn-agregar-unidad').click();
    await assertSoloAceptaNumericos(pageJefe.locator('#uni-anio'), '20abc24e-', '2024', 'anio2025x', '2025');
    await assertSoloAceptaNumericos(pageJefe.locator('#uni-capacidad'), '15ab00.5e+', '1500.5', 'cap2500.75kg', '2500.75');
    await assertSoloAceptaNumericos(pageJefe.locator('#uni-odometro'), '12xyz340.25', '12340.25', 'km15000.5', '15000.5');
    await pageJefe.keyboard.press('Escape');
    await ctxJefe.close();

    // Envíos admin
    const ctxAdm = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageAdm = await ctxAdm.newPage();
    await inyectarSesion(pageAdm, PERSONAS.administrativo);
    await montarApiSistema(pageAdm, state);
    await pageAdm.goto(`${BASE_URL}/admin/envios`);
    await pageAdm.locator('#btn-agregar-envio').click();
    await assertSoloAceptaNumericos(pageAdm.locator('#env-destinatario-telefono'), '667palabras12', '66712', '667abc9876543', '6679876543');
    await assertSoloAceptaNumericos(pageAdm.locator('#env-destino-cp'), 'cp80b00', '8000', '80abc000', '80000');
    await assertSoloAceptaNumericos(pageAdm.locator('#env-peso'), '4.5abc-e', '4.5', '12.5kg', '12.5');
    await assertSoloAceptaNumericos(pageAdm.locator('#env-largo'), '35cm-e+', '35', '40.5cm', '40.5');
    await assertSoloAceptaNumericos(pageAdm.locator('#env-ancho'), '25cm-e+', '25', '30.5cm', '30.5');
    await assertSoloAceptaNumericos(pageAdm.locator('#env-alto'), '20cm-e+', '20', '22.5cm', '22.5');
    await assertSoloAceptaNumericos(pageAdm.locator('#env-valor-declarado'), '$15ab00.50', '1500.50', 'mxn2500.75', '2500.75');
    await ctxAdm.close();

    // Recepción en sucursal
    const ctxSuc = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageSuc = await ctxSuc.newPage();
    await inyectarSesion(pageSuc, PERSONAS.sucursal);
    await montarApiSistema(pageSuc, state);
    await pageSuc.goto(`${BASE_URL}/admin/envios`);
    await abrirAccionTabla(pageSuc, 'TR-20261112-REC1', 'Recibir en sucursal (pesaje)');
    await assertSoloAceptaNumericos(pageSuc.locator('#rec-peso'), '5.25kg', '5.25', 'abc6.75kg', '6.75');
    await assertSoloAceptaNumericos(pageSuc.locator('#rec-largo'), '35abc', '35', '40.2x', '40.2');
    await assertSoloAceptaNumericos(pageSuc.locator('#rec-ancho'), '25abc', '25', '30.2x', '30.2');
    await assertSoloAceptaNumericos(pageSuc.locator('#rec-alto'), '20abc', '20', '25.2x', '25.2');
    await ctxSuc.close();

    // Portal de clientes
    const ctxCli = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageCli = await ctxCli.newPage();
    await inyectarSesion(pageCli, PERSONAS.cliente);
    await montarApiSistema(pageCli, state);
    await pageCli.goto(`${BASE_URL}/cliente/bienvenida`);
    await pageCli.locator('#btn-nuevo-envio-cliente, #btn-primer-envio-cliente').first().click();
    await pageCli.locator('#btn-cliente-sucursal-1').click();
    await assertSoloAceptaNumericos(pageCli.locator('#cliente-destino-cp'), 'cp80abc00', '8000', 'xyz80000', '80000');
    await assertSoloAceptaNumericos(pageCli.locator('#cliente-env-dest-telefono'), '667tel9876', '6679876', '667xyz9876543', '6679876543');
    await assertSoloAceptaNumericos(pageCli.locator('#cliente-env-valor'), 'valor950.5e', '950.5', '$2500.25', '2500.25');
    await ctxCli.close();

    // Portal de chofer
    const ctxChf = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageChf = await ctxChf.newPage();
    await inyectarSesion(pageChf, PERSONAS.chofer);
    await montarApiSistema(pageChf, state);
    await pageChf.goto(`${BASE_URL}/chofer`);
    await pageChf.locator('#btn-chofer-iniciar-ruta').click();
    await assertSoloAceptaNumericos(pageChf.locator('#chofer-km-inicial-input'), '15abc010.5e-', '15010.5', 'km15025.5', '15025.5');
    await pageChf.getByRole('button', { name: /Confirmar Salida/i }).click();
    await expect(pageChf.getByText(/En Tránsito Activo/i)).toBeVisible();

    await pageChf.getByRole('button', { name: /Validar Entrega/i }).first().click();
    await assertSoloAceptaNumericos(pageChf.locator('#val-pin-seguridad'), 'pin48ab29e+-10', '482910', 'abc123456xyz', '123456');
    await pageChf.getByRole('button', { name: 'Cancelar' }).last().click();

    await pageChf.locator('#btn-chofer-cierre-odometro').click();
    await assertSoloAceptaNumericos(pageChf.locator('#cierre-km-final'), 'km15abc200.5e', '15200.5', 'odo15250.25', '15250.25');
    await ctxChf.close();
  });

  test('UI_CMP_003: NumeroExterior opcional (vacío y S/N) en ClienteModalNuevoEnvio y EnvioModalCrear con formato limpio en detalle', async ({
    browser,
  }) => {
    const state = crearEstadoInicial();

    // Envío desde portal cliente sin número exterior
    const ctxCli = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageCli = await ctxCli.newPage();
    await inyectarSesion(pageCli, PERSONAS.cliente);
    await montarApiSistema(pageCli, state);
    await pageCli.goto(`${BASE_URL}/cliente/bienvenida`);

    await pageCli.locator('#btn-nuevo-envio-cliente, #btn-primer-envio-cliente').first().click();
    await pageCli.locator('#btn-cliente-sucursal-1').click();
    await pageCli.locator('#cliente-destino-cp').fill('80000');
    await expect(pageCli.locator('#cliente-destino-estado')).toHaveValue(/Sinaloa/i);
    await pageCli.locator('#cliente-destino-colonia').selectOption({ index: 1 });
    await pageCli.locator('#cliente-destino-calle').fill('Brecha al Río');
    await pageCli.locator('#cliente-destino-num-ext').fill('');
    await pageCli.locator('#cliente-destino-entre-calles').fill('Entre Norte y Sur');
    await pageCli.locator('#cliente-destino-referencias').fill('Casa sin placa metálica');
    await pageCli.locator('#cliente-env-dest-nombre').fill('Elena Morales');
    await pageCli.locator('#cliente-env-dest-telefono').fill('6671234567');
    await pageCli.locator('button', { hasText: 'Chico' }).first().click();
    await pageCli.locator('#cliente-env-valor').fill('600');
    await pageCli.locator('#cliente-env-descripcion').fill('Envío domicilio vacío');
    await pageCli.locator('#btn-cliente-guardar-envio').click();
    await expect(pageCli.locator('#cliente-comprobante-guia')).toBeVisible();
    await pageCli.locator('#btn-cliente-finalizar-envio').click();
    await ctxCli.close();

    // Envío administrativo con S/N y comprobación en detalle
    const ctxAdm = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageAdm = await ctxAdm.newPage();
    await inyectarSesion(pageAdm, PERSONAS.administrativo);
    await montarApiSistema(pageAdm, state);
    await pageAdm.goto(`${BASE_URL}/admin/envios`);
    await pageAdm.locator('#btn-agregar-envio').click();

    await pageAdm.locator('#env-buscar-remitente').fill('CARLOS');
    await pageAdm.getByRole('button', { name: /CARLOS ALBERTO MENDOZA/i }).first().click();
    await pageAdm.locator('#env-destino-cp').fill('80000');
    await expect(pageAdm.locator('#env-destino-estado')).toHaveValue(/Sinaloa/i);
    await pageAdm.locator('#env-destino-colonia').selectOption({ index: 1 });
    await pageAdm.locator('#env-destino-calle').fill('Camino Ejidal Sur');
    await pageAdm.locator('#env-destino-num-ext').fill('S/N');
    await pageAdm.locator('#env-destino-entre-calles').fill('Entre Juárez e Hidalgo');
    await pageAdm.locator('#env-destino-referencias').fill('Portón azul agrícola');
    await pageAdm.locator('#env-destinatario-nombre').fill('Raúl Jiménez');
    await pageAdm.locator('#env-destinatario-telefono').fill('6672223344');
    await pageAdm.locator('#env-peso').fill('3.5');
    await pageAdm.locator('#env-largo').fill('30');
    await pageAdm.locator('#env-ancho').fill('20');
    await pageAdm.locator('#env-alto').fill('15');
    await pageAdm.locator('#env-descripcion').fill('Refacción agrícola S/N');
    await pageAdm.locator('#btn-guardar-nuevo-envio').click();

    await expect(pageAdm.locator('#comprobante-guia-valor')).toBeVisible();
    const guiaSN = (await pageAdm.locator('#comprobante-guia-valor').innerText()).trim();
    await pageAdm.locator('#btn-finalizar-comprobante-envio').click();

    await pageAdm.locator('tbody tr button', { hasText: guiaSN }).first().click();
    await pageAdm.getByRole('button', { name: /Direcciones/i }).click();
    const contenedorDir = pageAdm.getByText(/Camino Ejidal Sur/i).locator('..');
    await expect(contenedorDir).toContainText(/Camino Ejidal Sur S\/N/i);
    await expect(contenedorDir).not.toContainText('#S/N');
    await ctxAdm.close();
  });

  test('UI_CMP_004: Cierre de Odómetro del Día conectado en PortalChofer y /admin/rutas, y botón "Limpiar todos" restablece filtros en Clientes y Empleados', async ({
    browser,
  }) => {
    const state = crearEstadoInicial();
    seedRutaParaChofer(state, 93, 904, 'TR-20261112-CIERRE1', 'en_curso');
    state.clientes.push({
      id: 22,
      usuarioId: 2022,
      nombre: 'CLIENTE INACTIVO QA',
      apellidoPaterno: 'PRUEBA',
      apellidoMaterno: 'FILTRO',
      telefono: '6679990001',
      email: 'inactivo@clientes.mx',
      activo: false,
      motivoEdicion: null,
    });
    state.empleados.push({
      id: 16,
      usuarioId: 1016,
      nombre: 'EMPLEADO INACTIVO QA',
      apellidoPaterno: 'BAJA',
      apellidoMaterno: 'FILTRO',
      telefono: '6679990002',
      email: 'baja.qa@transportesrojas.com',
      sucursalId: 1,
      sucursalNombre: 'Matriz Culiacán',
      puestoId: 3,
      puestoNombre: 'Personal de sucursal',
      roles: ['Personal de sucursal'],
      estadoAcceso: 'baja',
      activo: false,
      fechaIngreso: '2026-01-10',
    });

    // Cierre desde portal de chofer
    const ctxChf = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageChf = await ctxChf.newPage();
    await inyectarSesion(pageChf, PERSONAS.chofer);
    await montarApiSistema(pageChf, state);
    await pageChf.goto(`${BASE_URL}/chofer`);
    await pageChf.locator('#btn-chofer-cierre-odometro').click();
    await expect(pageChf.locator('#modal-cierre-odometro-titulo')).toBeVisible();
    await expect(pageChf.locator('#cierre-unidad')).toHaveValue('10');
    await pageChf.locator('#cierre-km-final').fill('15095');
    await pageChf.locator('#cierre-observaciones').fill('Fin de jornada en patio Culiacán');
    await pageChf.locator('form button[type="submit"]').last().click();
    await expect(pageChf.locator('#modal-cierre-odometro-titulo')).toBeHidden();
    expect(Number(state.unidades[0].kmOdometroActual)).toBe(15095);
    await ctxChf.close();

    // Cierre desde gestión de rutas
    const ctxFlt = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageFlt = await ctxFlt.newPage();
    await inyectarSesion(pageFlt, PERSONAS.jefeFlotilla);
    await montarApiSistema(pageFlt, state);
    await pageFlt.goto(`${BASE_URL}/admin/rutas`);
    await pageFlt.locator('#btn-cierre-odometro-rutas').click();
    await expect(pageFlt.locator('#modal-cierre-odometro-titulo')).toBeVisible();
    await pageFlt.locator('#cierre-unidad').selectOption('10');
    await pageFlt.locator('#cierre-km-final').fill('15150');
    await pageFlt.locator('form button[type="submit"]').last().click();
    await expect(pageFlt.locator('#modal-cierre-odometro-titulo')).toBeHidden();
    expect(Number(state.unidades[0].kmOdometroActual)).toBe(15150);
    await ctxFlt.close();

    // Limpieza de filtros en clientes y empleados
    const ctxJefe = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageJefe = await ctxJefe.newPage();
    await inyectarSesion(pageJefe, PERSONAS.jefe);
    await montarApiSistema(pageJefe, state);

    for (const caso of [
      { url: '/admin/clientes', textoActivo: 'CARLOS ALBERTO', textoInactivo: 'CLIENTE INACTIVO QA' },
      { url: '/admin/empleados', textoActivo: 'LUIS FERNANDO', textoInactivo: 'EMPLEADO INACTIVO QA' },
    ]) {
      await pageJefe.goto(`${BASE_URL}${caso.url}`);
      await pageJefe.locator('button[title="Abrir panel de filtros preestablecidos"]').click();
      await pageJefe.getByLabel('Filtrar por Estado').selectOption('no');
      await expect(pageJefe.locator('tbody')).toContainText(caso.textoInactivo);
      await expect(pageJefe.locator('tbody')).not.toContainText(caso.textoActivo);

      await pageJefe.getByRole('button', { name: 'Limpiar todos' }).click();
      await expect(pageJefe.locator('tbody')).toContainText(caso.textoActivo);
      await expect(pageJefe.locator('tbody')).toContainText(caso.textoInactivo);
    }
    await ctxJefe.close();
  });
});

