export interface Flotilla {
  id: number;
  nombre: string;
  codigo: string | null;
  sucursalId: number | null;
  supervisorId: number | null;
  activo: boolean;
}

export type FormData = Omit<Flotilla, "id">;
export type SortDir = "asc" | "desc";
export type SortCol = keyof Flotilla | null;

export interface Filters {
  id: string;
  nombre: string;
  codigo: string;
  sucursalId: string;
  supervisorId: string;
  activo: string;
}

export const FORM_VACIO: FormData = {
  nombre: "",
  codigo: "",
  sucursalId: null,
  supervisorId: null,
  activo: true,
};

export const FILTERS_VACIO: Filters = {
  id: "",
  nombre: "",
  codigo: "",
  sucursalId: "",
  supervisorId: "",
  activo: "",
};

export const OPCIONES_PAGINA = [10, 25, 50, 100] as const;

export interface SucursalItem {
  id: number;
  nombre: string;
  nombreCorto?: string | null;
}

export interface EmpleadoItem {
  id: number;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
  puestoNombre?: string | null;
}

export interface UnidadOpcion {
  id: number;
  placas: string;
  tipoVehiculo?: string | null;
  modelo?: string | null;
  asignadaAOtraFlotilla: boolean;
  flotillaNombre?: string | null;
}

export interface ChoferOpcion {
  id: number;
  clave: string;
  nombreCompleto: string;
  asignadoAOtraFlotilla: boolean;
  flotillaNombre?: string | null;
}

export interface FlotillaAsignaciones {
  unidadesIds: number[];
  choferesIds: number[];
  unidadesDisponibles: UnidadOpcion[];
  choferesDisponibles: ChoferOpcion[];
}

export interface UnidadItem {
  id: number;
  flotillaId?: number | null;
  flotillaNombre?: string | null;
  placas: string;
  tipoVehiculo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  anio?: number | null;
  capacidadKg: number;
  kmOdometroInicial?: number | null;
  kmOdometroActual: number;
  estado: string;
  activo: boolean;
}

export interface UnidadFormData {
  flotillaId: number | null;
  placas: string;
  tipoVehiculo: string;
  marca: string;
  modelo: string;
  anio: number | string;
  capacidadKg: number | string;
  kmOdometroInicial?: number | string;
  kmOdometroActual?: number | string;
  estado: string;
  activo: boolean;
}

export const UNIDAD_FORM_VACIO: UnidadFormData = {
  flotillaId: null,
  placas: "",
  tipoVehiculo: "",
  marca: "",
  modelo: "",
  anio: new Date().getFullYear(),
  capacidadKg: 3500,
  kmOdometroInicial: 0,
  kmOdometroActual: 0,
  estado: "Disponible",
  activo: true,
};


