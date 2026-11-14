import { expect, type Page, type Route } from '@playwright/test';

export const BASE_URL = 'http://localhost:5173';

export const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2k0AAAAASUVORK5CYII=';
export const PNG_1X1_BUFFER = Buffer.from(PNG_1X1_BASE64, 'base64');

export interface UsuarioSesionMock {
  id: number;
  email: string;
  tipoUsuario: 'Empleado' | 'Cliente';
  nombreCompleto: string;
  nombre?: string;
  roles: string[];
  permisos: string[];
  puestoActual?: string | null;
  sucursal?: string | null;
  sucursalId?: number | null;
  requiereCambioPassword?: boolean;
  empleadoOClienteId?: number | null;
}

export function crearJwtPrueba(claims: Record<string, unknown>): string {
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ exp, ...claims })).toString('base64url');
  return `${header}.${body}.firma-qa`;
}

export async function inyectarSesion(
  page: Page,
  usuario: UsuarioSesionMock,
  claims: Record<string, unknown> = {}
) {
  const token = crearJwtPrueba({
    usuario_id: String(usuario.id),
    email: usuario.email,
    tipo_usuario: usuario.tipoUsuario,
    empleado_id:
      usuario.tipoUsuario === 'Empleado' ? String(usuario.empleadoOClienteId ?? usuario.id) : undefined,
    cliente_id:
      usuario.tipoUsuario === 'Cliente' ? String(usuario.empleadoOClienteId ?? usuario.id) : undefined,
    ...claims,
  });

  await page.addInitScript(
    ([t, u]) => {
      localStorage.setItem('token', t as string);
      localStorage.setItem('user', JSON.stringify(u));
    },
    [token, usuario] as const
  );
}

export async function limpiarSesion(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });
}

export const jsonResponse = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: body === undefined ? '' : JSON.stringify(body),
  });

export const emptyResponse = (route: Route, status = 204) =>
  route.fulfill({ status, body: '' });

export function expectMensajeAmigableSinFugas(texto: string) {
  const limpio = texto.trim();
  expect(limpio.length).toBeGreaterThan(3);
  expect(limpio.length).toBeLessThanOrEqual(260);
  const patronesProhibidos = [
    /PostgresException/i,
    /Npgsql/i,
    /DbUpdateException/i,
    /Stack trace/i,
    /System\.\w+Exception/i,
    /<!DOCTYPE/i,
    /<html/i,
    /\bSELECT\s+.+\s+FROM\b/i,
    /\bINSERT\s+INTO\b/i,
    /23505|23503|42P01|ECONNREFUSED/i,
  ];
  for (const rx of patronesProhibidos) {
    expect(limpio, `Texto filtró detalle técnico (${rx}): ${limpio}`).not.toMatch(rx);
  }
}

export const SEPOMEX_POR_CP: Record<string, Record<string, unknown>> = {
  '80000': {
    codigoPostal: '80000',
    estadoId: 25,
    estadoClave: '25',
    estadoNombre: 'Sinaloa',
    estadoAbreviatura: 'Sin.',
    municipioId: 25006,
    municipioNombre: 'Culiacán',
    ciudad: 'Culiacán Rosales',
    zona: 'Urbano',
    localidadSugeridaId: 1001,
    latitudSugerida: 24.8091,
    longitudSugerida: -107.394,
    colonias: [
      { id: 5001, nombre: 'Centro', tipoAsentamiento: 'Colonia' },
      { id: 5002, nombre: 'Las Quintas', tipoAsentamiento: 'Fraccionamiento' },
    ],
    coberturaSugerida: {
      sucursalId: 1,
      sucursalNombre: 'Sucursal Matriz Culiacán',
      distanciaKm: 1.2,
    },
  },
  '01000': {
    codigoPostal: '01000',
    estadoId: 9,
    estadoClave: '09',
    estadoNombre: 'Ciudad de México',
    estadoAbreviatura: 'CDMX',
    municipioId: 9010,
    municipioNombre: 'Álvaro Obregón',
    ciudad: 'Ciudad de México',
    zona: 'Urbano',
    localidadSugeridaId: 2001,
    latitudSugerida: 19.3497,
    longitudSugerida: -99.1904,
    colonias: [{ id: 6001, nombre: 'San Ángel', tipoAsentamiento: 'Colonia' }],
    coberturaSugerida: null,
  },
};

export const SUCURSALES_BASE = [
  {
    id: 1,
    nombre: 'SUCURSAL MATRIZ CULIACÁN',
    nombreCorto: 'Matriz Culiacán',
    codigo: 'SUC-CLN-01',
    telefono: '6671002030',
    email: 'culiacan@transportesrojas.com',
    activo: true,
    municipio: 'Culiacán',
    estado: 'Sinaloa',
    latitud: 24.8091,
    longitud: -107.394,
    cobertura: 'Culiacán, Navolato, Costa Rica',
    direccionCompleta: 'Av. Álvaro Obregón 100, Centro, Culiacán, Sinaloa',
    horarios: [],
  },
  {
    id: 2,
    nombre: 'SUCURSAL MAZATLÁN PUERTO',
    nombreCorto: 'Zona Dorada',
    codigo: 'SUC-MZT-01',
    telefono: '6692003040',
    email: 'mazatlan@transportesrojas.com',
    activo: true,
    municipio: 'Mazatlán',
    estado: 'Sinaloa',
    latitud: 23.2494,
    longitud: -106.4111,
    cobertura: 'Mazatlán, Concordia',
    direccionCompleta: 'Av. Camarón Sábalo 200, Zona Dorada, Mazatlán, Sinaloa',
    horarios: [],
  },
];

export interface EstadoSimulacion {
  envios: Record<string, unknown>[];
  detalles: Record<number, Record<string, unknown>>;
  rutas: Record<string, unknown>[];
  cambiosRuta: Record<string, unknown>[];
  puestos: Record<string, unknown>[];
  tiposMantenimiento: Record<string, unknown>[];
  roles: Record<string, unknown>[];
  permisos: Record<string, unknown>[];
  empleados: Record<string, unknown>[];
  clientes: Record<string, unknown>[];
  sucursales: Record<string, unknown>[];
  flotillas: Record<string, unknown>[];
  unidades: Record<string, unknown>[];
  pinActual: string;
  ultimoId: number;
}

