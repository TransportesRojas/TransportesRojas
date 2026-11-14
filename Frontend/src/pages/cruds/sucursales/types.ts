export interface Sucursal {
  id: number;
  nombre: string;
  nombreCorto?: string | null;
  codigo?: string | null;
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
  nombreCorto: string;
  codigo: string;
  calle: string;
  municipio: string;
  estado: string;
  codigoPostal: string;
  telefono: string;
}

export const FORM_VACIO: FormData = {
  nombre: "",
  nombreCorto: "",
  codigo: "",
  calle: "",
  municipio: "",
  estado: "",
  codigoPostal: "",
  telefono: "",
};

export const FILTERS_VACIO: Filters = {
  id: "",
  nombre: "",
  nombreCorto: "",
  codigo: "",
  calle: "",
  municipio: "",
  estado: "",
  codigoPostal: "",
  telefono: "",
};

export const OPCIONES_PAGINA = [10, 25, 50, 100] as const;
