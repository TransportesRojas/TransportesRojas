export interface Unidad {
  id: number;
  flotillaId: number;
  placas: string;
  tipoVehiculo: string;
  marca: string;
  modelo: string;
  anio: number;
  capacidadKg: number | null;
  kmOdometroInicial: number | null;
  kmOdometroActual: number | null;
  estado: string;
  activo: boolean;
}

export type FormData = Omit<Unidad, "id">;
export type SortDir = "asc" | "desc";
export type SortCol = keyof Unidad | null;

export interface Filters {
  id: string;
  flotillaId: string;
  placas: string;
  tipoVehiculo: string;
  marca: string;
  modelo: string;
  anio: string;
  capacidadKg: string;
  kmOdometroInicial: string;
  kmOdometroActual: string;
  estado: string;
  activo: string;
}

export const FORM_VACIO: FormData = {
  flotillaId: 0,
  placas: "",
  tipoVehiculo: "",
  marca: "",
  modelo: "",
  anio: new Date().getFullYear(),
  capacidadKg: null,
  kmOdometroInicial: null,
  kmOdometroActual: null,
  estado: "Disponible",
  activo: true,
};

export const FILTERS_VACIO: Filters = {
  id: "",
  flotillaId: "",
  placas: "",
  tipoVehiculo: "",
  marca: "",
  modelo: "",
  anio: "",
  capacidadKg: "",
  kmOdometroInicial: "",
  kmOdometroActual: "",
  estado: "",
  activo: "",
};

export const OPCIONES_PAGINA = [10, 25, 50, 100] as const;
export const ESTADOS = ["Disponible", "EnRuta", "Mantenimiento", "FueraDeServicio"];
export const TIPOS_VEH = ["Camion", "Camioneta", "Sedan", "SUV", "Motocicleta"];
