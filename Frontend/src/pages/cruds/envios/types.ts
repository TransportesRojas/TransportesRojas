import { getSession } from "../../../utils/auth";

export type EstadoEnvioCodigo =
  | "registrado"
  | "recoleccion_programada"
  | "recoleccion_realizada"
  | "recibido_sucursal"
  | "asignado_flotilla"
  | "en_ruta"
  | "entregado"
  | "no_entregado"
  | "reprogramado"
  | "en_devolucion"
  | "devuelto"
  | "cancelado";

export interface EstadoEnvioMeta {
  codigo: EstadoEnvioCodigo;
  etiqueta: string;
  descripcion: string;
  badgeClass: string;
  dotClass: string;
  categoria: "pendiente" | "transito" | "entregado" | "incidencia";
}

export const ESTADOS_ENVIO_META: Record<EstadoEnvioCodigo, EstadoEnvioMeta> = {
  registrado: {
    codigo: "registrado",
    etiqueta: "Registrado",
    descripcion: "Guía documentada pendiente de recepción física en sucursal",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    dotClass: "bg-slate-500",
    categoria: "pendiente",
  },
  recoleccion_programada: {
    codigo: "recoleccion_programada",
    etiqueta: "Recolección programada",
    descripcion: "Cita activa para recolectar paquete en domicilio del remitente",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
    dotClass: "bg-amber-500",
    categoria: "pendiente",
  },
  recoleccion_realizada: {
    codigo: "recoleccion_realizada",
    etiqueta: "Recolectado",
    descripcion: "Paquete recolectado en domicilio, en traslado a sucursal/ruta",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-300",
    dotClass: "bg-sky-500",
    categoria: "pendiente",
  },
  recibido_sucursal: {
    codigo: "recibido_sucursal",
    etiqueta: "En sucursal",
    descripcion: "Paquete verificado físicamente en mostrador y listo para asignar ruta",
    badgeClass: "bg-blue-50 text-[#0B2D4A] border-blue-200",
    dotClass: "bg-[#0B2D4A]",
    categoria: "pendiente",
  },
  asignado_flotilla: {
    codigo: "asignado_flotilla",
    etiqueta: "Asignado a flotilla",
    descripcion: "Vinculado a hoja de ruta, unidad y operador para reparto",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
    dotClass: "bg-indigo-600",
    categoria: "transito",
  },
  en_ruta: {
    codigo: "en_ruta",
    etiqueta: "En ruta de entrega",
    descripcion: "En recorrido activo hacia el domicilio del destinatario",
    badgeClass: "bg-blue-100/80 text-blue-800 border-blue-300",
    dotClass: "bg-[#2563EB]",
    categoria: "transito",
  },
  entregado: {
    codigo: "entregado",
    etiqueta: "Entregado",
    descripcion: "Entregado satisfactoriamente validando PIN de seguridad",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
    dotClass: "bg-[#16A34A]",
    categoria: "entregado",
  },
  no_entregado: {
    codigo: "no_entregado",
    etiqueta: "Intento fallido",
    descripcion: "No fue posible concretar la entrega en visita de reparto",
    badgeClass: "bg-orange-50 text-orange-800 border-orange-300",
    dotClass: "bg-[#F97316]",
    categoria: "incidencia",
  },
  reprogramado: {
    codigo: "reprogramado",
    etiqueta: "Reprogramado",
    descripcion: "Nueva fecha de visita agendada tras reporte de incidencia",
    badgeClass: "bg-amber-100/70 text-amber-900 border-amber-300",
    dotClass: "bg-amber-600",
    categoria: "incidencia",
  },
  en_devolucion: {
    codigo: "en_devolucion",
    etiqueta: "En devolución",
    descripcion: "En tránsito de retorno hacia la sucursal o remitente",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-300",
    dotClass: "bg-[#D64545]",
    categoria: "incidencia",
  },
  devuelto: {
    codigo: "devuelto",
    etiqueta: "Devuelto al remitente",
    descripcion: "Paquete retornado y cerrado con el remitente",
    badgeClass: "bg-slate-200/80 text-slate-800 border-slate-400",
    dotClass: "bg-slate-600",
    categoria: "incidencia",
  },
  cancelado: {
    codigo: "cancelado",
    etiqueta: "Cancelado",
    descripcion: "Guía dada de baja con registro de auditoría",
    badgeClass: "bg-red-50 text-[#D64545] border-red-200",
    dotClass: "bg-[#D64545]",
    categoria: "incidencia",
  },
};

