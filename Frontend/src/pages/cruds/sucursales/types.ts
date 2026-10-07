export interface Sucursal {
  id: number;
  nombre: string;
  calle: string | null;
  municipio: string | null;
  estado: string | null;
  codigoPostal: string | null;
  telefono: string | null;
}

export type FormData = Omit<Sucursal, "id">;
export type SortDir = "asc" | "desc";
export type SortCol = keyof Sucursal | null;

export interface Filters {
  id: string;
  nombre: string;
  calle: string;
  municipio: string;
  estado: string;
  codigoPostal: string;
  telefono: string;
}

export const FORM_VACIO: FormData = {
  nombre: "",
  calle: "",
  municipio: "",
  estado: "",
  codigoPostal: "",
  telefono: "",
};

export const FILTERS_VACIO: Filters = {
  id: "",
  nombre: "",
  calle: "",
  municipio: "",
  estado: "",
  codigoPostal: "",
  telefono: "",
};

export const OPCIONES_PAGINA = [10, 25, 50, 100] as const;
