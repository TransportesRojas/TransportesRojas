import { test, expect, type Page, type Route } from '@playwright/test';

const BASE = 'http://localhost:5173';
const GUIA = 'TR-20261107-7XGT';
const PIN = '198918';

function crearToken(payload: Record<string, unknown>): string {
  const exp = Math.floor(Date.now() / 1000) + 86400;
  return (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    Buffer.from(JSON.stringify({ exp, ...payload })).toString('base64') +
    '.signature'
  );
}

async function iniciarSesion(
  page: Page,
  usuario: Record<string, unknown>,
  claims: Record<string, unknown>
) {
  const token = crearToken(claims);
  await page.addInitScript(
    ([t, u]) => {
      localStorage.setItem('token', t as string);
      localStorage.setItem('user', JSON.stringify(u));
    },
    [token, usuario] as const
  );
}

const envioListado = (estado = 'registrado') => ({
  id: 101,
  guia: GUIA,
  estado,
  remitenteId: 7,
  remitenteNombre: 'CARLOS ALBERTO MENDOZA LÓPEZ',
  remitenteTelefono: '6673124589',
  destinatarioNombre: 'MARIANA ESQUIVEL ORTEGA',
  destinatarioTelefono: '3312345678',
  destinatarioEmail: null,
  destinoCiudadResumen: 'GUADALAJARA, JALISCO',
  destinoCodigoPostal: '44100',
  requiereRecoleccion: false,
  sucursalRecepcionId: 7,
  sucursalRecepcionNombre: 'MATRIZ CULIACÁN',
  sucursalDestinoId: 8,
  sucursalDestinoNombre: 'PLAZA GUADALAJARA',
  pesoKg: 3.85,
  largoCm: 40,
  anchoCm: 30,
  altoCm: 20,
  descripcion: 'EQUIPO DE CÓMPUTO PORTÁTIL',
  valorDeclarado: null,
  intentoReparto: 0,
  flotillaAsignadaNombre: null,
  choferAsignadoNombre: null,
  unidadAsignadaPlacas: null,
  fechaCreacion: new Date().toISOString(),
  fechaEntregaEstimada: new Date(Date.now() + 3 * 86400000).toISOString(),
});

const envioDetalle = (estado = 'registrado', conPin = true) => ({
  ...envioListado(estado),
  remitenteEmail: 'carlos.mendoza@clientesrojas.mx',
  destinatarioClienteId: null,
  direccionOrigen: null,
  direccionDestino: {
    calle: 'AV. JUÁREZ',
    numeroExterior: '450',
    colonia: 'GUADALAJARA CENTRO',
    municipio: 'GUADALAJARA',
    estado: 'JALISCO',
    codigoPostal: '44100',
  },
  recepcion: null,
  citasRecoleccion: [],
  rutasAsignadas: [],
  entregas: [],
  eventos: [
    {
      id: 1,
      estado: 'registrado',
      descripcion: 'ENVÍO DOCUMENTADO PARA RECEPCIÓN EN SUCURSAL MATRIZ CULIACÁN.',
      registradoPorNombre: 'SISTEMA',
      fechaEvento: new Date().toISOString(),
    },
  ],
  codigoSeguridadCliente: conPin ? PIN : null,
});

const rastreoPublico = (estado = 'registrado') => ({
  guia: GUIA,
  estado,
  requiereRecoleccion: false,
  origenResumen: 'CULIACÁN, SINALOA',
  destinoResumen: 'GUADALAJARA, JALISCO',
  sucursalRecepcionNombre: 'MATRIZ CULIACÁN',
  sucursalDestinoNombre: 'PLAZA GUADALAJARA',
  pesoKg: 3.85,
  descripcionPaquete: 'EQUIPO DE CÓMPUTO PORTÁTIL',
  intentoReparto: 0,
  fechaCreacion: new Date().toISOString(),
  fechaEntregaEstimada: new Date(Date.now() + 3 * 86400000).toISOString(),
  eventos: [
    {
      estado: 'registrado',
      descripcion: 'ENVÍO DOCUMENTADO PARA RECEPCIÓN EN SUCURSAL MATRIZ CULIACÁN.',
      fechaEvento: new Date().toISOString(),
    },
  ],
});

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function simularApiEnvios(
  page: Page,
  opciones: { lista?: unknown[]; estadoDetalle?: string; rastreoExiste?: boolean } = {}
) {
  const { lista = [envioListado()], estadoDetalle = 'registrado', rastreoExiste = true } = opciones;

  await page.route('**/api/CatalogoGeografico/**', (route) => json(route, []));

  await page.route('**/api/Envio**', async (route) => {
    const req = route.request();
    const { pathname } = new URL(req.url());

    if (pathname.includes('/rastreo/')) {
      return rastreoExiste
        ? json(route, rastreoPublico())
        : json(route, { mensaje: 'No se encontró ningún envío con esa guía.' }, 404);
    }
    if (pathname.endsWith('/cancelar') && req.method() === 'POST') {
      return json(route, { ...envioDetalle('cancelado'), codigoSeguridadCliente: null });
    }
    if (/\/api\/Envio\/\d+$/.test(pathname)) {
      return json(route, envioDetalle(estadoDetalle));
    }
    if (pathname.endsWith('/api/Envio') && req.method() === 'GET') {
      return json(route, lista);
    }
    return route.continue();
  });
}