export const LISTA_ESTADOS_ENVIO: EstadoEnvioMeta[] = Object.values(ESTADOS_ENVIO_META);

export function obtenerMetaEstadoEnvio(estado?: string | null): EstadoEnvioMeta {
  const normalizado = (estado || "registrado").trim().toLowerCase() as EstadoEnvioCodigo;
  return (
    ESTADOS_ENVIO_META[normalizado] ?? {
      codigo: "registrado",
      etiqueta: estado || "Desconocido",
      descripcion: "Estado del envío",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
      dotClass: "bg-slate-500",
      categoria: "pendiente",
    }
  );
}

export interface DireccionSnapshotDto {
  calle?: string | null;
  numeroExterior?: string | null;
  numeroInterior?: string | null;
  entreCalles?: string | null;
  colonia?: string | null;
  localidad?: string | null;
  municipio?: string | null;
  estado?: string | null;
  codigoPostal?: string | null;
  pais?: string | null;
  referencias?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  asentamientoId?: number | null;
  localidadId?: number | null;
  municipioId?: number | null;
  estadoId?: number | null;
}

export interface EnvioListadoItem {
  id: number;
  guia: string;
  estado: EstadoEnvioCodigo | string;
  remitenteId: number;
  remitenteNombre: string;
  remitenteTelefono?: string | null;
  destinatarioNombre: string;
  destinatarioTelefono: string;
  destinatarioEmail?: string | null;
  destinoCiudadResumen?: string | null;
  destinoCodigoPostal?: string | null;
  requiereRecoleccion: boolean;
  sucursalRecepcionId?: number | null;
  sucursalRecepcionNombre?: string | null;
  sucursalDestinoId?: number | null;
  sucursalDestinoNombre?: string | null;
  pesoKg: number;
  largoCm: number;
  anchoCm: number;
  altoCm: number;
  descripcion: string;
  valorDeclarado?: number | null;
  intentoReparto: number;
  flotillaAsignadaNombre?: string | null;
  flotillaAsignadaId?: number | null;
  choferAsignadoNombre?: string | null;
  unidadAsignadaPlacas?: string | null;
  fechaCreacion: string;
  fechaEntregaEstimada?: string | null;
  rutaAsignadaId?: number | null;
  destinoLatitud?: number | null;
  destinoLongitud?: number | null;
  destinoCalleCompleta?: string | null;
}

export interface EventoEnvioItem {
  id: number;
  estado: string;
  descripcion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  registradoPorNombre?: string | null;
  fechaEvento: string;
}

export interface RecepcionPaqueteDto {
  fechaRecepcion: string;
  recibidoPorNombre: string;
  pesoVerificadoKg?: number | null;
  largoVerificadoCm?: number | null;
  anchoVerificadoCm?: number | null;
  altoVerificadoCm?: number | null;
  evidenciaFotoUrl?: string | null;
  observaciones?: string | null;
}

export interface CitaRecoleccionDto {
  id: number;
  estado: string;
  fechaHoraSolicitada: string;
  fechaHoraConfirmada?: string | null;
  motivo?: string | null;
  observaciones?: string | null;
  direccion?: DireccionSnapshotDto | null;
}