export function crearEstadoInicial(): EstadoSimulacion {
  return {
    pinActual: '482910',
    ultimoId: 500,
    sucursales: [...SUCURSALES_BASE],
    puestos: [
      { id: 1, nombre: 'Gerente General', descripcion: 'Dirección operativa' },
      { id: 2, nombre: 'Chofer', descripcion: 'Operador de ruta y reparto' },
      { id: 3, nombre: 'Personal de sucursal', descripcion: 'Atención y pesaje en mostrador' },
    ],
    tiposMantenimiento: [
      {
        id: 1,
        nombre: 'Afinación Mayor',
        descripcion: 'Cambio de filtros, bujías y aceite',
        kmIntervalo: 10000,
        aplicaTipoVehiculo: 'Camioneta Van',
        activo: true,
      },
    ],
    permisos: [
      { id: 1, codigo: 'envio.ver', nombre: 'Ver envíos', modulo: 'Envíos', descripcion: 'Consultar envíos' },
      { id: 2, codigo: 'envio.validar_entrega', nombre: 'Validar entrega', modulo: 'Envíos', descripcion: 'Validar PIN y entrega' },
      { id: 3, codigo: 'ruta.planificar', nombre: 'Planificar ruta', modulo: 'Rutas', descripcion: 'Despacho de rutas' },
    ],
    roles: [
      { id: 1, nombre: 'Jefe', descripcion: 'Acceso gerencial' },
      { id: 2, nombre: 'Chofer', descripcion: 'Acceso móvil de reparto' },
      { id: 3, nombre: 'Personal de sucursal', descripcion: 'Operación de mostrador' },
    ],
    empleados: [
      {
        id: 11,
        usuarioId: 1011,
        nombre: 'LUIS FERNANDO',
        apellidoPaterno: 'SALAZAR',
        apellidoMaterno: 'MEZA',
        telefono: '6672223344',
        email: 'chofer.luis@transportesrojas.com',
        sucursalId: 1,
        sucursalNombre: 'Matriz Culiacán',
        puestoId: 2,
        puestoNombre: 'Chofer',
        roles: ['Chofer'],
        estadoAcceso: 'activo',
        activo: true,
        fechaIngreso: '2026-01-15',
      },
      {
        id: 12,
        usuarioId: 1012,
        nombre: 'MARÍA JOSÉ',
        apellidoPaterno: 'IBARRA',
        apellidoMaterno: 'RODRÍGUEZ',
        telefono: '6674445566',
        email: 'sucursal.maria@transportesrojas.com',
        sucursalId: 1,
        sucursalNombre: 'Matriz Culiacán',
        puestoId: 3,
        puestoNombre: 'Personal de sucursal',
        roles: ['Personal de sucursal'],
        estadoAcceso: 'activo',
        activo: true,
        fechaIngreso: '2026-01-20',
      },
    ],
    clientes: [
      {
        id: 21,
        usuarioId: 2021,
        nombre: 'CARLOS ALBERTO',
        apellidoPaterno: 'MENDOZA',
        apellidoMaterno: 'LÓPEZ',
        telefono: '6673124589',
        email: 'carlos.mendoza@clientesrojas.mx',
        activo: true,
        motivoEdicion: null,
      },
    ],
    flotillas: [
      {
        id: 1,
        nombre: 'Flotilla Centro Culiacán',
        codigo: 'FLT-CLN-01',
        sucursalId: 1,
        sucursalNombre: 'Matriz Culiacán',
        supervisorId: 12,
        supervisorNombre: 'MARÍA JOSÉ IBARRA RODRÍGUEZ',
        activo: true,
        totalUnidades: 1,
        totalChoferes: 1,
      },
    ],
    unidades: [
      {
        id: 10,
        flotillaId: 1,
        flotillaNombre: 'Flotilla Centro Culiacán',
        placas: 'VSL-402-A',
        tipoVehiculo: 'Camioneta Van',
        marca: 'Ford',
        modelo: 'Transit',
        anio: 2024,
        capacidadKg: 1500,
        kmOdometroActual: 15000,
        kmOdometroInicial: 12000,
        estado: 'disponible',
        activo: true,
      },
    ],
    envios: [],
    detalles: {},
    rutas: [],
    cambiosRuta: [],
  };
}

