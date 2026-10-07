export interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export type FormData = Omit<Rol, "id">;
export type SortDir = "asc" | "desc";
export type SortCol = keyof Rol | null;

export interface Filters {
  id: string;
  nombre: string;
  descripcion: string;
}

export const FORM_VACIO: FormData = { nombre: "", descripcion: "" };
export const FILTERS_VACIO: Filters = { id: "", nombre: "", descripcion: "" };
export const OPCIONES_PAGINA = [10, 25, 50, 100] as const;
