export interface TipoMant {
  id: number;
  nombre: string;
  descripcion: string | null;
  kmIntervalo: number | null;
  aplicaATipoVehiculo: string | null;
  activo: boolean;
}

export type FormData = Omit<TipoMant, "id">;
export type SortDir = "asc" | "desc";
export type SortCol = keyof TipoMant | null;

export interface Filters {
  id: string;
  nombre: string;
  descripcion: string;
  kmIntervalo: string;
  aplicaATipoVehiculo: string;
  activo: string;
}

export const FORM_VACIO: FormData = {
  nombre: "",
  descripcion: "",
  kmIntervalo: null,
  aplicaATipoVehiculo: "",
  activo: true,
};

export const FILTERS_VACIO: Filters = {
  id: "",
  nombre: "",
  descripcion: "",
  kmIntervalo: "",
  aplicaATipoVehiculo: "",
  activo: "",
};

export const OPCIONES_PAGINA = [10, 25, 50, 100] as const;
export const TIPOS_VEH = [
  "Camion",
  "Camioneta",
  "Sedan",
  "SUV",
  "Motocicleta",
  "Todos",
];
