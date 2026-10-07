export interface Permiso {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  modulo: string;
}

export type FormData = Omit<Permiso, "id">;
export type SortDir = "asc" | "desc";
export type SortCol = keyof Permiso | null;

export interface Filters {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  modulo: string;
}

export const FORM_VACIO: FormData = {
  codigo: "",
  nombre: "",
  descripcion: "",
  modulo: "",
};

export const FILTERS_VACIO: Filters = {
  id: "",
  codigo: "",
  nombre: "",
  descripcion: "",
  modulo: "",
};

export const OPCIONES_PAGINA = [10, 25, 50, 100] as const;
export const MODULOS = [
  "Clientes",
  "Empleados",
  "Flotillas",
  "Unidades",
  "Reportes",
  "Configuracion",
  "Usuarios",
];
