import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Truck,
  User,
  Calendar,
  Navigation,
  Gauge,
  Loader2,
  AlertTriangle,
  Sparkles,
  Fuel,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Package,
  Plus,
  Search,
  Layers,
  ArrowUpDown,
  Zap,
  Star,
  Trash2,
} from "lucide-react";
import { envioService, extraerMensajeErrorApi } from "../../../services/envioService";
import { fetchApi } from "../../../services/api";
import { getSession, hasRequiredRole } from "../../../utils/auth";
import { useToast } from "../../../components/Toast";
import {
  bloquearTeclasNoNumericas,
  limpiarDecimalPositivo,
} from "../../../utils/inputValidation";
import {
  type ChoferAsignableItem,
  type EnvioListadoItem,
  type FlotillaAsignableItem,
  type ModoModalRuta,
  type UnidadAsignableItem,
  obtenerMetaEstadoEnvio,
} from "./types";
import { MapaRutaInteractivo } from "../rutas/MapaRutaInteractivo";

interface EnvioModalAsignarRutaProps {
  abierto: boolean;
  modo: ModoModalRuta;
  envio: EnvioListadoItem | null;
  enviosDisponibles?: EnvioListadoItem[];
  flotillaPreseleccionadaId?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export interface PuntoGeografico {
  lat: number;
  lon: number;
  distanciaBaseKm: number;
  tiempoBaseMin: number;
  corredorOptimo: string;
  corredorAlterno: string;
  zonaClave: string;
}

export interface ParadaOptimizadaItem {
  envio: EnvioListadoItem;
  orden: number;
  distanciaTramoKm: number;
  distanciaAcumuladaKm: number;
  tiempoTramoMin: number;
  tiempoAcumuladoMin: number;
  combustibleTramoLitros: number;
  corredorVial: string;
}

export interface LoteGeografico {
  id: string;
  nombre: string;
  subtitulo: string;
  corredorVial: string;
  colorClass: string;
  badgeClass: string;
  envios: EnvioListadoItem[];
  totalPaquetes: number;
  pesoTotalKg: number;
  codigosPostales: string[];
}

const CONFIG_ZONAS_LOTES: Record<
  string,
  {
    nombre: string;
    subtitulo: string;
    corredorVial: string;
    colorClass: string;
    badgeClass: string;
  }
> = {
  "CUL-CENTRO": {
    nombre: "Lote Sector Centro / Almada",
    subtitulo: "Centro Histórico, Jorge Almada, Av. Obregón",
    corredorVial: "Av. Álvaro Obregón / Calle Ángel Flores",
    colorClass: "border-blue-300 bg-blue-50/70 text-blue-950",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  "CUL-PONIENTE": {
    nombre: "Lote Sector Poniente / Canaco",
    subtitulo: "El Palmito, Bachigualato, Parque Canaco",
    corredorVial: "Blvd. Emiliano Zapata / Blvd. Jesús Kumate",
    colorClass: "border-amber-300 bg-amber-50/70 text-amber-950",
    badgeClass: "bg-amber-100 text-amber-800",
  },
  "CUL-NORTE": {
    nombre: "Lote Sector Norte / Chapultepec",
    subtitulo: "Humaya, Chapultepec, Universitarios",
    corredorVial: "Puente Miguel Hidalgo / Blvd. Sánchez Alonso",
    colorClass: "border-emerald-300 bg-emerald-50/70 text-emerald-950",
    badgeClass: "bg-emerald-100 text-emerald-800",
  },
  "CUL-TRES-RIOS": {
    nombre: "Lote Corredor Tres Ríos",
    subtitulo: "Desarrollo Urbano Tres Ríos, Blvd. Pedro Infante",
    corredorVial: "Blvd. Pedro Infante / Blvd. Niños Héroes",
    colorClass: "border-indigo-300 bg-indigo-50/70 text-indigo-950",
    badgeClass: "bg-indigo-100 text-indigo-800",
  },
  "CUL-QUINTAS": {
    nombre: "Lote Sector Oriente / Las Quintas",
    subtitulo: "Las Quintas, La Campiña, Blvd. Eldorado",
    corredorVial: "Blvd. Francisco I. Madero / Blvd. Dr. Mora",
    colorClass: "border-teal-300 bg-teal-50/70 text-teal-950",
    badgeClass: "bg-teal-100 text-teal-800",
  },
  "CUL-SURESTE": {
    nombre: "Lote Sector Sureste / Col. Sinaloa",
    subtitulo: "Col. Sinaloa, Calz. Heroico Colegio Militar",
    corredorVial: "Calz. Heroico Colegio Militar / Blvd. Madero",
    colorClass: "border-purple-300 bg-purple-50/70 text-purple-950",
    badgeClass: "bg-purple-100 text-purple-800",
  },
  "SUR-MAZATLAN": {
    nombre: "Lote Foráneo Sur (Mazatlán)",
    subtitulo: "Mazatlán, Zona Dorada, Av. Ejército Mexicano",
    corredorVial: "Maxipista Culiacán - Mazatlán 15D",
    colorClass: "border-cyan-300 bg-cyan-50/70 text-cyan-950",
    badgeClass: "bg-cyan-100 text-cyan-800",
  },
  "NORTE-MOCHIS": {
    nombre: "Lote Foráneo Norte (Los Mochis)",
    subtitulo: "Los Mochis, Ahome, Blvd. Rosendo G. Castro",
    corredorVial: "Autopista Federal 15D Norte",
    colorClass: "border-sky-300 bg-sky-50/70 text-sky-950",
    badgeClass: "bg-sky-100 text-sky-800",
  },
  "NORTE-GUASAVE": {
    nombre: "Lote Foráneo Guasave",
    subtitulo: "Guasave, Las Brisas, Corredor Agrícola",
    corredorVial: "Carretera Internacional 15D Norte",
    colorClass: "border-orange-300 bg-orange-50/70 text-orange-950",
    badgeClass: "bg-orange-100 text-orange-800",
  },
  "PONIENTE-NAVOLATO": {
    nombre: "Lote Suburbano Navolato",
    subtitulo: "Navolato, Aguaruto, San Pedro",
    corredorVial: "Autopista Cuatro Carriles Estatal 30",
    colorClass: "border-rose-300 bg-rose-50/70 text-rose-950",
    badgeClass: "bg-rose-100 text-rose-800",
  },
};

function obtenerConfigZonaLote(
  zonaClave: string,
  ciudad: string
): {
  nombre: string;
  subtitulo: string;
  corredorVial: string;
  colorClass: string;
  badgeClass: string;
} {
  if (CONFIG_ZONAS_LOTES[zonaClave]) {
    return CONFIG_ZONAS_LOTES[zonaClave];
  }
  return {
    nombre: `Lote Sector ${ciudad || zonaClave}`,
    subtitulo: `Envíos agrupados por proximidad en ${ciudad || "Sinaloa"}`,
    corredorVial: "Corredor vial logístico principal",
    colorClass: "border-slate-300 bg-slate-50/80 text-slate-800",
    badgeClass: "bg-slate-200 text-slate-800",
  };
}

function obtenerFechaHoyIso(): string {
  const hoy = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
}

// Rendimiento estimado y métricas de ruta
export function calcularRendimientoUnidadKmPorLitro(
  unidad: UnidadAsignableItem | null,
  pesoTotalKg: number
): { kmPorLitro: number; categoriaVehiculo: string } {
  if (!unidad) {
    return { kmPorLitro: 8.5, categoriaVehiculo: "Van de Reparto Estándar" };
  }

  const tipo = (unidad.tipoVehiculo || `${unidad.marca ?? ""} ${unidad.modelo ?? ""}`).toLowerCase();
  const cap = Number(unidad.capacidadKg) || 1500;

  let baseKmL = 8.5;
  let categoria = "Van / Camioneta Última Milla";

  if (tipo.includes("moto") || cap <= 350) {
    baseKmL = 22.0;
    categoria = "Unidad Ligera / Motocicleta";
  } else if (tipo.includes("sedan") || tipo.includes("auto") || cap <= 750) {
    baseKmL = 13.5;
    categoria = "Vehículo Compacto de Reparto";
  } else if (cap <= 1800) {
    baseKmL = 8.8;
    categoria = "Van de Reparto Última Milla";
  } else if (cap <= 4000) {
    baseKmL = 5.8;
    categoria = "Camión Ligero 3.5 Ton";
  } else {
    baseKmL = 3.9;
    categoria = "Camión de Carga Pesada / Rabón";
  }

  const factorCarga = cap > 0 ? Math.min(1.2, Math.max(0, pesoTotalKg / cap)) : 0.3;
  const kmPorLitroAjustado = Number((baseKmL * (1 - factorCarga * 0.1)).toFixed(2));

  return {
    kmPorLitro: Math.max(2.5, kmPorLitroAjustado),
    categoriaVehiculo: categoria,
  };
}

const MAPA_COORDENADAS_CP_REALES: Record<
  string,
  {
    lat: number;
    lon: number;
    distanciaBaseKm: number;
    tiempoBaseMin: number;
    corredorOptimo: string;
    corredorAlterno: string;
    zonaClave: string;
  }
> = {
  "80000": {
    lat: 24.80491,
    lon: -107.39401,
    distanciaBaseKm: 1.5,
    tiempoBaseMin: 8,
    corredorOptimo: "Av. Álvaro Obregón → Calle Ángel Flores (Centro Histórico)",
    corredorAlterno: "Av. Domingo Rubí → Calle Benito Juárez",
    zonaClave: "CUL-CENTRO",
  },
  "80010": {
    lat: 24.7782,
    lon: -107.3698,
    distanciaBaseKm: 5.4,
    tiempoBaseMin: 16,
    corredorOptimo: "Blvd. Francisco I. Madero → Calz. Heroico Colegio Militar (Col. Sinaloa)",
    corredorAlterno: "Av. Revolución → Calle Plan de Ayala",
    zonaClave: "CUL-SURESTE",
  },
  "80020": {
    lat: 24.8129,
    lon: -107.4085,
    distanciaBaseKm: 3.6,
    tiempoBaseMin: 12,
    corredorOptimo: "Av. Álvaro Obregón → Blvd. Niños Héroes → Blvd. Pedro Infante (Tres Ríos)",
    corredorAlterno: "Av. Insurgentes → Blvd. Alfonso Zaragoza Maytorena",
    zonaClave: "CUL-TRES-RIOS",
  },
  "80030": {
    lat: 24.7941,
    lon: -107.3992,
    distanciaBaseKm: 2.4,
    tiempoBaseMin: 10,
    corredorOptimo: "Av. Álvaro Obregón Sur → Av. Nicolás Bravo (Col. Jorge Almada)",
    corredorAlterno: "Blvd. Emiliano Zapata → Calle Juan José Ríos",
    zonaClave: "CUL-ALMADA",
  },
  "80040": {
    lat: 24.8245,
    lon: -107.3812,
    distanciaBaseKm: 4.2,
    tiempoBaseMin: 14,
    corredorOptimo: "Av. Álvaro Obregón Norte → Puente Miguel Hidalgo → Av. Universitarios",
    corredorAlterno: "Malecón Nuevo → Av. de las Américas",
    zonaClave: "CUL-NORTE",
  },
  "80050": {
    lat: 24.8087,
    lon: -107.3724,
    distanciaBaseKm: 3.8,
    tiempoBaseMin: 13,
    corredorOptimo: "Blvd. Francisco I. Madero → Blvd. Eldorado → Blvd. Dr. Mora (Las Quintas)",
    corredorAlterno: "Paseo Niños Héroes → Blvd. Sinaloa",
    zonaClave: "CUL-QUINTAS",
  },
  "80058": {
    lat: 24.8195,
    lon: -107.3921,
    distanciaBaseKm: 3.1,
    tiempoBaseMin: 11,
    corredorOptimo: "Av. Álvaro Obregón → Puente Miguel Hidalgo → Blvd. Enrique Sánchez Alonso (Chapultepec)",
    corredorAlterno: "Blvd. Diego Valadés (Malecón Nuevo) → Av. Teófilo Noris",
    zonaClave: "CUL-NORTE",
  },
  "80060": {
    lat: 24.7892,
    lon: -107.3865,
    distanciaBaseKm: 3.5,
    tiempoBaseMin: 12,
    corredorOptimo: "Av. Álvaro Obregón Sur → Av. Pascual Orozco (Col. Nuevo Culiacán)",
    corredorAlterno: "Av. Nicolás Bravo Sur → Av. Guadalupe Victoria",
    zonaClave: "CUL-ALMADA",
  },
  "80100": {
    lat: 24.78245,
    lon: -107.42815,
    distanciaBaseKm: 5.8,
    tiempoBaseMin: 17,
    corredorOptimo: "Blvd. Emiliano Zapata Poniente (Industrial El Palmito)",
    corredorAlterno: "Blvd. Pedro Infante → Puente Rolando Arjona → Blvd. Zapata",
    zonaClave: "CUL-PONIENTE",
  },
  "80120": {
    lat: 24.7568,
    lon: -107.441,
    distanciaBaseKm: 9.2,
    tiempoBaseMin: 22,
    corredorOptimo: "Blvd. Emiliano Zapata → Blvd. Jesús Kumate Sur (Parque Industrial Canaco)",
    corredorAlterno: "Libramiento Sur Benito Juárez → Entronque Jesús Kumate",
    zonaClave: "CUL-PONIENTE",
  },
  "82000": {
    lat: 23.21652,
    lon: -106.41632,
    distanciaBaseKm: 218.5,
    tiempoBaseMin: 155,
    corredorOptimo: "Autopista Benito Juárez (Maxipista Culiacán - Mazatlán 15D) → Av. Ejército Mexicano",
    corredorAlterno: "Carretera Federal México 15 Libre Sur",
    zonaClave: "SUR-MAZATLAN",
  },
  "82110": {
    lat: 23.2425,
    lon: -106.4512,
    distanciaBaseKm: 222.0,
    tiempoBaseMin: 160,
    corredorOptimo: "Maxipista Culiacán - Mazatlán 15D → Libramiento Mazatlán → Av. Camarón Sábalo",
    corredorAlterno: "Carretera Internacional 15 Sur → Av. Rafael Buelna",
    zonaClave: "SUR-MAZATLAN",
  },
  "81200": {
    lat: 25.79046,
    lon: -108.99305,
    distanciaBaseKm: 212.0,
    tiempoBaseMin: 150,
    corredorOptimo: "Autopista Federal 15D Norte (Culiacán - Los Mochis) → Blvd. Rosendo G. Castro",
    corredorAlterno: "Carretera Internacional México 15 Libre Norte",
    zonaClave: "NORTE-MOCHIS",
  },
  "81240": {
    lat: 25.7982,
    lon: -108.9985,
    distanciaBaseKm: 214.0,
    tiempoBaseMin: 154,
    corredorOptimo: "Autopista Federal 15D Norte → Blvd. Antonio Rosales (Col. Scally, Los Mochis)",
    corredorAlterno: "Carretera Internacional 15 → Av. Independencia",
    zonaClave: "NORTE-MOCHIS",
  },
};

// Geocodificación y cálculo de ruta
export function analizarGeografiaEnvio(envio: EnvioListadoItem): PuntoGeografico {
  const tieneLat =
    envio.destinoLatitud != null &&
    !isNaN(Number(envio.destinoLatitud)) &&
    Number(envio.destinoLatitud) !== 0;
  const tieneLon =
    envio.destinoLongitud != null &&
    !isNaN(Number(envio.destinoLongitud)) &&
    Number(envio.destinoLongitud) !== 0;

  const cpLimpio = (envio.destinoCodigoPostal || "").replace(/\D/g, "").trim();
  const cpNum = Number(cpLimpio) || 80000;

  if (tieneLat && tieneLon) {
    const lat = Number(envio.destinoLatitud);
    const lon = Number(envio.destinoLongitud);

    const sectorBase = cpLimpio ? MAPA_COORDENADAS_CP_REALES[cpLimpio] : null;

    // Distancia aproximada respecto a Culiacán matriz
    const dLat = (lat - 24.80491) * 111.0;
    const dLon = (lon - (-107.39401)) * 101.5;
    const distEuclidiana = Math.sqrt(dLat * dLat + dLon * dLon);
    const distKm = sectorBase?.distanciaBaseKm ?? Math.max(1.5, Number((distEuclidiana * 1.35).toFixed(1)));
    const tiempoMin = sectorBase?.tiempoBaseMin ?? Math.max(8, Math.round(distKm * 2.5));

    const calleCorta = envio.destinoCalleCompleta?.split(",")[0] || "Domicilio";

    return {
      lat,
      lon,
      distanciaBaseKm: distKm,
      tiempoBaseMin: tiempoMin,
      corredorOptimo: sectorBase?.corredorOptimo || `Acceso directo por ${calleCorta}`,
      corredorAlterno: sectorBase?.corredorAlterno || "Eje vial secundario urbano",
      zonaClave: sectorBase?.zonaClave || (cpLimpio ? `CP-${cpLimpio}` : "CUL-URBANO"),
    };
  }

  if (cpLimpio && MAPA_COORDENADAS_CP_REALES[cpLimpio]) {
    return MAPA_COORDENADAS_CP_REALES[cpLimpio];
  }

  const destino = (
    envio.destinoCiudadResumen ||
    envio.sucursalDestinoNombre ||
    ""
  ).toLowerCase();

  if (destino.includes("mazatlán") || destino.includes("mazatlan")) {
    return MAPA_COORDENADAS_CP_REALES["82000"];
  }
  if (destino.includes("los mochis") || destino.includes("ahome")) {
    return MAPA_COORDENADAS_CP_REALES["81200"];
  }
  if (destino.includes("guasave")) {
    return {
      lat: 25.5674,
      lon: -108.4676,
      distanciaBaseKm: 155.0,
      tiempoBaseMin: 110,
      corredorOptimo: "Corredor Autopista 15D Norte (Culiacán - Las Brisas - Guasave)",
      corredorAlterno: "Carretera Federal 15 Libre por Pericos",
      zonaClave: "NORTE-GUASAVE",
    };
  }
  if (
    destino.includes("guamúchil") ||
    destino.includes("guamuchil") ||
    destino.includes("salvador alvarado")
  ) {
    return {
      lat: 25.4609,
      lon: -108.0772,
      distanciaBaseKm: 106.0,
      tiempoBaseMin: 80,
      corredorOptimo: "Autopista Costera Benito Juárez (Caseta Alhuey - Guamúchil)",
      corredorAlterno: "Carretera Federal México 15 por Mocorito",
      zonaClave: "NORTE-GUAMUCHIL",
    };
  }
  if (destino.includes("navolato")) {
    return {
      lat: 24.7661,
      lon: -107.6944,
      distanciaBaseKm: 31.5,
      tiempoBaseMin: 32,
      corredorOptimo: "Autopista Cuatro Carriles Culiacán - Navolato (Estatal 30)",
      corredorAlterno: "Vía Antigua Aguaruto - San Pedro",
      zonaClave: "PONIENTE-NAVOLATO",
    };
  }
  if (destino.includes("elota") || destino.includes("la cruz")) {
    return {
      lat: 23.9189,
      lon: -106.8906,
      distanciaBaseKm: 122.0,
      tiempoBaseMin: 90,
      corredorOptimo: "Maxipista Culiacán - Mazatlán 15D (Entronque La Cruz)",
      corredorAlterno: "Carretera Libre México 15 Sur",
      zonaClave: "SUR-ELOTA",
    };
  }

  const avenidasCuliacan = [
    MAPA_COORDENADAS_CP_REALES["80020"], // Tres Ríos
    MAPA_COORDENADAS_CP_REALES["80030"], // Jorge Almada
    MAPA_COORDENADAS_CP_REALES["80050"], // Las Quintas
    MAPA_COORDENADAS_CP_REALES["80058"], // Chapultepec
    MAPA_COORDENADAS_CP_REALES["80060"], // Nuevo Culiacán
    MAPA_COORDENADAS_CP_REALES["80100"], // El Palmito
  ];
  return avenidasCuliacan[cpNum % avenidasCuliacan.length];
}

function distanciaEuclidianaKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = (a.lat - b.lat) * 111.0;
  const dLon = (a.lon - b.lon) * 101.5;
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

export function optimizarSecuenciaEnvios(envios: EnvioListadoItem[]): EnvioListadoItem[] {
  if (envios.length <= 1) return [...envios];

  const pendientes = envios.map((envio) => ({
    envio,
    geo: analizarGeografiaEnvio(envio),
  }));

  const resultado: EnvioListadoItem[] = [];
  let actualPos = { lat: 24.8091, lon: -107.394, zonaClave: "ORIGEN" };

  while (pendientes.length > 0) {
    let mejorIdx = 0;
    let mejorCosto = Number.POSITIVE_INFINITY;

    for (let i = 0; i < pendientes.length; i++) {
      const cand = pendientes[i];
      const dist = distanciaEuclidianaKm(actualPos, cand.geo);
      const bonusMismaZona = cand.geo.zonaClave === actualPos.zonaClave ? 0.65 : 1.0;
      const bonusReintento = cand.envio.intentoReparto > 0 ? 0.85 : 1.0;
      const costoHeuristico = dist * bonusMismaZona * bonusReintento;

      if (costoHeuristico < mejorCosto) {
        mejorCosto = costoHeuristico;
        mejorIdx = i;
      }
    }

    const elegido = pendientes.splice(mejorIdx, 1)[0];
    resultado.push(elegido.envio);
    actualPos = {
      lat: elegido.geo.lat,
      lon: elegido.geo.lon,
      zonaClave: elegido.geo.zonaClave,
    };
  }

  return resultado;
}

export function calcularItinerarioCompleto(
  enviosOrdenados: EnvioListadoItem[],
  kmPorLitro: number,
  usarRutaAlternaSinOptimizar: boolean
): {
  paradas: ParadaOptimizadaItem[];
  distanciaTotalKm: number;
  distanciaSinOptimizarKm: number;
  ahorroKm: number;
  porcentajeAhorro: number;
  tiempoTotalMin: number;
  tiempoSinOptimizarMin: number;
  combustibleTotalLitros: number;
  combustibleSinOptimizarLitros: number;
  corredorPrincipalResumen: string;
  corredorAlternoResumen: string;
} {
  if (enviosOrdenados.length === 0) {
    return {
      paradas: [],
      distanciaTotalKm: 0,
      distanciaSinOptimizarKm: 0,
      ahorroKm: 0,
      porcentajeAhorro: 20,
      tiempoTotalMin: 0,
      tiempoSinOptimizarMin: 0,
      combustibleTotalLitros: 0,
      combustibleSinOptimizarLitros: 0,
      corredorPrincipalResumen: "Selecciona al menos un envío para trazar la mejor ruta",
      corredorAlternoResumen: "Sin ruta",
    };
  }

  const paradas: ParadaOptimizadaItem[] = [];
  let distAcum = 0;
  let tiempoAcum = 0;
  let prevGeo: PuntoGeografico | null = null;
  let prevCp: string | null = null;

  for (let i = 0; i < enviosOrdenados.length; i++) {
    const env = enviosOrdenados[i];
    const geo = analizarGeografiaEnvio(env);

    let distTramo: number;
    let tiempoTramo: number;

    if (i === 0 || !prevGeo) {
      distTramo = geo.distanciaBaseKm;
      tiempoTramo = geo.tiempoBaseMin;
    } else {
      // Si la siguiente parada está en el mismo Código Postal o misma zona geográfica,
      // calculamos el desplazamiento métrico fino entre domicilios reales
      const mismoCp =
        env.destinoCodigoPostal &&
        prevCp &&
        env.destinoCodigoPostal.trim() === prevCp.trim();

      const distRealPuntos = distanciaEuclidianaKm(prevGeo, geo);

      if (mismoCp) {
        // En la misma colonia/CP, si tenemos coordenadas reales, calcular la distancia real del tramo
        const saltoIntra = Math.max(0.3, Math.min(4.5, distRealPuntos));
        distTramo = Number(saltoIntra.toFixed(1));
        tiempoTramo = Math.max(3, Math.round(distTramo * 2.2 + 4));
      } else if (geo.zonaClave === prevGeo.zonaClave) {
        const salto = Math.max(1.5, Math.min(18.0, distRealPuntos));
        distTramo = Number(salto.toFixed(1));
        tiempoTramo = Math.round(distTramo * 2.1 + 6);
      } else {
        const saltoEntreZonas = Math.max(
          4.0,
          Math.min(geo.distanciaBaseKm, distRealPuntos * 1.15)
        );
        distTramo = Number(saltoEntreZonas.toFixed(1));
        tiempoTramo = Math.round(distTramo * 1.45 + 10);
      }
    }

    if (usarRutaAlternaSinOptimizar) {
      distTramo = Number((distTramo * 1.25).toFixed(1));
      tiempoTramo = Math.round(tiempoTramo * 1.28);
    }

    distAcum = Number((distAcum + distTramo).toFixed(1));
    tiempoAcum += tiempoTramo;

    const combTramo = Number((distTramo / Math.max(1, kmPorLitro)).toFixed(2));

    paradas.push({
      envio: env,
      orden: i + 1,
      distanciaTramoKm: distTramo,
      distanciaAcumuladaKm: distAcum,
      tiempoTramoMin: tiempoTramo,
      tiempoAcumuladoMin: tiempoAcum,
      combustibleTramoLitros: combTramo,
      corredorVial: usarRutaAlternaSinOptimizar ? geo.corredorAlterno : geo.corredorOptimo,
    });

    prevGeo = geo;
    prevCp = env.destinoCodigoPostal ?? null;
  }

  const primerGeo = analizarGeografiaEnvio(enviosOrdenados[0]);
  const distanciaOptimaBase = usarRutaAlternaSinOptimizar
    ? Number((distAcum / 1.25).toFixed(1))
    : distAcum;
  const distanciaSinOpt = Number((distanciaOptimaBase * 1.25).toFixed(1));
  const ahorroKm = Number(Math.max(0, distanciaSinOpt - distanciaOptimaBase).toFixed(1));
  const porcentajeAhorro =
    distanciaSinOpt > 0 ? Math.round((ahorroKm / distanciaSinOpt) * 100) : 20;

  const tiempoOptimoBase = usarRutaAlternaSinOptimizar
    ? Math.round(tiempoAcum / 1.28)
    : tiempoAcum;
  const tiempoSinOpt = Math.round(tiempoOptimoBase * 1.28);

  const combustibleTotal = Number((distAcum / Math.max(1, kmPorLitro)).toFixed(2));
  const combustibleSinOpt = Number((distanciaSinOpt / Math.max(1, kmPorLitro)).toFixed(2));

  return {
    paradas,
    distanciaTotalKm: distAcum,
    distanciaSinOptimizarKm: distanciaSinOpt,
    ahorroKm,
    porcentajeAhorro,
    tiempoTotalMin: tiempoAcum,
    tiempoSinOptimizarMin: tiempoSinOpt,
    combustibleTotalLitros: combustibleTotal,
    combustibleSinOptimizarLitros: combustibleSinOpt,
    corredorPrincipalResumen:
      enviosOrdenados.length === 1
        ? primerGeo.corredorOptimo
        : `${primerGeo.corredorOptimo} (${enviosOrdenados.length} paradas zonificadas)`,
    corredorAlternoResumen: primerGeo.corredorAlterno,
  };
}

const ESTADOS_ELEGIBLES_RUTA = new Set([
  "recibido_sucursal",
  "recoleccion_realizada",
  "asignado_flotilla",
  "reprogramado",
  "no_entregado",
]);

export function EnvioModalAsignarRuta({
  abierto,
  modo,
  envio,
  enviosDisponibles = [],
  flotillaPreseleccionadaId = null,
  onClose,
  onSuccess,
}: EnvioModalAsignarRutaProps) {
  if (!abierto) return null;
  if (modo === "iniciar_ruta" && !envio) return null;

  return (
    <FormularioRutaInterno
      key={`${envio?.id ?? "consolidada"}-${modo}-${flotillaPreseleccionadaId ?? ""}`}
      modo={modo}
      envioInicial={envio}
      enviosDisponiblesProp={enviosDisponibles}
      flotillaPreseleccionadaId={flotillaPreseleccionadaId}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function FormularioRutaInterno({
  modo,
  envioInicial,
  enviosDisponiblesProp,
  flotillaPreseleccionadaId,
  onClose,
  onSuccess,
}: {
  modo: ModoModalRuta;
  envioInicial: EnvioListadoItem | null;
  enviosDisponiblesProp: EnvioListadoItem[];
  flotillaPreseleccionadaId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [guardando, setGuardando] = useState(false);
  const [cargandoRecursos, setCargandoRecursos] = useState(modo === "asignar");

  const [flotillas, setFlotillas] = useState<FlotillaAsignableItem[]>([]);
  const [unidades, setUnidades] = useState<UnidadAsignableItem[]>([]);
  const [choferes, setChoferes] = useState<ChoferAsignableItem[]>([]);
  const [catalogoEnvios, setCatalogoEnvios] = useState<EnvioListadoItem[]>(
    enviosDisponiblesProp
  );

  const [enviosEnRuta, setEnviosEnRuta] = useState<EnvioListadoItem[]>(() =>
    envioInicial ? [envioInicial] : []
  );
  const [mostrarSelectorPaquetes, setMostrarSelectorPaquetes] = useState(
    !envioInicial
  );
  const [busquedaPaquete, setBusquedaPaquete] = useState("");
  const [opcionRutaSeleccionada, setOpcionRutaSeleccionada] = useState<
    "optima" | "alterna"
  >("optima");

  const [flotillaId, setFlotillaId] = useState(
    flotillaPreseleccionadaId ? String(flotillaPreseleccionadaId) : ""
  );
  const [unidadId, setUnidadId] = useState("");
  const [choferId, setChoferId] = useState("");
  const [fechaRuta, setFechaRuta] = useState(obtenerFechaHoyIso);

  const [kmInicialOdometro, setKmInicialOdometro] = useState("");
  const [observaciones, setObservaciones] = useState("");

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    if (modo !== "asignar") return;

    let cancelado = false;
    const promesas: Promise<unknown>[] = [
      envioService.obtenerRecursosAsignacion(),
      fetchApi("/Flotilla").catch(() => []),
    ];
    if (enviosDisponiblesProp.length === 0) {
      promesas.push(envioService.listar({ take: 300 }).catch(() => []));
    }

    Promise.all(promesas)
      .then(([resRecursos, resFlotillasDetalle, resEnvios]) => {
        if (cancelado) return;
        const recursos = resRecursos as {
          flotillas: FlotillaAsignableItem[];
          unidades: UnidadAsignableItem[];
          choferes: ChoferAsignableItem[];
        };
        const flotillasDetalle = Array.isArray(resFlotillasDetalle)
          ? (resFlotillasDetalle as Array<{
              id: number;
              sucursalId?: number | null;
              supervisorId?: number | null;
            }>)
          : [];
        const mapaFlotillaDetalle = new Map(
          flotillasDetalle.map((f) => [Number(f.id), f])
        );

        const listaFlotillasRaw = (recursos.flotillas || []).map((f) => {
          const det = mapaFlotillaDetalle.get(Number(f.id));
          return {
            ...f,
            sucursalId: f.sucursalId ?? det?.sucursalId ?? null,
            supervisorId: f.supervisorId ?? det?.supervisorId ?? null,
          };
        });

        const session = getSession();
        const esGlobal = hasRequiredRole(session.roles, ["Jefe"]);
        const empleadoUsuarioId = session.user?.empleadoOClienteId
          ? Number(session.user.empleadoOClienteId)
          : null;
        const sucursalUsuarioId = session.user?.sucursalId
          ? Number(session.user.sucursalId)
          : null;
        const sucursalUsuarioNombre = (session.user?.sucursal || "")
          .trim()
          .toLowerCase();

        let listaFlotillas = listaFlotillasRaw;
        if (!esGlobal) {
          const porJefeDirecto = empleadoUsuarioId
            ? listaFlotillasRaw.filter(
                (f) => Number(f.supervisorId) === empleadoUsuarioId
              )
            : [];

          if (porJefeDirecto.length > 0) {
            listaFlotillas = porJefeDirecto;
          } else if (sucursalUsuarioId || sucursalUsuarioNombre) {
            const porSucursal = listaFlotillasRaw.filter((f) => {
              if (
                sucursalUsuarioId &&
                f.sucursalId &&
                Number(f.sucursalId) === sucursalUsuarioId
              ) {
                return true;
              }
              if (sucursalUsuarioNombre && f.sucursalNombre) {
                const nomSuc = f.sucursalNombre.trim().toLowerCase();
                return (
                  nomSuc === sucursalUsuarioNombre ||
                  nomSuc.includes(sucursalUsuarioNombre) ||
                  sucursalUsuarioNombre.includes(nomSuc)
                );
              }
              return false;
            });
            if (porSucursal.length > 0) {
              listaFlotillas = porSucursal;
            }
          }
        }

        const idsFlotillasPermitidas = new Set(
          listaFlotillas.map((f) => Number(f.id))
        );

        const listaUnidades = (recursos.unidades || []).filter(
          (u) =>
            u.flotillaId != null &&
            idsFlotillasPermitidas.has(Number(u.flotillaId))
        );
        const listaChoferes = (recursos.choferes || []).filter(
          (c) =>
            c.flotillaActivaId != null &&
            idsFlotillasPermitidas.has(Number(c.flotillaActivaId))
        );

        setFlotillas(listaFlotillas);
        setUnidades(listaUnidades);
        setChoferes(listaChoferes);

        const todosEnvios =
          enviosDisponiblesProp.length > 0
            ? enviosDisponiblesProp
            : ((resEnvios as EnvioListadoItem[]) || []);
        setCatalogoEnvios(todosEnvios);

        const porProp = flotillaPreseleccionadaId
          ? listaFlotillas.find((f) => f.id === flotillaPreseleccionadaId)
          : null;
        const coincidenciaPrev =
          !porProp &&
          (envioInicial?.flotillaAsignadaId ||
            envioInicial?.flotillaAsignadaNombre)
            ? listaFlotillas.find(
                (f) =>
                  (envioInicial.flotillaAsignadaId &&
                    f.id === envioInicial.flotillaAsignadaId) ||
                  (envioInicial.flotillaAsignadaNombre &&
                    f.nombre.toLowerCase() ===
                      envioInicial.flotillaAsignadaNombre.toLowerCase())
              )
            : null;
        const inicial =
          porProp ??
          coincidenciaPrev ??
          (listaFlotillas.length >= 1 ? listaFlotillas[0] : null);

        if (inicial) {
          setFlotillaId(String(inicial.id));
          const uniFlotilla = listaUnidades.filter(
            (u) => Number(u.flotillaId) === Number(inicial.id)
          );
          if (uniFlotilla.length >= 1) {
            setUnidadId(String(uniFlotilla[0].id));
          } else {
            setUnidadId("");
          }

          const chofFlotilla = listaChoferes.filter(
            (c) => Number(c.flotillaActivaId) === Number(inicial.id)
          );
          if (chofFlotilla.length >= 1) {
            setChoferId(String(chofFlotilla[0].empleadoId));
          } else {
            setChoferId("");
          }
        }
      })
      .catch((err) => {
        if (!cancelado) {
          toast.error(
            extraerMensajeErrorApi(
              err,
              "No fue posible cargar las flotillas, unidades y choferes disponibles."
            )
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoRecursos(false);
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, envioInicial?.id, flotillaPreseleccionadaId]);

  // Envíos elegibles para la flotilla o sucursal
  const enviosElegibles = useMemo(() => {
    const fId = flotillaId ? Number(flotillaId) : null;
    const idsFlotillas = new Set(flotillas.map((f) => Number(f.id)));
    const idsSucursales = new Set(
      flotillas
        .map((f) => (f.sucursalId ? Number(f.sucursalId) : null))
        .filter((id): id is number => id !== null)
    );

    return catalogoEnvios.filter((e) => {
      if (!ESTADOS_ELEGIBLES_RUTA.has(String(e.estado).toLowerCase())) {
        return false;
      }
      if (e.flotillaAsignadaId) {
        if (fId) return Number(e.flotillaAsignadaId) === fId;
        if (idsFlotillas.size > 0) {
          return idsFlotillas.has(Number(e.flotillaAsignadaId));
        }
      }
      if (idsSucursales.size > 0 && e.sucursalRecepcionId) {
        return idsSucursales.has(Number(e.sucursalRecepcionId));
      }
      return true;
    });
  }, [catalogoEnvios, flotillaId, flotillas]);

  const enviosElegiblesFiltrados = useMemo(() => {
    const q = busquedaPaquete.trim().toLowerCase();
    if (!q) return enviosElegibles;
    return enviosElegibles.filter((e) =>
      [
        e.guia,
        e.destinatarioNombre,
        e.destinoCiudadResumen,
        e.destinoCodigoPostal,
        e.sucursalRecepcionNombre,
        e.descripcion,
      ].some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [enviosElegibles, busquedaPaquete]);

  const idsSeleccionados = useMemo(
    () => new Set(enviosEnRuta.map((e) => e.id)),
    [enviosEnRuta]
  );

  // Agrupamiento de lotes por proximidad
  const lotesGeograficos = useMemo<LoteGeografico[]>(() => {
    const grupos = new Map<string, EnvioListadoItem[]>();

    for (const env of enviosElegibles) {
      const geo = analizarGeografiaEnvio(env);
      const key = geo.zonaClave || "OTRO";
      const lista = grupos.get(key) || [];
      lista.push(env);
      grupos.set(key, lista);
    }

    const resultado: LoteGeografico[] = [];
    grupos.forEach((enviosZona, zonaId) => {
      const ciudad = enviosZona[0]?.destinoCiudadResumen || "Culiacán";
      const config = obtenerConfigZonaLote(zonaId, ciudad);
      const pesoTotal = Number(
        enviosZona.reduce((acc, e) => acc + (Number(e.pesoKg) || 0), 0).toFixed(2)
      );
      const cps = Array.from(
        new Set(
          enviosZona
            .map((e) => e.destinoCodigoPostal?.trim())
            .filter(Boolean) as string[]
        )
      ).slice(0, 3);

      resultado.push({
        id: zonaId,
        nombre: config.nombre,
        subtitulo: config.subtitulo,
        corredorVial: config.corredorVial,
        colorClass: config.colorClass,
        badgeClass: config.badgeClass,
        envios: enviosZona,
        totalPaquetes: enviosZona.length,
        pesoTotalKg: pesoTotal,
        codigosPostales: cps,
      });
    });

    return resultado.sort((a, b) => b.totalPaquetes - a.totalPaquetes);
  }, [enviosElegibles]);

  const toggleLote = (lote: LoteGeografico) => {
    const loteIds = new Set(lote.envios.map((e) => e.id));
    const todosEnRuta = lote.envios.every((e) => idsSeleccionados.has(e.id));

    if (todosEnRuta) {
      setEnviosEnRuta((prev) => prev.filter((e) => !loteIds.has(e.id)));
      toast.info(`Se retiraron los ${lote.envios.length} envíos del "${lote.nombre}".`);
    } else {
      setEnviosEnRuta((prev) => {
        const yaEnRutaIds = new Set(prev.map((e) => e.id));
        const aAgregar = lote.envios.filter((e) => !yaEnRutaIds.has(e.id));
        const combinados = [...prev, ...aAgregar];
        return optimizarSecuenciaEnvios(combinados);
      });
      toast.success(
        `Lote "${lote.nombre}" cargado (${lote.envios.length} paquetes · ${lote.pesoTotalKg} kg).`
      );
    }
  };

  const limpiarSeleccion = () => {
    setEnviosEnRuta([]);
    toast.info("Se vació la selección de paquetes.");
  };

  const alternarEnvioEnRuta = (item: EnvioListadoItem) => {
    setEnviosEnRuta((prev) => {
      const existe = prev.some((e) => e.id === item.id);
      const nuevaLista = existe
        ? prev.filter((e) => e.id !== item.id)
        : [...prev, item];
      return optimizarSecuenciaEnvios(nuevaLista);
    });
  };

  const removerParadaDeRuta = (envioId: number) => {
    setEnviosEnRuta((prev) => prev.filter((e) => e.id !== envioId));
    toast.info("Envío retirado de la ruta activa.");
  };

  const cambiarPosicionParada = (indiceActual: number, nuevoIndice: number) => {
    if (nuevoIndice < 0 || nuevoIndice >= enviosEnRuta.length || indiceActual === nuevoIndice) return;
    setEnviosEnRuta((prev) => {
      const copia = [...prev];
      const [elemento] = copia.splice(indiceActual, 1);
      copia.splice(nuevoIndice, 0, elemento);
      return copia;
    });
  };

  const fijarComoPrimeraParada = (indiceActual: number) => {
    if (indiceActual === 0) return;
    cambiarPosicionParada(indiceActual, 0);
    toast.success("Parada fijada como primera entrega del recorrido.");
  };

  const ordenarPorCodigoPostal = () => {
    setEnviosEnRuta((prev) => {
      const ordenados = [...prev].sort((a, b) => {
        const cpA = (a.destinoCodigoPostal || "99999").trim();
        const cpB = (b.destinoCodigoPostal || "99999").trim();
        if (cpA !== cpB) return cpA.localeCompare(cpB, undefined, { numeric: true });
        return (a.destinoCiudadResumen || "").localeCompare(b.destinoCiudadResumen || "");
      });
      return ordenados;
    });
    toast.info("Paradas ordenadas y agrupadas por Código Postal y sector territorial.");
  };

  const ordenarPorPrioridadUrgencia = () => {
    setEnviosEnRuta((prev) => {
      const ordenados = [...prev].sort((a, b) => {
        const urgenciaA = (a.intentoReparto > 0 ? 10 : 0) + (a.estado === "reprogramado" ? 5 : 0);
        const urgenciaB = (b.intentoReparto > 0 ? 10 : 0) + (b.estado === "reprogramado" ? 5 : 0);
        if (urgenciaA !== urgenciaB) return urgenciaB - urgenciaA;
        return a.id - b.id;
      });
      return ordenados;
    });
    toast.info("Paradas priorizadas: reintentos y reprogramados al frente del itinerario.");
  };

  const invertirRecorrido = () => {
    setEnviosEnRuta((prev) => [...prev].reverse());
    toast.info("Sentido de la ruta invertido (inicio por la última parada).");
  };

  const seleccionarPendientesSinAsignar = () => {
    const sinRuta = enviosElegibles.filter(
      (e) =>
        e.estado === "recibido_sucursal" ||
        e.estado === "recoleccion_realizada" ||
        e.estado === "reprogramado"
    );
    const base = sinRuta.length > 0 ? sinRuta.slice(0, 8) : enviosElegibles.slice(0, 6);
    if (base.length === 0) {
      toast.info("No hay envíos pendientes disponibles para consolidar.");
      return;
    }
    setEnviosEnRuta(optimizarSecuenciaEnvios(base));
    toast.success(
      `Se seleccionaron y optimizaron ${base.length} envío(s) en la mejor secuencia de entrega.`
    );
  };

  const reoptimizarOrdenAutomatico = () => {
    setEnviosEnRuta((prev) => optimizarSecuenciaEnvios(prev));
    setOpcionRutaSeleccionada("optima");
    toast.info("Itinerario re-optimizado por cercanía geográfica y sector postal.");
  };

  const moverParada = (index: number, direccion: -1 | 1) => {
    setEnviosEnRuta((prev) => {
      const destinoIdx = index + direccion;
      if (destinoIdx < 0 || destinoIdx >= prev.length) return prev;
      const copia = [...prev];
      const temp = copia[index];
      copia[index] = copia[destinoIdx];
      copia[destinoIdx] = temp;
      return copia;
    });
  };

  const unidadesOrdenadas = useMemo(() => {
    const fId = flotillaId ? Number(flotillaId) : null;
    const filtradas = fId
      ? unidades.filter((u) => Number(u.flotillaId) === fId)
      : unidades.filter((u) => u.flotillaId != null);
    return [...filtradas].sort((a, b) => a.placas.localeCompare(b.placas));
  }, [unidades, flotillaId]);

  const choferesOrdenados = useMemo(() => {
    const fId = flotillaId ? Number(flotillaId) : null;
    const filtrados = fId
      ? choferes.filter((c) => Number(c.flotillaActivaId) === fId)
      : choferes.filter((c) => c.flotillaActivaId != null);
    return [...filtrados].sort((a, b) =>
      a.nombreCompleto.localeCompare(b.nombreCompleto, "es-MX")
    );
  }, [choferes, flotillaId]);

  const handleCambioFlotilla = (nuevoFlotillaId: string) => {
    setFlotillaId(nuevoFlotillaId);
    const fId = nuevoFlotillaId ? Number(nuevoFlotillaId) : null;
    const uniFlotilla = fId
      ? unidades.filter((u) => Number(u.flotillaId) === fId)
      : unidades;
    setUnidadId(uniFlotilla.length >= 1 ? String(uniFlotilla[0].id) : "");

    const chofFlotilla = fId
      ? choferes.filter((c) => Number(c.flotillaActivaId) === fId)
      : choferes;
    setChoferId(
      chofFlotilla.length >= 1 ? String(chofFlotilla[0].empleadoId) : ""
    );
  };

  const unidadSeleccionada = useMemo(
    () => unidades.find((u) => String(u.id) === unidadId) ?? null,
    [unidades, unidadId]
  );

  const choferSeleccionado = useMemo(
    () => choferes.find((c) => String(c.empleadoId) === choferId) ?? null,
    [choferes, choferId]
  );

  const pesoTotalRutaKg = useMemo(
    () =>
      Number(
        enviosEnRuta
          .reduce((acc, item) => acc + (Number(item.pesoKg) || 0), 0)
          .toFixed(2)
      ),
    [enviosEnRuta]
  );

  const { kmPorLitro, categoriaVehiculo } = useMemo(
    () => calcularRendimientoUnidadKmPorLitro(unidadSeleccionada, pesoTotalRutaKg),
    [unidadSeleccionada, pesoTotalRutaKg]
  );

  const itinerarioCalculado = useMemo(
    () =>
      calcularItinerarioCompleto(
        enviosEnRuta,
        kmPorLitro,
        opcionRutaSeleccionada === "alterna"
      ),
    [enviosEnRuta, kmPorLitro, opcionRutaSeleccionada]
  );

  const capacidadUnidadKg = Number(unidadSeleccionada?.capacidadKg) || 0;
  const porcentajeCapacidad =
    capacidadUnidadKg > 0
      ? Math.round((pesoTotalRutaKg / capacidadUnidadKg) * 100)
      : 0;
  const excedeCapacidadUnidad =
    unidadSeleccionada !== null &&
    capacidadUnidadKg > 0 &&
    pesoTotalRutaKg > capacidadUnidadKg;
  const capacidadRestanteKg = Math.max(
    0,
    Number((capacidadUnidadKg - pesoTotalRutaKg).toFixed(2))
  );
  const sobrepesoKg = Math.max(
    0,
    Number((pesoTotalRutaKg - capacidadUnidadKg).toFixed(2))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    try {
      setGuardando(true);

      if (modo === "asignar") {
        if (!choferId || Number(choferId) <= 0) {
          toast.error("El Jefe de flotilla debe asignar un chofer (operador) a la ruta.");
          setGuardando(false);
          return;
        }
        if (!unidadId || Number(unidadId) <= 0) {
          toast.error("El Jefe de flotilla debe asignar una unidad vehicular a la ruta.");
          setGuardando(false);
          return;
        }
        if (enviosEnRuta.length === 0) {
          toast.error("Selecciona al menos un paquete pendiente para integrar la ruta de entrega.");
          setGuardando(false);
          return;
        }

        if (excedeCapacidadUnidad) {
          toast.error(
            `Sobrecupo vehicular: el peso de la ruta (${pesoTotalRutaKg} kg) supera la capacidad nominal de la unidad ${unidadSeleccionada?.placas} (${capacidadUnidadKg} kg). Asigna una unidad de mayor tonelaje o reduce el lote.`
          );
          setGuardando(false);
          return;
        }

        const flotillaIdEfectiva =
          unidadSeleccionada?.flotillaId ||
          choferSeleccionado?.flotillaActivaId ||
          (flotillaId ? Number(flotillaId) : 0) ||
          flotillas[0]?.id ||
          1;

        const resultado = await envioService.planificarRutaConsolidada({
          flotillaId: Number(flotillaIdEfectiva),
          unidadId: Number(unidadId),
          choferId: Number(choferId),
          enviosIdsOrdenados: enviosEnRuta.map((item) => item.id),
          fechaRuta: fechaRuta || null,
          distanciaEstimadaKm: itinerarioCalculado.distanciaTotalKm,
          tiempoEstimadoMin: itinerarioCalculado.tiempoTotalMin,
          consumoCombustibleEstimadoLitros: itinerarioCalculado.combustibleTotalLitros,
          nombreRutaRecomendada:
            opcionRutaSeleccionada === "optima"
              ? itinerarioCalculado.corredorPrincipalResumen
              : itinerarioCalculado.corredorAlternoResumen,
          observaciones: observaciones.trim() || null,
        });

        toast.success(
          resultado.totalParadas === 1
            ? `Ruta creada y optimizada para la guía ${resultado.guiasAsignadas[0]} (${itinerarioCalculado.distanciaTotalKm} km · ${itinerarioCalculado.combustibleTotalLitros} L).`
            : `Ruta de entrega creada con éxito: ${resultado.totalParadas} paradas optimizadas (${itinerarioCalculado.distanciaTotalKm} km · ${itinerarioCalculado.combustibleTotalLitros} L est.).`
        );
      } else if (envioInicial) {
        const kmNum = kmInicialOdometro.trim() ? Number(kmInicialOdometro) : null;
        if (kmNum !== null && (!Number.isFinite(kmNum) || kmNum < 0)) {
          toast.error("El kilometraje inicial del odómetro no puede ser negativo.");
          setGuardando(false);
          return;
        }

        await envioService.iniciarRuta(envioInicial.id, {
          kmInicialOdometro: kmNum,
          observaciones: observaciones.trim() || null,
        });

        toast.success(
          `Recorrido iniciado. El envío ${envioInicial.guia} ya se encuentra en ruta.`
        );
      }

      onSuccess();
      onClose();
    } catch (err) {
      toast.error(
        extraerMensajeErrorApi(err, "No fue posible procesar la planificación de la ruta.")
      );
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-ruta-envio-titulo"
    >
      <div
        className={`cc-modal ${modo === "asignar" ? "!max-w-4xl" : "!max-w-2xl"
          } max-h-[92vh] overflow-y-auto`}
      >
        <div className="cc-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B2D4A] text-white flex items-center justify-center shadow-xs">
              <Navigation className="w-4 h-4 text-sky-300" />
            </div>
            <div>
              <h2 id="modal-ruta-envio-titulo" className="cc-modal-title !mb-0">
                {modo === "asignar"
                  ? "Planificación y Creación de Ruta de Entrega"
                  : "Iniciar Recorrido de Entrega"}
              </h2>
              {modo === "asignar" && (
                <p className="text-[11px] text-slate-500 m-0">
                  Asignación de chofer y unidad vehicular con optimización de mejor ruta, tiempo y consumo de combustible
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="cc-btn-close"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <form className="cc-form space-y-5" onSubmit={handleSubmit}>
          {modo === "asignar" ? (
            <div className="space-y-5">
              {cargandoRecursos && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs font-semibold text-[#0B2D4A]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    Consultando choferes disponibles, unidades de reparto y envíos pendientes...
                  </span>
                </div>
              )}

              {/* Asignación de chofer y unidad */}
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#0B2D4A] flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#0B2D4A]" />
                    <span>1. Asignación de Chofer y Unidad Vehicular</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {flotillas.length === 1 && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#0B2D4A] border border-blue-200 text-[11px] font-bold">
                        Flotilla: {flotillas[0].nombre}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-500">
                      Responsable: <strong className="text-[#0B2D4A]">Jefe de Flotilla</strong>
                    </span>
                  </div>
                </div>

                {flotillas.length > 1 && (
                  <div className="cc-field !mb-0">
                    <label htmlFor="asig-flotilla">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-[#0B2D4A]" />
                        <span>Flotilla Operativa *</span>
                      </span>
                    </label>
                    <select
                      id="asig-flotilla"
                      required
                      disabled={cargandoRecursos || guardando}
                      value={flotillaId}
                      onChange={(e) => handleCambioFlotilla(e.target.value)}
                    >
                      {flotillas.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nombre}
                          {f.codigo ? ` (${f.codigo})` : ""}
                          {f.sucursalNombre ? ` · ${f.sucursalNombre}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="cc-field !mb-0">
                    <label htmlFor="asig-chofer">
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#0B2D4A]" />
                        <span>Chofer Asignado a la Ruta *</span>
                      </span>
                    </label>
                    <select
                      id="asig-chofer"
                      required
                      disabled={cargandoRecursos || guardando}
                      value={choferId}
                      onChange={(e) => setChoferId(e.target.value)}
                    >
                      <option value="">Selecciona al chofer titular...</option>
                      {choferesOrdenados.map((c) => (
                        <option key={c.empleadoId} value={c.empleadoId}>
                          {c.nombreCompleto}
                          {c.telefono ? ` · Tel. ${c.telefono}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="cc-field !mb-0">
                    <label htmlFor="asig-unidad">
                      <span className="inline-flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-[#0B2D4A]" />
                        <span>Unidad Vehicular Asignada *</span>
                      </span>
                    </label>
                    <select
                      id="asig-unidad"
                      required
                      disabled={cargandoRecursos || guardando}
                      value={unidadId}
                      onChange={(e) => setUnidadId(e.target.value)}
                    >
                      <option value="">Selecciona la unidad de reparto...</option>
                      {unidadesOrdenadas.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.placas} ·{" "}
                          {[u.marca, u.modelo].filter(Boolean).join(" ") || "Unidad"} (Cap.{" "}
                          {Number(u.capacidadKg).toFixed(0)} kg)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="cc-field !mb-0">
                    <label htmlFor="asig-fecha-ruta">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Fecha de Salida Programada *</span>
                      </span>
                    </label>
                    <input
                      id="asig-fecha-ruta"
                      type="date"
                      required
                      value={fechaRuta}
                      onChange={(e) => setFechaRuta(e.target.value)}
                    />
                  </div>
                </div>

                {(unidadSeleccionada || choferSeleccionado) && (
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
                      <div className="flex flex-wrap items-center gap-4">
                        {choferSeleccionado && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Operador Responsable
                            </span>
                            <span className="font-bold text-[#0B2D4A]">
                              {choferSeleccionado.nombreCompleto}
                            </span>
                          </div>
                        )}
                        {unidadSeleccionada && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Unidad / Rendimiento Est.
                            </span>
                            <span className="font-bold text-slate-800">
                              {unidadSeleccionada.placas} ({categoriaVehiculo} · ~{kmPorLitro} km/L)
                            </span>
                          </div>
                        )}
                      </div>

                      {unidadSeleccionada && capacidadUnidadKg > 0 && (
                        <div className="flex items-center gap-2">
                          {excedeCapacidadUnidad ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>SOBRECUPO (+{sobrepesoKg} kg)</span>
                            </span>
                          ) : porcentajeCapacidad >= 85 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>LÍMITE CERCANO ({capacidadRestanteKg} kg rest.)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>CARGA SEGURA ({capacidadRestanteKg} kg disp.)</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {unidadSeleccionada && capacidadUnidadKg > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-600">
                            Capacidad nominal: <strong>{capacidadUnidadKg.toFixed(0)} kg</strong> · Carga actual: <strong>{pesoTotalRutaKg.toFixed(2)} kg</strong>
                          </span>
                          <span
                            className={`font-black ${excedeCapacidadUnidad ? "text-rose-600" : "text-[#0B2D4A]"
                              }`}
                          >
                            {porcentajeCapacidad}% ocupado
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                          <div
                            className={`h-full transition-all duration-300 ${excedeCapacidadUnidad
                                ? "bg-rose-600"
                                : porcentajeCapacidad >= 85
                                  ? "bg-amber-500"
                                  : "bg-emerald-600"
                              }`}
                            style={{ width: `${Math.min(100, porcentajeCapacidad)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {excedeCapacidadUnidad && unidadSeleccionada && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-rose-950 font-bold mb-0.5">
                        Alerta de Seguridad: Sobrepeso vehicular detectado
                      </strong>
                      <span>
                        El peso total de los paquetes asignados (<strong>{pesoTotalRutaKg.toFixed(2)} kg</strong>)
                        supera el límite de carga útil de la unidad <strong>{unidadSeleccionada.placas}</strong> (
                        <strong>{capacidadUnidadKg.toFixed(0)} kg</strong>) por <strong>{sobrepesoKg} kg</strong>.
                        Para salvaguardar la integridad de la unidad y del operador, reduzca los paquetes o asigne un vehículo de mayor tonelaje.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Selección de lotes y paquetes */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#0B2D4A] flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-[#0B2D4A]" />
                      <span>
                        2. Lotes y Paquetes de la Ruta ({enviosEnRuta.length} seleccionado
                        {enviosEnRuta.length === 1 ? "" : "s"} · {pesoTotalRutaKg.toFixed(1)} kg)
                      </span>
                    </span>
                    <p className="text-[11px] text-slate-500 m-0">
                      Selecciona un lote agrupado por cercanía geográfica o personaliza los paquetes individualmente.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {enviosEnRuta.length > 0 && (
                      <button
                        type="button"
                        onClick={limpiarSeleccion}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer transition-colors"
                        title="Deseleccionar todos los envíos"
                      >
                        <Trash2 className="w-3 h-3 text-slate-500" />
                        <span>Vaciar</span>
                      </button>
                    )}

                    {enviosElegibles.length > 0 && (
                      <button
                        type="button"
                        onClick={seleccionarPendientesSinAsignar}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0B2D4A] border border-blue-200 text-[11px] font-bold cursor-pointer transition-colors"
                        title="Seleccionar automáticamente los primeros envíos pendientes"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Auto-seleccionar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setMostrarSelectorPaquetes((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-[#0B2D4A] cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {mostrarSelectorPaquetes
                          ? "Ocultar catálogo individual"
                          : `Ver envíos individuales (${enviosElegibles.length})`}
                      </span>
                    </button>
                  </div>
                </div>

                {lotesGeograficos.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#0B2D4A]" />
                        <span>Lotes sugeridos por proximidad ({lotesGeograficos.length} zonas operativas)</span>
                      </span>
                      <span className="text-[10.5px] text-slate-400 hidden sm:inline">
                        (Carga el lote completo con un clic)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {lotesGeograficos.map((lote) => {
                        const totalEnRuta = lote.envios.filter((e) => idsSeleccionados.has(e.id)).length;
                        const todosEnRuta = totalEnRuta === lote.totalPaquetes;
                        const algunoEnRuta = totalEnRuta > 0;
                        const excedeCapacidadLote =
                          unidadSeleccionada &&
                          capacidadUnidadKg > 0 &&
                          lote.pesoTotalKg > capacidadUnidadKg;

                        return (
                          <div
                            key={lote.id}
                            className={`p-3 rounded-xl border transition-all ${todosEnRuta
                                ? "bg-blue-50/90 border-[#0B2D4A] ring-1 ring-[#0B2D4A]/30 shadow-xs"
                                : algunoEnRuta
                                  ? "bg-indigo-50/50 border-indigo-200"
                                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs"
                              }`}
                          >
                            <div className="flex items-start justify-between gap-1.5 mb-1">
                              <span className="text-xs font-bold text-[#0B2D4A] leading-tight">
                                {lote.nombre}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${lote.badgeClass}`}
                              >
                                {lote.totalPaquetes} pqt{lote.totalPaquetes === 1 ? "" : "s"}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 line-clamp-1 mb-1.5">
                              {lote.subtitulo}
                            </p>

                            <div className="flex flex-wrap items-center gap-1 mb-2">
                              {lote.codigosPostales.map((cp) => (
                                <span
                                  key={cp}
                                  className="font-mono text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200"
                                >
                                  CP {cp}
                                </span>
                              ))}
                              <span className="text-[10.5px] font-bold text-slate-700 ml-auto">
                                {lote.pesoTotalKg.toFixed(1)} kg
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                              {excedeCapacidadLote ? (
                                <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0" /> Excede unidad
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {todosEnRuta
                                    ? "✓ Lote en ruta"
                                    : algunoEnRuta
                                      ? `${totalEnRuta}/${lote.totalPaquetes} en ruta`
                                      : "Disponible"}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => toggleLote(lote)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${todosEnRuta
                                    ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                    : algunoEnRuta
                                      ? "bg-[#0B2D4A] text-white hover:bg-[#123d63]"
                                      : "bg-[#0B2D4A] text-white hover:bg-[#123d63]"
                                  }`}
                              >
                                {todosEnRuta ? (
                                  <>
                                    <X className="w-3 h-3" />
                                    <span>Quitar</span>
                                  </>
                                ) : algunoEnRuta ? (
                                  <>
                                    <Plus className="w-3 h-3" />
                                    <span>Completar</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3" />
                                    <span>Cargar Lote</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {mostrarSelectorPaquetes && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Catálogo Individual de Envíos</span>
                      <span className="text-slate-400 text-[11px]">
                        Marca o desmarca paquetes para personalizar tu lote
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={busquedaPaquete}
                        onChange={(e) => setBusquedaPaquete(e.target.value)}
                        placeholder="Filtrar por guía (TR-...), destinatario, colonia, C.P. o ciudad..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B2D4A]"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {enviosElegiblesFiltrados.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400 italic">
                          No se encontraron envíos con ese criterio de búsqueda.
                        </div>
                      ) : (
                        enviosElegiblesFiltrados.map((item) => {
                          const seleccionado = idsSeleccionados.has(item.id);
                          const meta = obtenerMetaEstadoEnvio(item.estado);
                          const tieneReintento = item.intentoReparto > 0;

                          return (
                            <label
                              key={item.id}
                              className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${seleccionado
                                  ? "bg-blue-50/90 border-[#0B2D4A] text-[#0B2D4A]"
                                  : "bg-white border-slate-200 hover:bg-slate-100/70 text-slate-700"
                                }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={seleccionado}
                                  onChange={() => alternarEnvioEnRuta(item)}
                                  className="rounded border-slate-300 text-[#0B2D4A] focus:ring-[#0B2D4A]"
                                />
                                <span className="font-mono font-extrabold text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[#0B2D4A]">
                                  {item.guia}
                                </span>
                                <div className="truncate">
                                  <strong className="text-slate-900">
                                    {item.destinatarioNombre}
                                  </strong>{" "}
                                  <span className="text-slate-500">
                                    · {item.destinoCiudadResumen || "Nacional"}
                                    {item.destinoCodigoPostal
                                      ? ` (C.P. ${item.destinoCodigoPostal})`
                                      : ""}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {tieneReintento && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                    Intento #{item.intentoReparto}
                                  </span>
                                )}
                                <span className="font-bold text-slate-700 text-[11px]">
                                  {Number(item.pesoKg).toFixed(1)} kg
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeClass}`}
                                >
                                  {meta.etiqueta}
                                </span>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Optimización de ruta e itinerario */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50 border border-blue-200/90 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-blue-200/60">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#0B2D4A]">
                      3. Selección de Mejor Ruta y Priorización de Paradas
                    </span>
                  </div>

                  {enviosEnRuta.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={reoptimizarOrdenAutomatico}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B2D4A] text-white text-[11px] font-bold hover:bg-[#123d63] cursor-pointer transition-colors shadow-2xs"
                        title="Calcular el camino vial más corto entre paradas (Algoritmo TSP)"
                      >
                        <Sparkles className="w-3 h-3 text-sky-300" />
                        <span>Por Cercanía (TSP)</span>
                      </button>

                      <button
                        type="button"
                        onClick={ordenarPorCodigoPostal}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 text-[11px] font-bold hover:bg-slate-50 cursor-pointer transition-colors"
                        title="Agrupar paradas por Código Postal y sector"
                      >
                        <MapPin className="w-3 h-3 text-rose-500" />
                        <span>Por C.P. / Zona</span>
                      </button>

                      <button
                        type="button"
                        onClick={ordenarPorPrioridadUrgencia}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold hover:bg-amber-100 cursor-pointer transition-colors"
                        title="Priorizar paquetes con reintentos o reprogramados"
                      >
                        <Zap className="w-3 h-3 text-amber-600" />
                        <span>Urgentes Primero</span>
                      </button>

                      <button
                        type="button"
                        onClick={invertirRecorrido}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 text-[11px] font-bold hover:bg-slate-50 cursor-pointer transition-colors"
                        title="Invertir el sentido de la ruta"
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        <span>Invertir</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOpcionRutaSeleccionada("optima")}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${opcionRutaSeleccionada === "optima"
                        ? "bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                        : "bg-white/70 border-slate-200 hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-extrabold uppercase">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Mejor Ruta Recomendada (-{itinerarioCalculado.porcentajeAhorro}% dist.)</span>
                      </span>
                      <span className="text-xs font-black text-emerald-700">
                        {opcionRutaSeleccionada === "optima"
                          ? itinerarioCalculado.distanciaTotalKm
                          : Number((itinerarioCalculado.distanciaTotalKm / 1.25).toFixed(1))}{" "}
                        km
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#0B2D4A] leading-snug">
                      {itinerarioCalculado.corredorPrincipalResumen}
                    </div>
                    <div className="mt-1.5 text-[11px] text-slate-600 flex flex-wrap items-center gap-3">
                      <span>
                        Ahorro: <strong>-{itinerarioCalculado.ahorroKm} km</strong>
                      </span>
                      <span>&bull;</span>
                      <span>Menor congestión y secuencia postal continua</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOpcionRutaSeleccionada("alterna")}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${opcionRutaSeleccionada === "alterna"
                        ? "bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                        : "bg-white/60 border-slate-200 hover:border-slate-300 opacity-85"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10.5px] font-bold uppercase">
                        Ruta Alterna / Vía Secundaria
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        {itinerarioCalculado.distanciaSinOptimizarKm} km
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700 leading-snug">
                      {itinerarioCalculado.corredorAlternoResumen}
                    </div>
                    <div className="mt-1.5 text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                      <span>Tiempo est.: {itinerarioCalculado.tiempoSinOptimizarMin} min</span>
                      <span>&bull;</span>
                      <span>
                        Combustible: {itinerarioCalculado.combustibleSinOptimizarLitros} L
                      </span>
                    </div>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-white border border-blue-100 shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
                      <span>Distancia Total</span>
                      <Navigation className="w-3.5 h-3.5 text-[#0B2D4A]" />
                    </div>
                    <div className="text-base font-black text-[#0B2D4A] mt-0.5">
                      {itinerarioCalculado.distanciaTotalKm} km
                    </div>
                    <div className="text-[10.5px] text-emerald-700 font-semibold">
                      Optimizando {itinerarioCalculado.ahorroKm} km (-
                      {itinerarioCalculado.porcentajeAhorro}%)
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-blue-100 shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
                      <span>Tiempo Estimado</span>
                      <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                    </div>
                    <div className="text-base font-black text-[#0B2D4A] mt-0.5">
                      {itinerarioCalculado.tiempoTotalMin} min{" "}
                      <span className="text-xs font-normal text-slate-500">
                        (~{(itinerarioCalculado.tiempoTotalMin / 60).toFixed(1)} h)
                      </span>
                    </div>
                    <div className="text-[10.5px] text-slate-500">
                      Incluye traslado y entrega PIN
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-blue-100 shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
                      <span>Consumo Combustible</span>
                      <Fuel className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="text-base font-black text-[#0B2D4A] mt-0.5">
                      {itinerarioCalculado.combustibleTotalLitros.toFixed(2)} L
                    </div>
                    <div className="text-[10.5px] text-slate-500">
                      Rendimiento: ~{kmPorLitro} km/L
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-blue-100 shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
                      <span>Paradas / Carga</span>
                      <Package className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-base font-black text-[#0B2D4A] mt-0.5">
                      {itinerarioCalculado.paradas.length} parada
                      {itinerarioCalculado.paradas.length === 1 ? "" : "s"}
                    </div>
                    <div className="text-[10.5px] text-slate-500">
                      Peso total: {pesoTotalRutaKg.toFixed(2)} kg
                    </div>
                  </div>
                </div>

                {itinerarioCalculado.paradas.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span>Secuencia de Paradas (Hoja de Ruta)</span>
                      <span className="text-[10.5px] font-normal text-slate-500">
                        Salida desde Sucursal Origen:{" "}
                        <strong className="text-[#0B2D4A]">
                          {itinerarioCalculado.paradas[0]?.envio.sucursalRecepcionNombre ||
                            "Centro de Distribución Central"}
                        </strong>
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                      {itinerarioCalculado.paradas.map((parada, idx) => (
                        <div
                          key={parada.envio.id}
                          className="p-2.5 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs hover:border-slate-300 transition-all"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <span className="w-6 h-6 rounded-full bg-[#0B2D4A] text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                              {parada.orden}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-extrabold text-[#0B2D4A] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                  {parada.envio.guia}
                                </span>
                                <strong className="text-slate-900 truncate">
                                  {parada.envio.destinatarioNombre}
                                </strong>
                                <span className="text-slate-500 text-[11px] flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-[#D64545]" />
                                  {parada.envio.destinoCiudadResumen || "Nacional"}
                                  {parada.envio.destinoCodigoPostal
                                    ? ` · C.P. ${parada.envio.destinoCodigoPostal}`
                                    : ""}
                                </span>
                                {parada.envio.intentoReparto > 0 && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    Reintento #{parada.envio.intentoReparto}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                <strong className="text-slate-700">Vía:</strong>{" "}
                                {parada.corredorVial} · Peso: <strong>{Number(parada.envio.pesoKg).toFixed(1)} kg</strong>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="text-right text-[11px]">
                              <div className="font-bold text-[#0B2D4A]">
                                +{parada.distanciaTramoKm} km · +{parada.tiempoTramoMin} min
                              </div>
                              <div className="text-slate-400">
                                Acum: {parada.distanciaAcumuladaKm} km ·{" "}
                                {parada.combustibleTramoLitros} L
                              </div>
                            </div>

                            {itinerarioCalculado.paradas.length > 1 && (
                              <div className="flex items-center gap-1">
                                <select
                                  value={idx}
                                  onChange={(e) => cambiarPosicionParada(idx, Number(e.target.value))}
                                  className="text-[10.5px] font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 cursor-pointer focus:outline-none"
                                  title="Asignar posición directa a esta parada"
                                >
                                  {itinerarioCalculado.paradas.map((_, pos) => (
                                    <option key={pos} value={pos}>
                                      #{pos + 1}
                                    </option>
                                  ))}
                                </select>

                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => moverParada(idx, -1)}
                                    disabled={idx === 0}
                                    className="p-1 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-20 cursor-pointer"
                                    title="Subir prioridad de parada"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moverParada(idx, 1)}
                                    disabled={idx === itinerarioCalculado.paradas.length - 1}
                                    className="p-1 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-20 cursor-pointer"
                                    title="Bajar prioridad de parada"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => fijarComoPrimeraParada(idx)}
                                  disabled={idx === 0}
                                  className="p-1 rounded hover:bg-amber-50 text-amber-600 disabled:opacity-20 cursor-pointer"
                                  title="Fijar como 1ª parada prioritaria"
                                >
                                  <Star className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => removerParadaDeRuta(parada.envio.id)}
                              className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                              title="Retirar envío de esta ruta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {itinerarioCalculado.paradas.length > 0 && (
                  <MapaRutaInteractivo
                    paradas={itinerarioCalculado.paradas}
                    sucursalOrigenNombre={
                      itinerarioCalculado.paradas[0]?.envio.sucursalRecepcionNombre
                    }
                    choferNombre={choferSeleccionado?.nombreCompleto}
                    unidadPlacas={unidadSeleccionada?.placas}
                    distanciaTotalKm={itinerarioCalculado.distanciaTotalKm}
                    tiempoTotalMin={itinerarioCalculado.tiempoTotalMin}
                    combustibleTotalLitros={itinerarioCalculado.combustibleTotalLitros}
                    alturaPx={310}
                  />
                )}
              </div>

              <div className="cc-field !mb-0">
                <label htmlFor="asig-obs">Instrucciones de despacho para el chofer (opcional)</label>
                <input
                  id="asig-obs"
                  type="text"
                  maxLength={400}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Indicaciones de acceso, prioridad de entrega, recordatorio de PIN y foto..."
                />
              </div>
            </div>
          ) : (
            /* Inicio de ruta */
            envioInicial && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-sm font-black text-[#0B2D4A] px-2.5 py-0.5 rounded-lg bg-white border border-slate-200">
                      {envioInicial.guia}
                    </span>
                    <div className="text-xs text-slate-600 mt-1">
                      <strong>Destinatario:</strong> {envioInicial.destinatarioNombre} ·{" "}
                      <strong>Destino:</strong>{" "}
                      {envioInicial.destinoCiudadResumen || "Nacional"}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-[10.5px] font-bold uppercase text-slate-400 block">
                      Peso
                    </span>
                    <span className="font-extrabold text-[#0B2D4A]">
                      {Number(envioInicial.pesoKg).toFixed(2)} kg
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10.5px] font-bold uppercase text-slate-500 block">
                      Unidad Vehicular Asignada
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {envioInicial.unidadAsignadaPlacas || "Por confirmar"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10.5px] font-bold uppercase text-slate-500 block">
                      Operador Titular (Chofer)
                    </span>
                    <span className="font-bold text-slate-800">
                      {envioInicial.choferAsignadoNombre || "En sesión"}
                    </span>
                  </div>
                </div>

                {itinerarioCalculado.paradas.length > 0 && (
                  <MapaRutaInteractivo
                    paradas={itinerarioCalculado.paradas}
                    sucursalOrigenNombre={envioInicial.sucursalRecepcionNombre}
                    choferNombre={envioInicial.choferAsignadoNombre}
                    unidadPlacas={envioInicial.unidadAsignadaPlacas}
                    distanciaTotalKm={itinerarioCalculado.distanciaTotalKm}
                    tiempoTotalMin={itinerarioCalculado.tiempoTotalMin}
                    combustibleTotalLitros={itinerarioCalculado.combustibleTotalLitros}
                    alturaPx={290}
                  />
                )}

                <div className="cc-form-grid !mb-0">
                  <div className="cc-field">
                    <label htmlFor="ini-km-odometro">
                      <span className="inline-flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5" />
                        <span>Odómetro de salida km (opcional)</span>
                      </span>
                    </label>
                    <input
                      id="ini-km-odometro"
                      type="text"
                      inputMode="decimal"
                      value={kmInicialOdometro}
                      onKeyDown={(e) => bloquearTeclasNoNumericas(e, true)}
                      onChange={(e) =>
                        setKmInicialOdometro(limpiarDecimalPositivo(e.target.value, 2))
                      }
                      placeholder="Se toma el actual de la unidad si se omite"
                    />
                  </div>

                  <div className="cc-field">
                    <label htmlFor="ini-obs">Nota de salida a reparto (opcional)</label>
                    <input
                      id="ini-obs"
                      type="text"
                      maxLength={400}
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Salida de andén conforme a ruta optimizada..."
                    />
                  </div>
                </div>
              </div>
            )
          )}

          <div className="cc-modal-actions">
            <button
              type="button"
              className="cc-btn-cancel"
              onClick={onClose}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-confirmar-ruta-envio"
              className={`cc-btn-save ${modo === "asignar" && excedeCapacidadUnidad ? "!bg-rose-700 !cursor-not-allowed opacity-90 shadow-none" : ""
                }`}
              disabled={guardando || cargandoRecursos || (modo === "asignar" && excedeCapacidadUnidad)}
            >
              {guardando ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Guardando ruta...</span>
                </>
              ) : modo === "asignar" ? (
                excedeCapacidadUnidad ? (
                  <>
                    <AlertTriangle size={16} className="text-amber-300" />
                    <span>Bloqueado por Sobrecupo ({pesoTotalRutaKg} / {capacidadUnidadKg} kg)</span>
                  </>
                ) : (
                  <>
                    <Navigation size={16} />
                    <span>
                      Confirmar Ruta ({enviosEnRuta.length} parada
                      {enviosEnRuta.length === 1 ? "" : "s"})
                    </span>
                  </>
                )
              ) : (
                <>
                  <Navigation size={16} />
                  <span>Iniciar Recorrido de Entrega</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
