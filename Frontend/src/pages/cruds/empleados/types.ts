export interface Empleado {
  id: number;
  usuarioId: number;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  telefono: string | null;
  email: string;
  sucursalId: number | null;
  rolId?: number | null;
  fechaIngreso: string;
  activo: boolean;
}

export type FormData = Omit<Empleado, "id">;
export type SortDir = "asc" | "desc";
export type SortCol = keyof Empleado | null;

export interface Filters {
  id: string;
  usuarioId: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  telefono: string;
  email: string;
  sucursalId: string;
  fechaIngreso: string;
  activo: string;
}

export const FORM_VACIO: FormData = {
  usuarioId: 0,
  nombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  telefono: "",
  email: "",
  sucursalId: null,
  rolId: null,
  fechaIngreso: new Date().toISOString().slice(0, 10),
  activo: true,
};

export const FILTERS_VACIO: Filters = {
  id: "",
  usuarioId: "",
  nombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  telefono: "",
  email: "",
  sucursalId: "",
  fechaIngreso: "",
  activo: "",
};

export const OPCIONES_PAGINA = [10, 25, 50, 100] as const;