export interface RutaAsignadaResumenDto {
  rutaId: number;
  estadoRuta: string;
  fecha: string;
  flotillaId?: number | null;
  flotillaNombre?: string | null;
  choferId?: number | null;
  choferNombre?: string | null;
  unidadId?: number | null;
  unidadPlacas?: string | null;
  ordenEntrega: number;
  estadoRutaEnvio: string;
}

export interface EntregaIntentoDto {
  id: number;
  intentoReparto: number;
  choferNombre: string;
  fechaHora: string;
  validado: boolean;
  estado: string;
  observaciones?: string | null;
  evidenciaFotoUrl?: string | null;
  firmaUrl?: string | null;
}

export interface EnvioDetalleResponse extends EnvioListadoItem {
  remitenteEmail?: string | null;
  destinatarioClienteId?: number | null;
  direccionOrigen?: DireccionSnapshotDto | null;
  direccionDestino?: DireccionSnapshotDto | null;
  recepcion?: RecepcionPaqueteDto | null;
  citasRecoleccion: CitaRecoleccionDto[];
  rutasAsignadas: RutaAsignadaResumenDto[];
  entregas: EntregaIntentoDto[];
  eventos: EventoEnvioItem[];
  codigoSeguridadCliente?: string | null;
}

export interface DireccionEnvioInput {
  asentamientoId?: number | null;
  localidadId?: number | null;
  estadoId?: number | null;
  municipioId?: number | null;
  codigoPostal?: string | null;
  estado?: string | null;
  municipio?: string | null;
  localidad?: string | null;
  colonia?: string | null;
  calle: string;
  numeroExterior: string;
  numeroInterior?: string | null;
  entreCalles?: string | null;
  referencias?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}

export const DIRECCION_ENVIO_VACIA: DireccionEnvioInput = {
  asentamientoId: null,
  localidadId: null,
  estadoId: null,
  municipioId: null,
  codigoPostal: "",
  estado: "",
  municipio: "",
  localidad: "",
  colonia: "",
  calle: "",
  numeroExterior: "",
  numeroInterior: "",
  entreCalles: "",
  referencias: "",
  latitud: null,
  longitud: null,
};

export function validarDireccionEnvio(
  dir: DireccionEnvioInput | null | undefined,
  etiquetaSeccion = "destino"
): string | null {
  if (!dir) {
    return `Debes completar la dirección de ${etiquetaSeccion}.`;
  }

  const cpDigitos = (dir.codigoPostal || "").replace(/\D/g, "");
  const tieneCatalogo = Boolean(dir.asentamientoId && dir.asentamientoId > 0);

  if (!tieneCatalogo) {
    if (cpDigitos.length !== 5) {
      return `Ingresa un Código Postal válido de 5 dígitos en la dirección de ${etiquetaSeccion}.`;
    }
    if (!(dir.colonia || "").trim()) {
      return `Selecciona o escribe la colonia en la dirección de ${etiquetaSeccion}.`;
    }
    if (!(dir.municipio || "").trim() || !(dir.estado || "").trim()) {
      return `Indica el municipio y estado en la dirección de ${etiquetaSeccion}.`;
    }
  }

  if (!(dir.calle || "").trim()) {
    return `La calle o vialidad es obligatoria en la dirección de ${etiquetaSeccion}.`;
  }

  if ((dir.numeroExterior || "").trim().length > 30) {
    return `El número exterior no puede exceder 30 caracteres en la dirección de ${etiquetaSeccion}.`;
  }

  if (!(dir.entreCalles || "").trim()) {
    return `El campo entre calles es obligatorio en la dirección de ${etiquetaSeccion}.`;
  }

  if (!(dir.referencias || "").trim()) {
    return `Las referencias de entrega son obligatorias en la dirección de ${etiquetaSeccion}.`;
  }

  return null;
}

