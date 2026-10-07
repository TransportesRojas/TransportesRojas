export interface Usuario {
  id: number;
  email: string;
  tipoUsuario: string;
  activo: boolean;
  ultimoAcceso: string | null;
}

export type FormData = {
  email: string;
  tipoUsuario: string;
  password?: string;
  activo: boolean;
};

export type SortDir = "asc" | "desc";
export type SortCol = keyof Usuario | null;

export interface Filters {
  id: string;
  email: string;
  tipoUsuario: string;
  activo: string;
  ultimoAcceso: string;
}

export const FORM_VACIO: FormData = {
  email: "",
  tipoUsuario: "Empleado",
  password: "",
  activo: true,
};

export const FILTERS_VACIO: Filters = {
  id: "",
  email: "",
  tipoUsuario: "",
  activo: "",
  ultimoAcceso: "",
};

export const OPCIONES_PAGINA = [10, 25, 50, 100] as const;
export const TIPOS_USR = ["Empleado", "Cliente", "Sistema"];
