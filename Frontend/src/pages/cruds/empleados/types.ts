export interface Empleado {
  id: number;
  usuarioId: number;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  telefono: string | null;
  email: string;
  sucursalId: number | null;
  sucursalNombre?: string | null;
  puestoId?: number | null;
  puestoNombre?: string | null;
  roles?: string[];
  rolId?: number | null;
  fechaIngreso: string;
  activo: boolean;
  estadoAcceso?: "activo" | "suspendido" | "desactivado" | string;
}

export interface FormData {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  telefono: string;
  email: string;
  sucursalId: number | null;
  puestoId: number | null;
  rolesAdicionalesIds: number[];
  rolId?: number | null;
  fechaIngreso: string;
  activo: boolean;
  password?: string;
}

export interface HistorialPuestoItem {
  puestoId: number;
  puestoNombre: string;
  fechaInicio: string;
  fechaFin: string | null;
  motivoCambio?: string | null;
  motivo?: string | null;
}

export type SortDir = "asc" | "desc";
export type SortCol = keyof Empleado | null;

export interface Filters {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  telefono: string;
  email: string;
  sucursal: string;
  puesto: string;
  rol: string;
  fechaIngreso: string;
  activo: string;
}

export const FORM_VACIO: FormData = {
  nombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  telefono: "",
  email: "",
  sucursalId: null,
  puestoId: null,
  rolesAdicionalesIds: [],
  rolId: null,
  fechaIngreso: new Date().toISOString().slice(0, 10),
  activo: true,
  password: "",
};

export const FILTERS_VACIO: Filters = {
  id: "",
  nombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  telefono: "",
  email: "",
  sucursal: "",
  puesto: "",
  rol: "",
  fechaIngreso: "",
  activo: "si",
};

export const OPCIONES_PAGINA = [10, 25, 50, 100] as const;

export interface SucursalCargoItem {
  id: number;
  nombre: string;
  alias: string | null;
  codigo: string | null;
}

export interface ExpedienteEmpleado {
  id: number;
  clave: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  nombreCompleto: string;
  email: string | null;
  telefono: string | null;
  sucursalId: number | null;
  sucursalNombre: string | null;
  sucursalAlias: string | null;
  sucursalCodigo: string | null;
  puestoActual: string | null;
  fechaIngreso: string | null;
  antiguedadTexto: string;
  activo: boolean;
  createdAt: string;
  roles: string[];
  trayectoriaLaboral: HistorialPuestoItem[];
  sucursalesACargo: SucursalCargoItem[];
}

