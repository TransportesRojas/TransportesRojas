export interface Cliente {
  id: number;
  usuarioId: number | null;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  telefono: string;
  email: string;
  activo: boolean;
}

export type FormData = Omit<Cliente, "id">;
export type SortDir = "asc" | "desc";
export type SortCol = keyof Cliente | null;

export interface Filters {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  telefono: string;
  email: string;
  usuarioId: string;
  activo: string;
}

export const FORM_VACIO: FormData = {
  usuarioId: null,
  nombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  telefono: "",
  email: "",
  activo: true,
};

export const FILTERS_VACIO: Filters = {
  id: "",
  nombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  telefono: "",
  email: "",
  usuarioId: "",
  activo: "",
};

export const OPCIONES_PAGINA = [10, 25, 50, 100] as const;