export interface CrearEnvioPayload {
  remitenteId?: number | null;
  destinatarioClienteId?: number | null;
  destinatarioNombre: string;
  destinatarioTelefono: string;
  destinatarioEmail?: string | null;
  requiereRecoleccion: boolean;
  sucursalRecepcionId?: number | null;
  sucursalDestinoId?: number | null;
  direccionOrigen?: DireccionEnvioInput | null;
  fechaHoraRecoleccionSolicitada?: string | null;
  observacionesRecoleccion?: string | null;
  direccionDestino: DireccionEnvioInput;
  pesoKg: number;
  largoCm: number;
  anchoCm: number;
  altoCm: number;
  descripcion: string;
  valorDeclarado?: number | null;
  fechaEntregaEstimada?: string | null;
}

export interface CrearEnvioResponse {
  guia: string;
  codigoSeguridadEntrega?: string | null;
  envio: EnvioDetalleResponse;
}

export interface EventoRastreoPublicoItem {
  estado: string;
  descripcion?: string | null;
  fechaEvento: string;
}

export interface RastreoPublicoResponse {
  guia: string;
  estado: string;
  requiereRecoleccion: boolean;
  origenResumen?: string | null;
  destinoResumen?: string | null;
  sucursalRecepcionNombre?: string | null;
  sucursalDestinoNombre?: string | null;
  pesoKg: number;
  descripcionPaquete: string;
  intentoReparto: number;
  fechaCreacion: string;
  fechaEntregaEstimada?: string | null;
  eventos: EventoRastreoPublicoItem[];
}

export interface ColoniaSepomexItem {
  id: number;
  nombre: string;
  tipoAsentamiento: string;
  zona?: string | null;
  ciudad?: string | null;
}

export interface CoberturaSugeridaResponse {
  sucursalId: number;
  sucursalNombre: string;
  sucursalNombreCorto?: string | null;
  sucursalCodigo?: string | null;
  aplicaRecoleccion: boolean;
  aplicaEntrega: boolean;
  esZonaExtendida: boolean;
  diasEstimados: number;
}

export interface ConsultaCodigoPostalResponse {
  codigoPostal: string;
  estadoId: number;
  estadoNombre: string;
  estadoAbreviatura: string;
  municipioId: number;
  municipioNombre: string;
  ciudad?: string | null;
  localidadSugeridaId?: number | null;
  latitudSugerida?: number | null;
  longitudSugerida?: number | null;
  colonias: ColoniaSepomexItem[];
  coberturaSugerida?: CoberturaSugeridaResponse | null;
}

export interface SucursalOperativaItem {
  id: number;
  nombre: string;
  nombreCorto?: string | null;
  codigo?: string | null;
  calle?: string | null;
  municipio?: string | null;
  estado?: string | null;
  codigoPostal?: string | null;
  telefono?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}

export interface ClienteCatalogoItem {
  id: number;
  usuarioId?: number | null;
  nombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  telefono?: string | null;
  email?: string | null;
  activo: boolean;
}

export function formatearNombreCliente(c: ClienteCatalogoItem): string {
  return [c.nombre, c.apellidoPaterno, c.apellidoMaterno]
    .map((p) => (p || "").trim())
    .filter(Boolean)
    .join(" ");
}

export interface FlotillaAsignableItem {
  id: number;
  nombre: string;
  codigo?: string | null;
  sucursalId?: number | null;
  sucursalNombre?: string | null;
  supervisorId?: number | null;
}

export interface UnidadAsignableItem {
  id: number;
  placas: string;
  marca?: string | null;
  modelo?: string | null;
  tipoVehiculo?: string | null;
  capacidadKg: number;
  estado: string;
  flotillaId?: number | null;
}

export interface ChoferAsignableItem {
  empleadoId: number;
  nombreCompleto: string;
  telefono?: string | null;
  sucursalId?: number | null;
  flotillaActivaId?: number | null;
}

export interface RecursosAsignacionEnvioResponse {
  flotillas: FlotillaAsignableItem[];
  unidades: UnidadAsignableItem[];
  choferes: ChoferAsignableItem[];
}

