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