export async function montarApiSistema(
  page: Page,
  state: EstadoSimulacion,
  overrides?: (route: Route, state: EstadoSimulacion) => Promise<boolean> | boolean
) {
  await page.route('**/api/**', async (route) => {
    if (overrides && (await overrides(route, state))) {
      return;
    }

    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, '');

    // Catálogo geográfico
    if (path === '/CatalogoGeografico/sucursales-operativas') {
      return jsonResponse(route, state.sucursales);
    }
    if (path.startsWith('/CatalogoGeografico/cp/')) {
      const cp = decodeURIComponent(path.split('/').pop() ?? '').trim();
      const found = SEPOMEX_POR_CP[cp];
      return found
        ? jsonResponse(route, found)
        : jsonResponse(route, { mensaje: `El código postal ${cp} no existe en el catálogo SEPOMEX.` }, 404);
    }
    if (path === '/CatalogoGeografico/estados') {
      return jsonResponse(route, [
        { id: 25, claveEntidad: '25', nombre: 'Sinaloa', abreviatura: 'Sin.' },
        { id: 9, claveEntidad: '09', nombre: 'Ciudad de México', abreviatura: 'CDMX' },
      ]);
    }
    if (path.startsWith('/CatalogoGeografico/municipios/')) {
      return jsonResponse(route, [{ id: 25006, nombre: 'Culiacán' }]);
    }

    // Sucursales
    if (path === '/Sucursal' && method === 'GET') return jsonResponse(route, state.sucursales);
    if (path === '/Sucursal' && method === 'POST') {
      const b = req.postDataJSON() ?? {};
      const nuevo = { id: ++state.ultimoId, ...b, nombre: String(b.nombre ?? '').toUpperCase(), activo: true };
      state.sucursales.push(nuevo);
      return jsonResponse(route, nuevo, 201);
    }
    if (/^\/Sucursal\/\d+$/.test(path) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const b = req.postDataJSON() ?? {};
      const idx = state.sucursales.findIndex((s) => s.id === id);
      if (idx >= 0) state.sucursales[idx] = { ...state.sucursales[idx], ...b };
      return emptyResponse(route, 204);
    }
    if (/^\/Sucursal\/\d+$/.test(path) && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      state.sucursales = state.sucursales.filter((s) => s.id !== id);
      return emptyResponse(route, 204);
    }

    // Puestos
    if (path === '/Puesto' && method === 'GET') return jsonResponse(route, state.puestos);
    if (path === '/Puesto' && method === 'POST') {
      const b = req.postDataJSON() ?? {};
      const nombreTrim = String(b.nombre ?? '').trim();
      if (state.puestos.some((p) => String(p.nombre).toLowerCase() === nombreTrim.toLowerCase())) {
        return jsonResponse(route, { mensaje: `Ya existe un puesto registrado con el nombre '${nombreTrim}'.` }, 409);
      }
      const nuevo = { id: ++state.ultimoId, nombre: nombreTrim, descripcion: b.descripcion ?? '' };
      state.puestos.push(nuevo);
      return jsonResponse(route, nuevo, 201);
    }
    if (/^\/Puesto\/\d+$/.test(path) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const b = req.postDataJSON() ?? {};
      const idx = state.puestos.findIndex((p) => p.id === id);
      if (idx >= 0) state.puestos[idx] = { ...state.puestos[idx], ...b };
      return emptyResponse(route, 204);
    }
    if (/^\/Puesto\/\d+$/.test(path) && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      state.puestos = state.puestos.filter((p) => p.id !== id);
      return emptyResponse(route, 204);
    }

    // Tipos de mantenimiento
    if (path === '/TipoMantenimiento' && method === 'GET') return jsonResponse(route, state.tiposMantenimiento);
    if (path === '/TipoMantenimiento' && method === 'POST') {
      const b = req.postDataJSON() ?? {};
      const nuevo = { id: ++state.ultimoId, ...b, activo: b.activo ?? true };
      state.tiposMantenimiento.push(nuevo);
      return jsonResponse(route, nuevo, 201);
    }
    if (/^\/TipoMantenimiento\/\d+$/.test(path) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const b = req.postDataJSON() ?? {};
      const idx = state.tiposMantenimiento.findIndex((t) => t.id === id);
      if (idx >= 0) state.tiposMantenimiento[idx] = { ...state.tiposMantenimiento[idx], ...b };
      return emptyResponse(route, 204);
    }
    if (/^\/TipoMantenimiento\/\d+$/.test(path) && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      state.tiposMantenimiento = state.tiposMantenimiento.filter((t) => t.id !== id);
      return emptyResponse(route, 204);
    }

    // Roles y permisos
    if (path === '/Permiso' && method === 'GET') return jsonResponse(route, state.permisos);
    if (path === '/Rol' && method === 'GET') return jsonResponse(route, state.roles);
    if (path === '/Rol' && method === 'POST') {
      const b = req.postDataJSON() ?? {};
      const nuevo = { id: ++state.ultimoId, nombre: b.nombre, descripcion: b.descripcion ?? '' };
      state.roles.push(nuevo);
      return jsonResponse(route, nuevo, 201);
    }
    if (/^\/Rol\/\d+\/permisos$/.test(path) && method === 'GET') {
      return jsonResponse(route, state.permisos.map((p) => ({ ...p, asignado: false })));
    }
    if (/^\/Rol\/\d+\/permisos$/.test(path) && method === 'PUT') {
      return jsonResponse(route, { mensaje: 'Permisos asignados con éxito', permisos: state.permisos });
    }
    if (/^\/Rol\/\d+$/.test(path) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const b = req.postDataJSON() ?? {};
      const idx = state.roles.findIndex((r) => r.id === id);
      if (idx >= 0) state.roles[idx] = { ...state.roles[idx], ...b };
      return emptyResponse(route, 204);
    }
    if (/^\/Rol\/\d+$/.test(path) && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      state.roles = state.roles.filter((r) => r.id !== id);
      return emptyResponse(route, 204);
    }

    // Autenticación
    if (path === '/Autenticacion/activar-cuenta' && method === 'POST') {
      const b = req.postDataJSON() ?? {};
      const token = String(b.token ?? '').trim();
      if (!token || token.includes('INVALID') || token.includes('EXPIRADO')) {
        return jsonResponse(route, { mensaje: 'El token de activación no es válido o ha expirado.' }, 400);
      }
      return jsonResponse(route, { mensaje: 'Cuenta activada exitosamente. Ya puedes iniciar sesión.' });
    }
    if (path === '/Autenticacion/logout' && method === 'POST') {
      return jsonResponse(route, { mensaje: 'Sesión cerrada correctamente.' });
    }

    // Empleados y clientes
    if (path === '/Empleado' && method === 'GET') return jsonResponse(route, state.empleados);
    if (/^\/Empleado\/\d+\/expediente$/.test(path) && method === 'GET') {
      const id = Number(path.split('/')[2]);
      const emp = state.empleados.find((e) => e.id === id) ?? state.empleados[0];
      return jsonResponse(route, { ...emp, historialPuestos: [] });
    }
    if (/^\/Empleado\/\d+\/puestos-historial$/.test(path) && method === 'GET') {
      return jsonResponse(route, []);
    }
    if (path === '/Empleado' && method === 'POST') {
      const b = req.postDataJSON() ?? {};
      const puesto = state.puestos.find((p) => p.id === b.puestoId) ?? state.puestos[1];
      const nuevo = {
        id: ++state.ultimoId,
        usuarioId: ++state.ultimoId,
        numeroEmpleado: `TR-${state.ultimoId}`,
        nombre: String(b.nombre ?? '').toUpperCase(),
        apellidoPaterno: String(b.apellidoPaterno ?? '').toUpperCase(),
        apellidoMaterno: b.apellidoMaterno ? String(b.apellidoMaterno).toUpperCase() : null,
        telefono: b.telefono,
        email: b.email,
        sucursalId: b.sucursalId ?? 1,
        sucursalNombre: 'Matriz Culiacán',
        puestoId: puesto.id,
        puestoNombre: puesto.nombre,
        roles: [puesto.nombre],
        estadoAcceso: 'activo',
        activo: true,
        fechaIngreso: b.fechaIngreso ?? '2026-06-01',
      };
      state.empleados.push(nuevo);
      return jsonResponse(route, nuevo, 201);
    }
    if (/^\/Empleado\/\d+$/.test(path) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const b = req.postDataJSON() ?? {};
      const idx = state.empleados.findIndex((e) => e.id === id);
      if (idx >= 0) {
        state.empleados[idx] = {
          ...state.empleados[idx],
          ...b,
          nombre: b.nombre ? String(b.nombre).toUpperCase() : state.empleados[idx].nombre,
          apellidoPaterno: b.apellidoPaterno ? String(b.apellidoPaterno).toUpperCase() : state.empleados[idx].apellidoPaterno,
        };
        return jsonResponse(route, state.empleados[idx]);
      }
      return jsonResponse(route, { mensaje: 'Empleado no encontrado.' }, 404);
    }
    if (/^\/Empleado\/\d+\/(suspender|desactivar|reactivar)$/.test(path) && method === 'POST') {
      const parts = path.split('/');
      const id = Number(parts[2]);
      const accion = parts[3];
      const emp = state.empleados.find((e) => e.id === id);
      if (!emp) return jsonResponse(route, { mensaje: 'Empleado no encontrado.' }, 404);
      emp.activo = accion === 'reactivar';
      emp.estadoAcceso = accion === 'reactivar' ? 'activo' : accion === 'suspender' ? 'suspendido' : 'baja';
      return jsonResponse(route, emp);
    }
    if (/^\/Empleado\/\d+\/cambiar-puesto$/.test(path) && method === 'POST') {
      const id = Number(path.split('/')[2]);
      const b = req.postDataJSON() ?? {};
      const emp = state.empleados.find((e) => e.id === id);
      const targetPuestoId = Number(b.nuevoPuestoId ?? b.puestoId);
      const puesto = state.puestos.find((p) => p.id === targetPuestoId);
      if (!emp || !puesto) return jsonResponse(route, { mensaje: 'No encontrado.' }, 404);
      emp.puestoId = puesto.id;
      emp.puestoNombre = puesto.nombre;
      return jsonResponse(route, emp);
    }
    if (/^\/Empleado\/\d+$/.test(path) && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      state.empleados = state.empleados.filter((e) => e.id !== id);
      return emptyResponse(route, 204);
    }
    if (path === '/Cliente' || path.startsWith('/Cliente?')) {
      if (method === 'GET') return jsonResponse(route, state.clientes);
    }
    if (path === '/Cliente' && method === 'POST') {
      const b = req.postDataJSON() ?? {};
      const nuevo = {
        id: ++state.ultimoId,
        usuarioId: ++state.ultimoId,
        nombre: String(b.nombre ?? '').toUpperCase(),
        apellidoPaterno: String(b.apellidoPaterno ?? '').toUpperCase(),
        apellidoMaterno: b.apellidoMaterno ? String(b.apellidoMaterno).toUpperCase() : null,
        telefono: b.telefono,
        email: b.email,
        activo: false,
      };
      state.clientes.push(nuevo);
      return jsonResponse(route, nuevo, 201);
    }
    if (/^\/Cliente\/\d+$/.test(path) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const b = req.postDataJSON() ?? {};
      const idx = state.clientes.findIndex((c) => c.id === id);
      if (idx >= 0) {
        state.clientes[idx] = {
          ...state.clientes[idx],
          ...b,
          nombre: b.nombre ? String(b.nombre).toUpperCase() : state.clientes[idx].nombre,
          apellidoPaterno: b.apellidoPaterno ? String(b.apellidoPaterno).toUpperCase() : state.clientes[idx].apellidoPaterno,
          motivoEdicion: b.motivoEdicion ? String(b.motivoEdicion).toUpperCase() : state.clientes[idx].motivoEdicion,
        };
        return jsonResponse(route, state.clientes[idx]);
      }
      return jsonResponse(route, { mensaje: 'Cliente no encontrado.' }, 404);
    }
    if (/^\/Cliente\/\d+$/.test(path) && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      state.clientes = state.clientes.filter((c) => c.id !== id);
      return emptyResponse(route, 204);
    }

    // Flotillas y unidades
    if (path === '/Flotilla' && method === 'GET') return jsonResponse(route, state.flotillas);
    if (path === '/Flotilla' && method === 'POST') {
      const b = req.postDataJSON() ?? {};
      const nuevo = {
        id: ++state.ultimoId,
        nombre: String(b.nombre ?? '').toUpperCase(),
        codigo: String(b.codigo ?? '').toUpperCase(),
        sucursalId: b.sucursalId ?? 1,
        sucursalNombre: 'Matriz Culiacán',
        supervisorId: b.supervisorId ?? 12,
        supervisorNombre: 'MARÍA JOSÉ IBARRA RODRÍGUEZ',
        activo: b.activo ?? true,
        totalUnidades: 0,
        totalChoferes: 0,
      };
      state.flotillas.push(nuevo);
      return jsonResponse(route, nuevo, 201);
    }
    if (/^\/Flotilla\/\d+$/.test(path) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const b = req.postDataJSON() ?? {};
      const idx = state.flotillas.findIndex((f) => f.id === id);
      if (idx >= 0) {
        state.flotillas[idx] = { ...state.flotillas[idx], ...b };
        return jsonResponse(route, state.flotillas[idx]);
      }
      return jsonResponse(route, { mensaje: 'Flotilla no encontrada.' }, 404);
    }
    if (/^\/Flotilla\/\d+\/asignaciones$/.test(path)) {
      if (method === 'GET') return jsonResponse(route, { empleadosIds: [] });
      if (method === 'PUT') return jsonResponse(route, { mensaje: 'Asignaciones actualizadas.' });
    }
    if (/^\/Flotilla\/\d+\/resumen$/.test(path) && method === 'GET') {
      const id = Number(path.split('/')[2]);
      const flt = state.flotillas.find((f) => f.id === id) ?? state.flotillas[0];
      return jsonResponse(route, { ...flt, choferes: [], unidades: [] });
    }
    if (/^\/Flotilla\/\d+$/.test(path) && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      state.flotillas = state.flotillas.filter((f) => f.id !== id);
      return emptyResponse(route, 204);
    }
    if (path === '/Flotilla/supervisores-operativos') return jsonResponse(route, state.empleados);
    if ((path === '/Unidad' || path.startsWith('/Unidad?')) && method === 'GET') return jsonResponse(route, state.unidades);
    if (/^\/Unidad\/\d+$/.test(path) && method === 'GET') {
      const id = Number(path.split('/')[2]);
      const u = state.unidades.find((x) => x.id === id);
      return u ? jsonResponse(route, u) : jsonResponse(route, { mensaje: 'Unidad no encontrada.' }, 404);
    }
    if (path === '/Unidad' && method === 'POST') {
      const b = req.postDataJSON() ?? {};
      const nuevo = {
        id: ++state.ultimoId,
        flotillaId: b.flotillaId ?? 1,
        flotillaNombre: 'Flotilla Centro Culiacán',
        placas: String(b.placas ?? '').toUpperCase(),
        tipoVehiculo: b.tipoVehiculo ?? 'Camioneta Van',
        marca: b.marca ?? 'Ford',
        modelo: b.modelo ?? 'Transit',
        anio: b.anio ?? 2024,
        capacidadKg: b.capacidadKg ?? 1500,
        kmOdometroActual: b.kmOdometroActual ?? 1000,
        kmOdometroInicial: b.kmOdometroInicial ?? 1000,
        estado: b.estado ?? 'disponible',
        activo: b.activo ?? true,
      };
      state.unidades.push(nuevo);
      return jsonResponse(route, nuevo, 201);
    }
    if (/^\/Unidad\/\d+$/.test(path) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const b = req.postDataJSON() ?? {};
      const idx = state.unidades.findIndex((u) => u.id === id);
      if (idx >= 0) {
        state.unidades[idx] = { ...state.unidades[idx], ...b };
        return jsonResponse(route, state.unidades[idx]);
      }
      return jsonResponse(route, { mensaje: 'Unidad no encontrada.' }, 404);
    }
    if (/^\/Unidad\/\d+$/.test(path) && method === 'DELETE') {
      const id = Number(path.split('/').pop());
      state.unidades = state.unidades.filter((u) => u.id !== id);
      return emptyResponse(route, 204);
    }
    if (/^\/Unidad\/\d+\/cierre-dia$/.test(path) && method === 'POST') {
      const id = Number(path.split('/')[2]);
      const b = req.postDataJSON() ?? {};
      const unidad = state.unidades.find((u) => u.id === id);
      if (!unidad) return jsonResponse(route, { mensaje: 'Unidad no encontrada.' }, 404);
      const kmFinal = Number(b.kmOdometroFinal ?? 0);
      if (kmFinal < Number(unidad.kmOdometroActual)) {
        return jsonResponse(route, {
          mensaje: `El odómetro final (${kmFinal}) no puede ser menor al odómetro actual (${unidad.kmOdometroActual}).`,
        }, 400);
      }
      unidad.kmOdometroActual = kmFinal;
      return jsonResponse(route, { mensaje: 'Kilometraje de cierre del día registrado exitosamente.', unidad });
    }

    // Recursos de asignación
    if (path === '/Envio/recursos-asignacion') {
      return jsonResponse(route, {
        flotillas: state.flotillas,
        choferes: state.empleados
          .filter((e) => (e.roles as string[])?.includes('Chofer'))
          .map((e) => ({
            id: e.id,
            empleadoId: e.id,
            nombreCompleto: `${e.nombre} ${e.apellidoPaterno}`.trim(),
            telefono: e.telefono,
            sucursalId: e.sucursalId,
            flotillaActivaId: 1,
            flotillaIds: [1],
          })),
        unidades: state.unidades,
      });
    }

    // Envíos y rutas
    if (path === '/Envio' && method === 'GET') return jsonResponse(route, state.envios);
    if (path === '/Envio' && method === 'POST') {
      const body = req.postDataJSON() ?? {};
      const id = ++state.ultimoId;
      const guia = `TR-20261112-QA${id}`;
      const ahora = new Date().toISOString();
      const base = {
        id,
        guia,
        estado: body.requiereRecoleccion ? 'recoleccion_programada' : 'registrado',
        remitenteId: body.remitenteId ?? 21,
        remitenteNombre: 'CARLOS ALBERTO MENDOZA LÓPEZ',
        remitenteTelefono: '6673124589',
        destinatarioNombre: String(body.destinatarioNombre ?? 'DESTINATARIO').toUpperCase(),
        destinatarioTelefono: body.destinatarioTelefono ?? '6679876543',
        destinatarioEmail: body.destinatarioEmail ?? null,
        destinoCiudadResumen: `${body.direccionDestino?.municipio ?? 'Culiacán'}, ${body.direccionDestino?.estado ?? 'Sinaloa'}`,
        destinoCodigoPostal: body.direccionDestino?.codigoPostal ?? '80000',
        requiereRecoleccion: Boolean(body.requiereRecoleccion),
        sucursalRecepcionId: body.sucursalRecepcionId ?? 1,
        sucursalRecepcionNombre: 'Matriz Culiacán',
        sucursalDestinoId: body.sucursalDestinoId ?? 1,
        sucursalDestinoNombre: 'Matriz Culiacán',
        pesoKg: body.pesoKg ?? 3.5,
        largoCm: body.largoCm ?? 30,
        anchoCm: body.anchoCm ?? 25,
        altoCm: body.altoCm ?? 20,
        descripcion: body.descripcion ?? 'Paquete QA',
        valorDeclarado: body.valorDeclarado ?? 1500,
        intentoReparto: 0,
        flotillaAsignadaNombre: null,
        choferAsignadoNombre: null,
        unidadAsignadaPlacas: null,
        fechaCreacion: ahora,
        fechaEntregaEstimada: new Date(Date.now() + 2 * 86400000).toISOString(),
      };
      const detalle = {
        ...base,
        remitenteEmail: 'carlos.mendoza@clientesrojas.mx',
        destinatarioClienteId: null,
        direccionOrigen: body.direccionOrigen ?? null,
        direccionDestino: body.direccionDestino,
        recepcion: null,
        citasRecoleccion: [],
        rutasAsignadas: [],
        entregas: [],
        eventos: [
          {
            id: 1,
            estado: base.estado,
            descripcion: 'ENVÍO DOCUMENTADO PARA RECEPCIÓN EN SUCURSAL MATRIZ CULIACÁN.',
            registradoPorNombre: 'CARLOS ALBERTO MENDOZA LÓPEZ',
            fechaEvento: ahora,
          },
        ],
        codigoSeguridadCliente: null,
      };
      state.envios.unshift(base);
      state.detalles[id] = detalle;
      return jsonResponse(route, { guia, codigoSeguridadEntrega: null, envio: detalle }, 201);
    }

    if (/^\/Envio\/\d+\/recepcion$/.test(path) && method === 'POST') {
      const id = Number(path.split('/')[2]);
      const body = req.postDataJSON() ?? {};
      const item = state.envios.find((e) => e.id === id);
      const det = state.detalles[id];
      if (!item || !det) return jsonResponse(route, { mensaje: 'Envío no encontrado.' }, 404);
      const ahora = new Date().toISOString();
      item.estado = 'recibido_sucursal';
      item.pesoKg = body.pesoVerificadoKg ?? item.pesoKg;
      det.estado = 'recibido_sucursal';
      det.recepcion = {
        pesoVerificadoKg: body.pesoVerificadoKg,
        largoVerificadoCm: body.largoVerificadoCm,
        anchoVerificadoCm: body.anchoVerificadoCm,
        altoVerificadoCm: body.altoVerificadoCm,
        fechaRecepcion: ahora,
        observaciones: body.observaciones ?? '',
      };
      (det.eventos as Record<string, unknown>[]).unshift({
        id: (det.eventos as unknown[]).length + 1,
        estado: 'recibido_sucursal',
        descripcion: 'RECEPCIÓN EN SUCURSAL VERIFICADA EN BÁSCULA.',
        registradoPorNombre: 'MARÍA JOSÉ IBARRA',
        fechaEvento: ahora,
      });
      return jsonResponse(route, det);
    }

    if (path === '/Envio/planificar-ruta' && method === 'POST') {
      const body = req.postDataJSON() ?? {};
      const rutaId = ++state.ultimoId;
      const unidad = state.unidades.find((u) => u.id === body.unidadId) ?? state.unidades[0];
      const chofer = state.empleados.find((e) => e.id === body.choferId) ?? state.empleados[0];
      const enviosIds: number[] = body.enviosIdsOrdenados ?? [];
      const ahora = new Date().toISOString();
      const paradas: Record<string, unknown>[] = [];
      const guiasAsignadas: string[] = [];

      enviosIds.forEach((eid, idx) => {
        const item = state.envios.find((e) => e.id === eid);
        const det = state.detalles[eid];
        if (item && det) {
          item.estado = 'asignado_flotilla';
          item.flotillaAsignadaNombre = 'Flotilla Centro Culiacán';
          item.choferAsignadoNombre = `${chofer.nombre} ${chofer.apellidoPaterno}`;
          item.unidadAsignadaPlacas = unidad.placas;
          det.estado = 'asignado_flotilla';
          (det.eventos as Record<string, unknown>[]).unshift({
            id: (det.eventos as unknown[]).length + 1,
            estado: 'asignado_flotilla',
            descripcion: `ASIGNADO A RUTA #${rutaId} CON UNIDAD ${unidad.placas}.`,
            registradoPorNombre: 'JEFE DE FLOTILLA',
            fechaEvento: ahora,
          });
          guiasAsignadas.push(String(item.guia));
          const dd = (det.direccionDestino as Record<string, unknown>) ?? {};
          const rawNum = dd.numeroExterior === undefined ? '450' : String(dd.numeroExterior ?? '').trim();
          const numFmt = !rawNum ? '' : /^S\s*\/?\s*N\.?$/i.test(rawNum) ? ' S/N' : ` #${rawNum}`;
          paradas.push({
            envioId: eid,
            guia: item.guia,
            estado: 'asignado_flotilla',
            orden: idx + 1,
            destinatarioNombre: item.destinatarioNombre,
            destinatarioTelefono: item.destinatarioTelefono,
            destinoDireccion: `${dd.calle ?? 'Blvd. Zapata'}${numFmt}, Col. ${dd.colonia ?? 'Centro'}`,
            destinoCiudad: String(item.destinoCiudadResumen ?? 'Culiacán, Sinaloa'),
            tipoPaquete: item.descripcion ?? 'Paquete QA',
            pesoKg: item.pesoKg,
            volumenM3: 0.015,
            observaciones: dd.referencias ?? 'Fachada azul',
          });
        }
      });

      const ruta = {
        rutaId,
        nombreRuta: `Ruta Centro #${rutaId}`,
        estadoRuta: 'planeada',
        unidadId: unidad.id,
        unidadNumeroEconomico: 'ECO-10',
        unidadPlacas: unidad.placas,
        fechaProgramada: body.fechaRuta ?? ahora.slice(0, 10),
        totalEnvios: paradas.length,
        enviosEntregados: 0,
        paradas,
        cambiosTrayecto: [],
      };
      state.rutas.push(ruta);
      return jsonResponse(route, {
        rutaId,
        nombreRuta: ruta.nombreRuta,
        fecha: ruta.fechaProgramada,
        flotillaNombre: 'Flotilla Centro Culiacán',
        unidadPlacas: ruta.unidadPlacas,
        choferNombre: `${chofer.nombre} ${chofer.apellidoPaterno}`,
        totalParadas: paradas.length,
        guiasAsignadas,
      });
    }

    if (path === '/Ruta/chofer-activa' && method === 'GET') {
      const activa = state.rutas[state.rutas.length - 1] ?? null;
      return jsonResponse(route, activa);
    }

    if (/^\/Ruta\/\d+\/iniciar-recorrido$/.test(path) && method === 'POST') {
      const rutaId = Number(path.split('/')[2]);
      const body = req.postDataJSON() ?? {};
      const ruta = state.rutas.find((r) => r.rutaId === rutaId);
      if (!ruta) return jsonResponse(route, { mensaje: 'Ruta no encontrada.' }, 404);
      if (body.kmInicialOdometro !== undefined && body.kmInicialOdometro !== null) {
        const kmIni = Number(body.kmInicialOdometro);
        if (!Number.isFinite(kmIni) || kmIni < 0) {
          return jsonResponse(route, { mensaje: 'El odómetro inicial debe ser mayor o igual a 0.' }, 400);
        }
        const uni = state.unidades.find((u) => u.id === ruta.unidadId);
        if (uni && kmIni > Number(uni.kmOdometroActual ?? 0)) {
          uni.kmOdometroActual = kmIni;
        }
      }
      const ahora = new Date().toISOString();
      ruta.estadoRuta = 'en_curso';
      for (const p of ruta.paradas as Record<string, unknown>[]) {
        p.estado = 'en_ruta';
        const eid = Number(p.envioId);
        const item = state.envios.find((e) => e.id === eid);
        const det = state.detalles[eid];
        if (item && det) {
          item.estado = 'en_ruta';
          det.estado = 'en_ruta';
          det.codigoSeguridadCliente = state.pinActual;
          (det.eventos as Record<string, unknown>[]).unshift({
            id: (det.eventos as unknown[]).length + 1,
            estado: 'en_ruta',
            descripcion: 'RUTA INICIADA POR EL CHOFER: Paquete en reparto hacia el domicilio.',
            registradoPorNombre: 'LUIS FERNANDO SALAZAR',
            fechaEvento: ahora,
          });
        }
      }
      return jsonResponse(route, {
        mensaje: '¡Recorrido iniciado! Los códigos PIN dinámicos fueron enviados a los destinatarios.',
        estadoRuta: 'en_curso',
        totalEnviosEnRuta: (ruta.paradas as unknown[]).length,
      });
    }

    if (/^\/Ruta\/\d+\/notificar-cambio$/.test(path) && method === 'POST') {
      const rutaId = Number(path.split('/')[2]);
      const body = req.postDataJSON() ?? {};
      const item = {
        id: ++state.ultimoId,
        folio: `CR-20261112-${state.ultimoId}`,
        rutaId,
        choferId: 11,
        choferNombre: 'LUIS FERNANDO SALAZAR',
        unidadId: 10,
        unidadPlacas: 'VSL-402-A',
        motivo: body.motivo,
        referenciaLugar: body.referenciaLugar,
        descripcionTrayecto: body.descripcionTrayecto,
        fechaEvento: new Date().toISOString(),
        afectaEntrega: Boolean(body.afectaEntrega),
        estadoAviso: 'enviado',
        fechaRegistro: new Date().toISOString(),
      };
      state.cambiosRuta.unshift(item);
      const ruta = state.rutas.find((r) => r.rutaId === rutaId);
      if (ruta) (ruta.cambiosTrayecto as Record<string, unknown>[]).unshift(item);
      return jsonResponse(route, item, 201);
    }

    if (path.startsWith('/Ruta/cambios-trayecto') && method === 'GET') {
      return jsonResponse(route, state.cambiosRuta);
    }

    if (/^\/Envio\/\d+\/validar-entrega$/.test(path) && method === 'POST') {
      const eid = Number(path.split('/')[2]);
      const body = req.postDataJSON() ?? {};
      const item = state.envios.find((e) => e.id === eid);
      const det = state.detalles[eid];
      if (!item || !det) return jsonResponse(route, { mensaje: 'Envío no encontrado.' }, 404);
      const ahora = new Date().toISOString();

      if (body.entregaExitosa) {
        if (String(body.codigoSeguridad ?? '').trim() !== state.pinActual) {
          return jsonResponse(route, { mensaje: 'El código de seguridad ingresado no es válido. Verifica con el destinatario.' }, 409);
        }
        item.estado = 'entregado';
        det.estado = 'entregado';
        if (!Array.isArray(det.entregas)) det.entregas = [];
        if (!Array.isArray(det.eventos)) det.eventos = [];
        (det.entregas as unknown[]).push({ id: 1, validado: true, fechaEntrega: ahora });
        (det.eventos as Record<string, unknown>[]).unshift({
          id: (det.eventos as unknown[]).length + 1,
          estado: 'entregado',
          descripcion: 'ENTREGA VALIDADA CON PIN DE SEGURIDAD, FOTO Y FIRMA DIGITAL.',
          registradoPorNombre: 'LUIS FERNANDO SALAZAR',
          fechaEvento: ahora,
        });
        for (const r of state.rutas) {
          const parada = (r.paradas as Record<string, unknown>[]).find((p) => p.envioId === eid);
          if (parada) {
            parada.estado = 'entregado';
            r.enviosEntregados = Number(r.enviosEntregados ?? 0) + 1;
          }
        }
      } else {
        item.estado = 'no_entregado';
        item.intentoReparto = Number(item.intentoReparto ?? 0) + 1;
        det.estado = 'no_entregado';
        det.intentoReparto = item.intentoReparto;
        if (!Array.isArray(det.eventos)) det.eventos = [];
        (det.eventos as Record<string, unknown>[]).unshift({
          id: (det.eventos as unknown[]).length + 1,
          estado: 'no_entregado',
          descripcion: `INCIDENCIA EN ENTREGA: ${body.observaciones ?? 'Sin respuesta'}.`,
          registradoPorNombre: 'LUIS FERNANDO SALAZAR',
          fechaEvento: ahora,
        });
        for (const r of state.rutas) {
          const parada = (r.paradas as Record<string, unknown>[]).find((p) => p.envioId === eid);
          if (parada) {
            parada.estado = 'no_entregado';
          }
        }
      }
      return jsonResponse(route, det);
    }

    if (/^\/Envio\/\d+\/reprogramar$/.test(path) && method === 'POST') {
      const eid = Number(path.split('/')[2]);
      const body = req.postDataJSON() ?? {};
      const fechaRaw = body.nuevaFechaHora ?? body.nuevaFechaEstimada ?? '';
      const nuevaFecha = new Date(fechaRaw);
      if (Number.isNaN(nuevaFecha.getTime()) || nuevaFecha.getTime() <= Date.now()) {
        return jsonResponse(route, { mensaje: 'La nueva fecha de entrega debe ser posterior al momento actual.' }, 400);
      }
      const item = state.envios.find((e) => e.id === eid);
      const det = state.detalles[eid];
      if (!item || !det) return jsonResponse(route, { mensaje: 'Envío no encontrado.' }, 404);
      item.estado = 'reprogramado';
      det.estado = 'reprogramado';
      det.fechaEntregaEstimada = nuevaFecha.toISOString();
      return jsonResponse(route, det);
    }

    if (/^\/Envio\/\d+\/cancelar$/.test(path) && method === 'POST') {
      const eid = Number(path.split('/')[2]);
      const item = state.envios.find((e) => e.id === eid);
      const det = state.detalles[eid];
      if (!item || !det) return jsonResponse(route, { mensaje: 'Envío no encontrado.' }, 404);
      const estadoNuevo = ['recibido_sucursal', 'asignado_flotilla', 'en_ruta', 'no_entregado', 'reprogramado'].includes(String(item.estado))
        ? 'en_devolucion'
        : 'cancelado';
      item.estado = estadoNuevo;
      det.estado = estadoNuevo;
      return jsonResponse(route, det);
    }

    if (/^\/Envio\/\d+\/devolucion$/.test(path) && method === 'POST') {
      const eid = Number(path.split('/')[2]);
      const body = req.postDataJSON() ?? {};
      const item = state.envios.find((e) => e.id === eid);
      const det = state.detalles[eid];
      if (!item || !det) return jsonResponse(route, { mensaje: 'Envío no encontrado.' }, 404);
      item.estado = 'en_devolucion';
      det.estado = 'en_devolucion';
      (det.eventos as Record<string, unknown>[]).unshift({
        id: (det.eventos as unknown[]).length + 1,
        estado: 'en_devolucion',
        descripcion: `DEVOLUCIÓN INICIADA (${body.origenSolicitud ?? 'SUCURSAL'}): ${body.motivo ?? ''}`,
        registradoPorNombre: 'PERSONAL DE SUCURSAL',
        fechaEvento: new Date().toISOString(),
      });
      return jsonResponse(route, det);
    }

    if (/^\/Envio\/\d+\/devolucion\/confirmar$/.test(path) && method === 'POST') {
      const eid = Number(path.split('/')[2]);
      const item = state.envios.find((e) => e.id === eid);
      const det = state.detalles[eid];
      if (!item || !det) return jsonResponse(route, { mensaje: 'Envío no encontrado.' }, 404);
      item.estado = 'devuelto';
      det.estado = 'devuelto';
      (det.eventos as Record<string, unknown>[]).unshift({
        id: (det.eventos as unknown[]).length + 1,
        estado: 'devuelto',
        descripcion: 'DEVOLUCIÓN CONFIRMADA AL REMITENTE EN SUCURSAL.',
        registradoPorNombre: 'PERSONAL DE SUCURSAL',
        fechaEvento: new Date().toISOString(),
      });
      return jsonResponse(route, det);
    }

    if (/^\/Envio\/\d+$/.test(path) && method === 'GET') {
      const eid = Number(path.split('/').pop());
      const det = state.detalles[eid];
      return det ? jsonResponse(route, det) : jsonResponse(route, { mensaje: 'No se encontró el envío.' }, 404);
    }

    if (path.startsWith('/Envio/rastreo/') && method === 'GET') {
      const guia = decodeURIComponent(path.split('/').pop() ?? '').trim().toUpperCase();
      const det = Object.values(state.detalles).find((d) => String(d.guia).toUpperCase() === guia);
      if (!det) return jsonResponse(route, { mensaje: `No se encontró ningún envío con guía ${guia}.` }, 404);
      return jsonResponse(route, {
        guia: det.guia,
        estado: det.estado,
        requiereRecoleccion: det.requiereRecoleccion,
        origenResumen: 'Culiacán, Sinaloa',
        destinoResumen: det.destinoCiudadResumen,
        sucursalRecepcionNombre: det.sucursalRecepcionNombre,
        sucursalDestinoNombre: det.sucursalDestinoNombre,
        pesoKg: det.pesoKg,
        descripcionPaquete: det.descripcion,
        intentoReparto: det.intentoReparto,
        fechaCreacion: det.fechaCreacion,
        fechaEntregaEstimada: det.fechaEntregaEstimada,
        eventos: det.eventos,
      });
    }

    if (path.startsWith('/Ruta') && method === 'GET') return jsonResponse(route, state.rutas);

    return route.continue();
  });
}

