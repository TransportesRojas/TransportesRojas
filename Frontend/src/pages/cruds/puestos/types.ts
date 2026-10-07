export interface Puesto {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export type FormData = Omit<Puesto, "id">;
export type SortDir = "asc" | "desc";
export type SortCol = keyof Puesto | null;

export interface Filters {
  id: string;
  nombre: string;
  descripcion: string;
}

export const FORM_VACIO: FormData = { nombre: "", descripcion: "" };
export const FILTERS_VACIO: Filters = { id: "", nombre: "", descripcion: "" };
export const OPCIONES_PAGINA = [10, 25, 50, 100] as const;