export interface PlanificarRutaConsolidadaPayload {
  flotillaId: number;
  unidadId: number;
  choferId: number;
  enviosIdsOrdenados: number[];
  fechaRuta?: string | null;
  distanciaEstimadaKm?: number | null;
  tiempoEstimadoMin?: number | null;
  consumoCombustibleEstimadoLitros?: number | null;
  nombreRutaRecomendada?: string | null;
  observaciones?: string | null;
}

export interface RutaPlanificadaResultadoResponse {
  rutaId?: number;
  flotillaId: number;
  flotillaNombre?: string;
  choferId: number;
  choferNombre?: string;
  unidadId: number;
  unidadPlacas?: string;
  fecha?: string;
  distanciaEstimadaKm?: number | null;
  tiempoEstimadoMin?: number | null;
  consumoCombustibleEstimadoLitros?: number | null;
  totalParadas: number;
  guiasAsignadas: string[];
}

export type ModoModalRecepcion = "sucursal" | "recoleccion";
export type ModoModalRuta = "asignar" | "iniciar_ruta";
export type ModoModalEstadoEspecial =
  | "reprogramar"
  | "cancelar"
  | "devolucion"
  | "confirmar_devolucion";

export type SortDir = "asc" | "desc";

export type SortCol = keyof EnvioListadoItem | null;

export interface EnvioFilters {
  estado: string;
  modalidad: string;
  sucursal: string;
}

export const ENVIO_FILTERS_VACIO: EnvioFilters = {
  estado: "",
  modalidad: "",
  sucursal: "",
};

export const OPCIONES_PAGINA = [5, 10, 25, 50];

export function formatearFechaHora(iso?: string | null): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatearFechaCorta(iso?: string | null): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatearDireccionCompleta(dir?: DireccionSnapshotDto | null): string {
  if (!dir) return "Sin domicilio registrado";
  const extRaw = (dir.numeroExterior || "").trim();
  const extFmt = !extRaw
    ? null
    : /^(s\/?n|sin\s*n[uú]mero)$/i.test(extRaw)
      ? "S/N"
      : `#${extRaw}`;
  const lineaCalle = [
    dir.calle,
    extFmt,
    dir.numeroInterior ? `Int. ${dir.numeroInterior}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const lineaUbicacion = [
    dir.colonia ? `Col. ${dir.colonia}` : null,
    dir.codigoPostal ? `C.P. ${dir.codigoPostal}` : null,
    dir.municipio,
    dir.estado,
  ]
    .filter(Boolean)
    .join(", ");

  return [lineaCalle, lineaUbicacion].filter(Boolean).join(" — ") || "Sin domicilio registrado";
}

export function usuarioTienePermisoEnvio(
  codigoPermiso: string,
  rolesRespaldo: string[] = []
): boolean {
  const session = getSession();
  if (!session.isAuthenticated || !session.user) return false;

  const rolesNorm = (session.roles || []).map((r) => r.trim().toLowerCase());
  const permisos = (session.user.permisos || []).map((p) => p.trim().toLowerCase());
  if (permisos.includes(codigoPermiso.trim().toLowerCase())) return true;

  if (permisos.length === 0 && rolesRespaldo.length > 0) {
    return rolesRespaldo.some((r) => rolesNorm.includes(r.trim().toLowerCase()));
  }

  return false;
}

export interface NotificarCambioRutaPayload {
  motivo: string;
  referenciaLugar?: string | null;
  descripcionTrayecto?: string | null;
  afectaEntrega?: boolean;
  fechaEvento?: string | null;
}

export interface CambioRutaItemResponse {
  id: number;
  folio: string;
  rutaId: number;
  choferId: number;
  choferNombre: string;
  unidadId?: number | null;
  unidadPlacas?: string | null;
  motivo: string;
  referenciaLugar?: string | null;
  descripcionTrayecto?: string | null;
  fechaEvento: string;
  afectaEntrega: boolean;
  estadoAviso: string;
  fechaRegistro: string;
}