const sesionCliente = (page: Page) =>
  iniciarSesion(
    page,
    {
      id: 21,
      email: 'carlos.mendoza@clientesrojas.mx',
      tipoUsuario: 'Cliente',
      nombreCompleto: 'CARLOS ALBERTO MENDOZA LÓPEZ',
      roles: ['Cliente'],
      permisos: [],
    },
    { cliente_id: '7', usuario_id: '21', tipo_usuario: 'Cliente' }
  );

const sesionEmpleado = (page: Page, roles: string[]) =>
  iniciarSesion(
    page,
    {
      id: 5,
      email: 'operador@transportesrojas.com',
      tipoUsuario: 'Empleado',
      nombreCompleto: 'Operador de Pruebas',
      roles,
      permisos: [],
    },
    { usuario_id: '5', empleado_id: '5', tipo_usuario: 'Empleado' }
  );

test.describe('Transportes Rojas - E2E Sistema Integral de Envíos', () => {
  // Rastreo público
  test('TC_ENV_UI_001_RastreoPublico_SinSesion_MuestraEstadoYNoExponePin', async ({ page }) => {
    await simularApiEnvios(page);
    await page.goto(`${BASE}/login-clientes`);

    await page.locator('#btn-abrir-rastreo-publico').click();
    await expect(page.locator('#modal-rastreo-publico')).toBeVisible();

    await page.locator('#input-guia-publica').fill(GUIA.toLowerCase());
    await page.locator('#btn-rastrear-publico').click();

    const resultado = page.locator('#resultado-rastreo-publico');
    await expect(resultado).toBeVisible();
    await expect(resultado).toContainText(GUIA);
    await expect(resultado).toContainText('Registrado');
    await expect(resultado).toContainText('GUADALAJARA, JALISCO');
    await expect(resultado).not.toContainText(PIN);
  });

  test('TC_ENV_UI_002_RastreoPublico_GuiaInexistente_MuestraError', async ({ page }) => {
    await simularApiEnvios(page, { rastreoExiste: false });
    await page.goto(`${BASE}/login-clientes`);

    await page.locator('#btn-abrir-rastreo-publico').click();
    await page.locator('#input-guia-publica').fill('TR-19990101-ZZZZ');
    await page.locator('#btn-rastrear-publico').click();

    await expect(page.locator('#error-rastreo-publico')).toBeVisible();
    await expect(page.locator('#resultado-rastreo-publico')).toHaveCount(0);
  });

  // Portal de clientes
  test('TC_ENV_UI_003_PortalCliente_MisEnvios_PinOcultoYRevelable', async ({ page }) => {
    await sesionCliente(page);
    await simularApiEnvios(page);
    await page.goto(`${BASE}/cliente/bienvenida`);

    const item = page.locator(`#lista-mis-envios [data-guia="${GUIA}"]`);
    await expect(item).toBeVisible();
    await item.click();

    await expect(page.locator('#resultado-rastreo-cliente')).toContainText(GUIA);

    const pin = page.locator('#detalle-cliente-pin-valor');
    await expect(pin).toHaveText('••••••');
    await page.locator('#btn-toggle-pin-cliente').click();
    await expect(pin).toHaveText(PIN);
    await page.locator('#btn-toggle-pin-cliente').click();
    await expect(pin).toHaveText('••••••');
  });

  test('TC_ENV_UI_004_PortalCliente_CancelarEnvioRegistrado_MuestraToastYConfirmacion', async ({ page }) => {
    await sesionCliente(page);
    await simularApiEnvios(page);
    await page.goto(`${BASE}/cliente/bienvenida`);

    await page.locator(`#lista-mis-envios [data-guia="${GUIA}"]`).click();
    await page.locator('#btn-abrir-cancelar-envio-cliente').click();

    await page.locator('#btn-confirmar-cancelacion-cliente').click();
    await expect(page.locator('#cliente-motivo-cancelacion')).toBeVisible();

    await page.locator('#cliente-motivo-cancelacion').fill('Error en el domicilio capturado');
    const peticionCancelar = page.waitForRequest(
      (r) => r.url().endsWith('/api/Envio/101/cancelar') && r.method() === 'POST'
    );
    await page.locator('#btn-confirmar-cancelacion-cliente').click();
    const req = await peticionCancelar;
    expect(req.postDataJSON()).toEqual({ motivo: 'Error en el domicilio capturado' });

    await expect(page.getByText(/fue cancelado correctamente/i)).toBeVisible();
    await expect(page.locator('#cliente-motivo-cancelacion')).toHaveCount(0);
  });

  test('TC_ENV_UI_005_PortalCliente_EnvioEnRuta_NoOfreceCancelacion', async ({ page }) => {
    await sesionCliente(page);
    await simularApiEnvios(page, { lista: [envioListado('en_ruta')], estadoDetalle: 'en_ruta' });
    await page.goto(`${BASE}/cliente/bienvenida`);

    await page.locator(`#lista-mis-envios [data-guia="${GUIA}"]`).click();
    await expect(page.locator('#detalle-cliente-pin-valor')).toBeVisible();
    await expect(page.locator('#btn-abrir-cancelar-envio-cliente')).toHaveCount(0);
  });

  test('TC_ENV_UI_006_PortalCliente_SinEnvios_MuestraCtaYAbreModalNuevoEnvio', async ({ page }) => {
    await sesionCliente(page);
    await simularApiEnvios(page, { lista: [] });
    await page.goto(`${BASE}/cliente/bienvenida`);

    const cta = page.locator('#btn-primer-envio-cliente');
    await expect(cta).toBeVisible();
    await cta.click();

    await expect(page.locator('#modal-cliente-nuevo-envio-titulo')).toContainText('Realizar Nuevo Envío');
    await expect(page.locator('#env-remitente')).toHaveCount(0);

    await expect(page.locator('#btn-cliente-modalidad-sucursal')).toBeVisible();
    await page.locator('#btn-cliente-modalidad-recoleccion').click();
    await expect(page.locator('#cliente-env-fecha-recoleccion')).toBeVisible();
  });

  test('TC_ENV_UI_007_PortalCliente_NoPermiteEntrarAlPanelInterno', async ({ page }) => {
    await sesionCliente(page);
    await simularApiEnvios(page);
    await page.goto(`${BASE}/admin/envios`);

    await expect(page.getByRole('heading', { name: 'Acceso Denegado' })).toBeVisible();
    await expect(page.locator('#btn-agregar-envio')).toHaveCount(0);
  });

  // Panel interno
  test('TC_ENV_UI_008_PanelInterno_RH_RecibeAccesoDenegado', async ({ page }) => {
    await sesionEmpleado(page, ['RH']);
    await simularApiEnvios(page);
    await page.goto(`${BASE}/admin/envios`);

    await expect(page.getByRole('heading', { name: 'Acceso Denegado' })).toBeVisible();
    await expect(page.locator('#btn-agregar-envio')).toHaveCount(0);
    await expect(page.getByText(GUIA)).toHaveCount(0);
  });

  test('TC_ENV_UI_009_PanelInterno_PersonalAdministrativo_VeBandejaYBotonNuevoEnvio', async ({ page }) => {
    await sesionEmpleado(page, ['Personal administrativo']);
    await simularApiEnvios(page);
    await page.goto(`${BASE}/admin/envios`);

    await expect(page.getByText(GUIA).first()).toBeVisible();
    await expect(page.locator('#btn-agregar-envio')).toBeVisible();
    await expect(page.getByText('PLAZA GUADALAJARA').first()).toBeVisible();
  });
});