export const PERSONAS = {
  cliente: {
    id: 2021,
    empleadoOClienteId: 21,
    email: 'carlos.mendoza@clientesrojas.mx',
    tipoUsuario: 'Cliente',
    nombreCompleto: 'CARLOS ALBERTO MENDOZA LÓPEZ',
    nombre: 'CARLOS ALBERTO',
    roles: ['Cliente'],
    permisos: [],
    sucursal: null,
    sucursalId: null,
    requiereCambioPassword: false,
  } satisfies UsuarioSesionMock,

  jefe: {
    id: 1001,
    empleadoOClienteId: 1,
    email: 'jefe@transportesrojas.com',
    tipoUsuario: 'Empleado',
    nombreCompleto: 'RODRIGO ROJAS ZAZUETA',
    nombre: 'RODRIGO',
    roles: ['Jefe'],
    permisos: ['*'],
    puestoActual: 'Gerente General',
    sucursal: 'Matriz Culiacán',
    sucursalId: 1,
    requiereCambioPassword: false,
  } satisfies UsuarioSesionMock,

  sucursal: {
    id: 1012,
    empleadoOClienteId: 12,
    email: 'sucursal.maria@transportesrojas.com',
    tipoUsuario: 'Empleado',
    nombreCompleto: 'MARÍA JOSÉ IBARRA RODRÍGUEZ',
    nombre: 'MARÍA JOSÉ',
    roles: ['Personal de sucursal'],
    permisos: [
      'envio.recepcion_sucursal',
      'envio.devolucion_registrar',
      'envio.devolucion_confirmar',
    ],
    puestoActual: 'Personal de sucursal',
    sucursal: 'Matriz Culiacán',
    sucursalId: 1,
    requiereCambioPassword: false,
  } satisfies UsuarioSesionMock,

  jefeFlotilla: {
    id: 1013,
    empleadoOClienteId: 13,
    email: 'flotilla@transportesrojas.com',
    tipoUsuario: 'Empleado',
    nombreCompleto: 'JORGE ALBERTO GASTÉLUM',
    nombre: 'JORGE ALBERTO',
    roles: ['Jefe de flotilla'],
    permisos: ['ruta.planificar', 'ruta.asignar_recursos'],
    puestoActual: 'Jefe de flotilla',
    sucursal: 'Matriz Culiacán',
    sucursalId: 1,
    requiereCambioPassword: false,
  } satisfies UsuarioSesionMock,

  administrativo: {
    id: 1014,
    empleadoOClienteId: 14,
    email: 'admin@transportesrojas.com',
    tipoUsuario: 'Empleado',
    nombreCompleto: 'SOFÍA VERDUGO LÓPEZ',
    nombre: 'SOFÍA',
    roles: ['Personal administrativo'],
    permisos: ['envio.registrar', 'envio.reprogramar', 'envio.cancelar'],
    puestoActual: 'Personal administrativo',
    sucursal: 'Matriz Culiacán',
    sucursalId: 1,
    requiereCambioPassword: false,
  } satisfies UsuarioSesionMock,

  chofer: {
    id: 1011,
    empleadoOClienteId: 11,
    email: 'chofer.luis@transportesrojas.com',
    tipoUsuario: 'Empleado',
    nombreCompleto: 'LUIS FERNANDO SALAZAR MEZA',
    nombre: 'LUIS FERNANDO',
    roles: ['Chofer'],
    permisos: [
      'ruta.iniciar_recorrido',
      'envio.validar_entrega',
      'envio.reprogramar',
      'envio.devolucion_registrar',
    ],
    puestoActual: 'Chofer',
    sucursal: 'Matriz Culiacán',
    sucursalId: 1,
    requiereCambioPassword: false,
  } satisfies UsuarioSesionMock,

  rh: {
    id: 1015,
    empleadoOClienteId: 15,
    email: 'rh@transportesrojas.com',
    tipoUsuario: 'Empleado',
    nombreCompleto: 'ANA PAULA BELTRÁN',
    nombre: 'ANA PAULA',
    roles: ['RH'],
    permisos: [],
    puestoActual: 'Recursos Humanos',
    sucursal: 'Matriz Culiacán',
    sucursalId: 1,
    requiereCambioPassword: false,
  } satisfies UsuarioSesionMock,
};

export async function abrirAccionTabla(page: Page, textoFila: string, accionLabel: string) {
  const fila = page.locator('tbody tr', { hasText: textoFila }).first();
  await expect(fila).toBeVisible();
  const btnOpciones = fila.locator('button[title="Opciones"]');
  await btnOpciones.scrollIntoViewIfNeeded();
  await btnOpciones.click();
  const menu = page.locator('[role="menu"]');
  if (!(await menu.isVisible())) {
    await btnOpciones.click();
  }
  const menuItem = menu.locator('button[role="menuitem"]', { hasText: accionLabel }).first();
  await expect(menuItem).toBeVisible();
  await menuItem.click();
}

export async function dibujarFirmaEnCanvas(page: Page, canvasSelector = 'canvas') {
  const canvas = page.locator(canvasSelector).first();
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('No se encontró boundingBox del canvas de firma');
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 110, box.y + 45, { steps: 6 });
  await page.mouse.up();
}
