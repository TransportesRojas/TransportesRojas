import { useEffect, useMemo, useRef, useState } from "react";
import {
  Navigation,
  MapPin,
  Store,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  Truck,
  Clock,
  Fuel,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Package,
  Compass,
} from "lucide-react";
import {
  type EnvioListadoItem,
  obtenerMetaEstadoEnvio,
} from "../envios/types";
import {
  type ParadaOptimizadaItem,
  analizarGeografiaEnvio,
} from "../envios/EnvioModalAsignarRuta";

export interface PuntoMapaRuta {
  id: string;
  orden: number;
  etiqueta: string;
  subtitulo: string;
  corredorVial?: string;
  lat: number;
  lon: number;
  distanciaTramoKm?: number;
  tiempoTramoMin?: number;
  envio?: EnvioListadoItem;
}

interface MapaRutaInteractivoProps {
  paradas: ParadaOptimizadaItem[];
  sucursalOrigenNombre?: string | null;
  choferNombre?: string | null;
  unidadPlacas?: string | null;
  distanciaTotalKm?: number;
  tiempoTotalMin?: number;
  combustibleTotalLitros?: number;
  alturaPx?: number;
  mostrarControlesOperativosChofer?: boolean;
  onIniciarRecorrido?: (envio: EnvioListadoItem) => void;
  onValidarEntregaPin?: (envio: EnvioListadoItem) => void;
  onVerDetalleEnvio?: (envio: EnvioListadoItem) => void;
}

function obtenerCoordenadasSucursalOrigen(nombreSucursal?: string | null): {
  lat: number;
  lon: number;
  nombre: string;
} {
  const limpio = (nombreSucursal || "").toLowerCase();
  if (limpio.includes("mazatlán") || limpio.includes("mazatlan")) {
    return {
      lat: 23.21652,
      lon: -106.41632,
      nombre: nombreSucursal || "Sucursal Mazatlán Sur",
    };
  }
  if (limpio.includes("mochis") || limpio.includes("ahome")) {
    return {
      lat: 25.79046,
      lon: -108.99305,
      nombre: nombreSucursal || "Sucursal Los Mochis Norte",
    };
  }
  if (limpio.includes("palmito") || limpio.includes("industrial") || limpio.includes("poniente")) {
    return {
      lat: 24.78245,
      lon: -107.42815,
      nombre: nombreSucursal || "Centro Operativo Culiacán Poniente",
    };
  }
  return {
    lat: 24.80491,
    lon: -107.39401,
    nombre: nombreSucursal || "Sucursal Matriz Culiacán Centro",
  };
}

// Red vial terrestre de respaldo
interface NodoVial {
  id: string;
  lat: number;
  lon: number;
  vecinos: string[];
}

const NODOS_RED_VIAL: Record<string, NodoVial> = {
  // Eje Obregón y Centro
  OBR_CENTRO: {
    id: "OBR_CENTRO",
    lat: 24.80491,
    lon: -107.39401,
    vecinos: ["OBR_MADERO", "OBR_SUR_1"],
  },
  OBR_MADERO: {
    id: "OBR_MADERO",
    lat: 24.8066,
    lon: -107.3939,
    vecinos: ["OBR_CENTRO", "OBR_MALECON_VIEJO", "MADERO_ESTE_1", "MADERO_OESTE_1"],
  },
  OBR_MALECON_VIEJO: {
    id: "OBR_MALECON_VIEJO",
    lat: 24.8112,
    lon: -107.3943,
    vecinos: ["OBR_MADERO", "PUENTE_HIDALGO", "NINOS_HEROES_1"],
  },
  PUENTE_HIDALGO: {
    id: "PUENTE_HIDALGO",
    lat: 24.8135,
    lon: -107.3945,
    vecinos: ["OBR_MALECON_VIEJO", "SANCHEZ_ALONSO_1", "OBR_UNIVERSITARIOS"],
  },
  SANCHEZ_ALONSO_1: {
    id: "SANCHEZ_ALONSO_1",
    lat: 24.8195,
    lon: -107.3921,
    vecinos: ["PUENTE_HIDALGO", "OBR_UNIVERSITARIOS"],
  },
  OBR_UNIVERSITARIOS: {
    id: "OBR_UNIVERSITARIOS",
    lat: 24.8242,
    lon: -107.3932,
    vecinos: ["PUENTE_HIDALGO", "SANCHEZ_ALONSO_1", "UNIVERSITARIOS_CU", "SALIDA_NORTE_15"],
  },
  UNIVERSITARIOS_CU: {
    id: "UNIVERSITARIOS_CU",
    lat: 24.8245,
    lon: -107.3812,
    vecinos: ["OBR_UNIVERSITARIOS"],
  },

  // Tres Ríos y Pedro Infante
  NINOS_HEROES_1: {
    id: "NINOS_HEROES_1",
    lat: 24.8104,
    lon: -107.4005,
    vecinos: ["OBR_MALECON_VIEJO", "PUENTE_JUAREZ"],
  },
  PUENTE_JUAREZ: {
    id: "PUENTE_JUAREZ",
    lat: 24.8095,
    lon: -107.4048,
    vecinos: ["NINOS_HEROES_1", "PEDRO_INFANTE_1", "INSURGENTES_CENTRO"],
  },
  PEDRO_INFANTE_1: {
    id: "PEDRO_INFANTE_1",
    lat: 24.8129,
    lon: -107.4085,
    vecinos: ["PUENTE_JUAREZ", "PEDRO_INFANTE_2"],
  },
  PEDRO_INFANTE_2: {
    id: "PEDRO_INFANTE_2",
    lat: 24.8082,
    lon: -107.4215,
    vecinos: ["PEDRO_INFANTE_1", "PUENTE_ARJONA"],
  },
  PUENTE_ARJONA: {
    id: "PUENTE_ARJONA",
    lat: 24.7985,
    lon: -107.4268,
    vecinos: ["PEDRO_INFANTE_2", "ZAPATA_PALMITO"],
  },

  // Sur-Centro
  OBR_SUR_1: {
    id: "OBR_SUR_1",
    lat: 24.7968,
    lon: -107.3941,
    vecinos: ["OBR_CENTRO", "BRAVO_ALMADA", "OBR_PASCUAL_OROZCO"],
  },
  MADERO_OESTE_1: {
    id: "MADERO_OESTE_1",
    lat: 24.8058,
    lon: -107.3992,
    vecinos: ["OBR_MADERO", "INSURGENTES_CENTRO", "BRAVO_ALMADA"],
  },
  INSURGENTES_CENTRO: {
    id: "INSURGENTES_CENTRO",
    lat: 24.8015,
    lon: -107.4038,
    vecinos: ["PUENTE_JUAREZ", "MADERO_OESTE_1", "ZAPATA_INSURGENTES"],
  },
  BRAVO_ALMADA: {
    id: "BRAVO_ALMADA",
    lat: 24.7941,
    lon: -107.3992,
    vecinos: ["MADERO_OESTE_1", "OBR_SUR_1", "ZAPATA_INSURGENTES", "BRAVO_SUR"],
  },
  BRAVO_SUR: {
    id: "BRAVO_SUR",
    lat: 24.7892,
    lon: -107.3992,
    vecinos: ["BRAVO_ALMADA", "OBR_PASCUAL_OROZCO"],
  },
  OBR_PASCUAL_OROZCO: {
    id: "OBR_PASCUAL_OROZCO",
    lat: 24.7892,
    lon: -107.3938,
    vecinos: ["OBR_SUR_1", "BRAVO_SUR", "NUEVO_CULIACAN"],
  },
  NUEVO_CULIACAN: {
    id: "NUEVO_CULIACAN",
    lat: 24.7892,
    lon: -107.3865,
    vecinos: ["OBR_PASCUAL_OROZCO", "COLEGIO_MILITAR_1"],
  },

  // Poniente-Industrial
  ZAPATA_INSURGENTES: {
    id: "ZAPATA_INSURGENTES",
    lat: 24.7928,
    lon: -107.4062,
    vecinos: ["INSURGENTES_CENTRO", "BRAVO_ALMADA", "ZAPATA_MEDIA"],
  },
  ZAPATA_MEDIA: {
    id: "ZAPATA_MEDIA",
    lat: 24.7875,
    lon: -107.4175,
    vecinos: ["ZAPATA_INSURGENTES", "ZAPATA_PALMITO"],
  },
  ZAPATA_PALMITO: {
    id: "ZAPATA_PALMITO",
    lat: 24.78245,
    lon: -107.42815,
    vecinos: ["ZAPATA_MEDIA", "PUENTE_ARJONA", "ENTR_KUMATE"],
  },
  ENTR_KUMATE: {
    id: "ENTR_KUMATE",
    lat: 24.7795,
    lon: -107.4368,
    vecinos: ["ZAPATA_PALMITO", "KUMATE_CANACO", "CARR_NAVOLATO"],
  },
  KUMATE_CANACO: {
    id: "KUMATE_CANACO",
    lat: 24.7568,
    lon: -107.441,
    vecinos: ["ENTR_KUMATE", "LIBRAMIENTO_SUR"],
  },

  // Oriente-Sureste
  MADERO_ESTE_1: {
    id: "MADERO_ESTE_1",
    lat: 24.8065,
    lon: -107.3835,
    vecinos: ["OBR_MADERO", "QUINTAS_MORA", "COLEGIO_MILITAR_1"],
  },
  QUINTAS_MORA: {
    id: "QUINTAS_MORA",
    lat: 24.8087,
    lon: -107.3724,
    vecinos: ["MADERO_ESTE_1"],
  },
  COLEGIO_MILITAR_1: {
    id: "COLEGIO_MILITAR_1",
    lat: 24.7915,
    lon: -107.3775,
    vecinos: ["MADERO_ESTE_1", "NUEVO_CULIACAN", "COLEGIO_MILITAR_SUR"],
  },
  COLEGIO_MILITAR_SUR: {
    id: "COLEGIO_MILITAR_SUR",
    lat: 24.7782,
    lon: -107.3698,
    vecinos: ["COLEGIO_MILITAR_1", "LIBRAMIENTO_SUR"],
  },

  // Corredores regionales
  LIBRAMIENTO_SUR: {
    id: "LIBRAMIENTO_SUR",
    lat: 24.735,
    lon: -107.405,
    vecinos: ["KUMATE_CANACO", "COLEGIO_MILITAR_SUR", "MAXIPISTA_COSTA_RICA"],
  },
  MAXIPISTA_COSTA_RICA: {
    id: "MAXIPISTA_COSTA_RICA",
    lat: 24.585,
    lon: -107.365,
    vecinos: ["LIBRAMIENTO_SUR", "MAXIPISTA_ELOTA"],
  },
  MAXIPISTA_ELOTA: {
    id: "MAXIPISTA_ELOTA",
    lat: 23.9189,
    lon: -106.8906,
    vecinos: ["MAXIPISTA_COSTA_RICA", "MAZATLAN_ENTRADA"],
  },
  MAZATLAN_ENTRADA: {
    id: "MAZATLAN_ENTRADA",
    lat: 23.265,
    lon: -106.422,
    vecinos: ["MAXIPISTA_ELOTA", "MAZATLAN_CENTRO", "MAZATLAN_DORADA"],
  },
  MAZATLAN_CENTRO: {
    id: "MAZATLAN_CENTRO",
    lat: 23.21652,
    lon: -106.41632,
    vecinos: ["MAZATLAN_ENTRADA", "MAZATLAN_DORADA"],
  },
  MAZATLAN_DORADA: {
    id: "MAZATLAN_DORADA",
    lat: 23.2425,
    lon: -106.4512,
    vecinos: ["MAZATLAN_ENTRADA", "MAZATLAN_CENTRO"],
  },
  CARR_NAVOLATO: {
    id: "CARR_NAVOLATO",
    lat: 24.7661,
    lon: -107.6944,
    vecinos: ["ENTR_KUMATE"],
  },
  SALIDA_NORTE_15: {
    id: "SALIDA_NORTE_15",
    lat: 24.865,
    lon: -107.435,
    vecinos: ["OBR_UNIVERSITARIOS", "AUT_GUAMUCHIL"],
  },
  AUT_GUAMUCHIL: {
    id: "AUT_GUAMUCHIL",
    lat: 25.4609,
    lon: -108.0772,
    vecinos: ["SALIDA_NORTE_15", "AUT_GUASAVE"],
  },
  AUT_GUASAVE: {
    id: "AUT_GUASAVE",
    lat: 25.5674,
    lon: -108.4676,
    vecinos: ["AUT_GUAMUCHIL", "MOCHIS_CENTRO"],
  },
  MOCHIS_CENTRO: {
    id: "MOCHIS_CENTRO",
    lat: 25.79046,
    lon: -108.99305,
    vecinos: ["AUT_GUASAVE", "MOCHIS_SCALLY"],
  },
  MOCHIS_SCALLY: {
    id: "MOCHIS_SCALLY",
    lat: 25.7982,
    lon: -108.9985,
    vecinos: ["MOCHIS_CENTRO"],
  },
};

function distGrados(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  return Math.hypot((a.lat - b.lat) * 111, (a.lon - b.lon) * 101.5);
}

function nodoMasCercano(pt: { lat: number; lon: number }): NodoVial {
  let mejor: NodoVial = NODOS_RED_VIAL.OBR_CENTRO;
  let minD = Infinity;
  for (const n of Object.values(NODOS_RED_VIAL)) {
    const d = distGrados(pt, n);
    if (d < minD) {
      minD = d;
      mejor = n;
    }
  }
  return mejor;
}

function rutaDijkstraRedVial(
  origen: { lat: number; lon: number },
  destino: { lat: number; lon: number }
): { lat: number; lon: number }[] {
  const nIni = nodoMasCercano(origen);
  const nFin = nodoMasCercano(destino);

  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const visitados = new Set<string>();

  for (const k of Object.keys(NODOS_RED_VIAL)) {
    dist[k] = Infinity;
    prev[k] = null;
  }
  dist[nIni.id] = 0;

  while (visitados.size < Object.keys(NODOS_RED_VIAL).length) {
    let u: string | null = null;
    let mejor = Infinity;
    for (const k of Object.keys(NODOS_RED_VIAL)) {
      if (!visitados.has(k) && dist[k] < mejor) {
        mejor = dist[k];
        u = k;
      }
    }
    if (!u || u === nFin.id) break;
    visitados.add(u);

    const nodoU = NODOS_RED_VIAL[u];
    for (const v of nodoU.vecinos) {
      const nodoV = NODOS_RED_VIAL[v];
      if (!nodoV || visitados.has(v)) continue;
      const alt = dist[u] + distGrados(nodoU, nodoV);
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    }
  }

  const caminoNodos: NodoVial[] = [];
  let curr: string | null = nFin.id;
  while (curr) {
    caminoNodos.unshift(NODOS_RED_VIAL[curr]);
    curr = prev[curr];
  }

  const puntos: { lat: number; lon: number }[] = [{ lat: origen.lat, lon: origen.lon }];

  if (distGrados(origen, nIni) > 0.08) {
    puntos.push({ lat: origen.lat, lon: nIni.lon });
  }

  for (const n of caminoNodos) {
    puntos.push({ lat: n.lat, lon: n.lon });
  }

  if (distGrados(nFin, destino) > 0.08) {
    puntos.push({ lat: destino.lat, lon: nFin.lon });
  }

  puntos.push({ lat: destino.lat, lon: destino.lon });
  return puntos;
}

function construirGeometriaVialTerrestre(
  puntosParadas: PuntoMapaRuta[]
): { lat: number; lon: number }[] {
  if (puntosParadas.length <= 1) {
    return puntosParadas.map((p) => ({ lat: p.lat, lon: p.lon }));
  }

  const resultado: { lat: number; lon: number }[] = [];
  for (let i = 0; i < puntosParadas.length - 1; i++) {
    const tramo = rutaDijkstraRedVial(puntosParadas[i], puntosParadas[i + 1]);
    if (i === 0) {
      resultado.push(...tramo);
    } else {
      resultado.push(...tramo.slice(1));
    }
  }
  return resultado;
}

// Proyección Web Mercator (EPSG:3857)
function lonToWorldX(lon: number, zoom: number): number {
  const scale = 256 * Math.pow(2, zoom);
  return ((lon + 180) / 360) * scale;
}

function latToWorldY(lat: number, zoom: number): number {
  const latRad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  const scale = 256 * Math.pow(2, zoom);
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  return (0.5 - mercN / (2 * Math.PI)) * scale;
}

function worldXToLon(worldX: number, zoom: number): number {
  const scale = 256 * Math.pow(2, zoom);
  return (worldX / scale) * 360 - 180;
}

function worldYToLat(worldY: number, zoom: number): number {
  const scale = 256 * Math.pow(2, zoom);
  const n = Math.PI - (2 * Math.PI * worldY) / scale;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

// Desplazamiento entre paradas del mismo código postal
const OFFSETS_MANZANAS_COLONIA = [
  { dLat: 0.0, dLon: 0.0 },
  { dLat: 0.0022, dLon: 0.0021 },
  { dLat: -0.0018, dLon: 0.0028 },
  { dLat: 0.0019, dLon: -0.0026 },
  { dLat: -0.0026, dLon: -0.0022 },
  { dLat: 0.0035, dLon: 0.0006 },
  { dLat: -0.0033, dLon: 0.0009 },
  { dLat: 0.0007, dLon: 0.0038 },
  { dLat: -0.0008, dLon: -0.0036 },
];

export function MapaRutaInteractivo({
  paradas,
  sucursalOrigenNombre,
  choferNombre,
  unidadPlacas,
  distanciaTotalKm = 0,
  tiempoTotalMin = 0,
  combustibleTotalLitros = 0,
  alturaPx = 430,
  mostrarControlesOperativosChofer = false,
  onIniciarRecorrido,
  onValidarEntregaPin,
  onVerDetalleEnvio,
}: MapaRutaInteractivoProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const [dimensiones, setDimensiones] = useState({ width: 760, height: alturaPx });

  const origen = useMemo(
    () =>
      obtenerCoordenadasSucursalOrigen(
        sucursalOrigenNombre || paradas[0]?.envio.sucursalRecepcionNombre
      ),
    [sucursalOrigenNombre, paradas]
  );

  // Secuencia de paradas sobre coordenadas viales
  const puntosRuta = useMemo<PuntoMapaRuta[]>(() => {
    const lista: PuntoMapaRuta[] = [
      {
        id: "origen-sucursal",
        orden: 0,
        etiqueta: origen.nombre,
        subtitulo: "Punto de salida y despacho de unidad",
        lat: origen.lat,
        lon: origen.lon,
      },
    ];

    const conteoPorCoord = new Map<string, number>();

    paradas.forEach((p) => {
      const geo = analizarGeografiaEnvio(p.envio);
      const claveCoord = `${geo.lat.toFixed(4)}_${geo.lon.toFixed(4)}`;
      const repeticiones = conteoPorCoord.get(claveCoord) ?? 0;
      conteoPorCoord.set(claveCoord, repeticiones + 1);

      // Evita encimamiento cuando dos entregas comparten coordenadas
      let latFinal = geo.lat;
      let lonFinal = geo.lon;
      if (repeticiones > 0) {
        const offset = OFFSETS_MANZANAS_COLONIA[repeticiones % OFFSETS_MANZANAS_COLONIA.length];
        latFinal = Number((geo.lat + offset.dLat * 0.45).toFixed(6));
        lonFinal = Number((geo.lon + offset.dLon * 0.45).toFixed(6));
      }

      lista.push({
        id: `parada-${p.envio.id}`,
        orden: p.orden,
        etiqueta: `${p.envio.guia} · ${p.envio.destinatarioNombre}`,
        subtitulo:
          p.envio.destinoCalleCompleta ||
          `${p.envio.destinoCiudadResumen || "Sinaloa"}${
            p.envio.destinoCodigoPostal ? ` (C.P. ${p.envio.destinoCodigoPostal})` : ""
          }`,
        corredorVial: p.corredorVial,
        lat: latFinal,
        lon: lonFinal,
        distanciaTramoKm: p.distanciaTramoKm,
        tiempoTramoMin: p.tiempoTramoMin,
        envio: p.envio,
      });
    });

    return lista;
  }, [origen, paradas]);

  const geometriaVialRespaldo = useMemo(
    () => construirGeometriaVialTerrestre(puntosRuta),
    [puntosRuta]
  );

  // Geometría calle por calle desde OSRM
  const [geometriaOsrm, setGeometriaOsrm] = useState<{ lat: number; lon: number }[] | null>(
    null
  );

  useEffect(() => {
    if (puntosRuta.length <= 1) {
      setGeometriaOsrm(null);
      return;
    }

    let cancelado = false;
    const coordsQuery = puntosRuta
      .map((pt) => `${pt.lon.toFixed(6)},${pt.lat.toFixed(6)}`)
      .join(";");
    const urlOsrm = `https://router.project-osrm.org/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson`;

    fetch(urlOsrm)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelado) return;
        const coords: [number, number][] | undefined =
          data?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
          setGeometriaOsrm(coords.map(([lon, lat]) => ({ lat, lon })));
        } else {
          setGeometriaOsrm(null);
        }
      })
      .catch(() => {
        if (!cancelado) setGeometriaOsrm(null);
      });

    return () => {
      cancelado = true;
    };
  }, [puntosRuta]);

  const trazadoCarreteroActivo = geometriaOsrm ?? geometriaVialRespaldo;

  // Encuadre inicial según dispersión
  const encuadreOptimo = useMemo(() => {
    if (puntosRuta.length <= 1) {
      return { lat: origen.lat, lon: origen.lon, zoom: 14 };
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;

    for (const pt of puntosRuta) {
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
      if (pt.lon < minLon) minLon = pt.lon;
      if (pt.lon > maxLon) maxLon = pt.lon;
    }

    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    const spanLat = Math.max(0.012, maxLat - minLat);
    const spanLon = Math.max(0.012, maxLon - minLon);
    const maxSpan = Math.max(spanLat, spanLon);

    let zoom = 13;
    if (maxSpan > 2.2) zoom = 7;
    else if (maxSpan > 1.1) zoom = 8;
    else if (maxSpan > 0.55) zoom = 9;
    else if (maxSpan > 0.25) zoom = 10;
    else if (maxSpan > 0.12) zoom = 11;
    else if (maxSpan > 0.05) zoom = 12;
    else if (maxSpan > 0.02) zoom = 13;
    else zoom = 14;

    return { lat: centerLat, lon: centerLon, zoom };
  }, [puntosRuta, origen]);

  const [centroMapa, setCentroMapa] = useState({
    lat: encuadreOptimo.lat,
    lon: encuadreOptimo.lon,
  });
  const [zoom, setZoom] = useState(encuadreOptimo.zoom);
  const [puntoSeleccionadoId, setPuntoSeleccionadoId] = useState<string>(() =>
    paradas.length > 0 ? `parada-${paradas[0].envio.id}` : "origen-sucursal"
  );
  const [arrastrando, setArrastrando] = useState(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    worldX: number;
    worldY: number;
  } | null>(null);

  useEffect(() => {
    setCentroMapa({ lat: encuadreOptimo.lat, lon: encuadreOptimo.lon });
    setZoom(encuadreOptimo.zoom);
    if (paradas.length > 0) {
      setPuntoSeleccionadoId((prev) =>
        puntosRuta.some((p) => p.id === prev) ? prev : `parada-${paradas[0].envio.id}`
      );
    } else {
      setPuntoSeleccionadoId("origen-sucursal");
    }
  }, [encuadreOptimo.lat, encuadreOptimo.lon, encuadreOptimo.zoom, paradas, puntosRuta]);

  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;

    const actualizarTamano = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 100) {
        setDimensiones({
          width: Math.round(rect.width),
          height: alturaPx,
        });
      }
    };

    actualizarTamano();
    const obs = new ResizeObserver(actualizarTamano);
    obs.observe(el);
    return () => obs.disconnect();
  }, [alturaPx]);

  const centerWorldX = lonToWorldX(centroMapa.lon, zoom);
  const centerWorldY = latToWorldY(centroMapa.lat, zoom);

  const puntosEnPantalla = useMemo(() => {
    return puntosRuta.map((pt) => {
      const wx = lonToWorldX(pt.lon, zoom);
      const wy = latToWorldY(pt.lat, zoom);
      return {
        ...pt,
        x: wx - centerWorldX + dimensiones.width / 2,
        y: wy - centerWorldY + dimensiones.height / 2,
      };
    });
  }, [puntosRuta, zoom, centerWorldX, centerWorldY, dimensiones.width, dimensiones.height]);

  const verticesVialesEnPantalla = useMemo(() => {
    return trazadoCarreteroActivo.map((v) => {
      const wx = lonToWorldX(v.lon, zoom);
      const wy = latToWorldY(v.lat, zoom);
      return {
        x: wx - centerWorldX + dimensiones.width / 2,
        y: wy - centerWorldY + dimensiones.height / 2,
      };
    });
  }, [
    trazadoCarreteroActivo,
    zoom,
    centerWorldX,
    centerWorldY,
    dimensiones.width,
    dimensiones.height,
  ]);

  // Tiles visibles en el viewport
  const tilesVisibles = useMemo(() => {
    const maxTileIndex = Math.pow(2, zoom);
    const leftWorld = centerWorldX - dimensiones.width / 2;
    const rightWorld = centerWorldX + dimensiones.width / 2;
    const topWorld = centerWorldY - dimensiones.height / 2;
    const bottomWorld = centerWorldY + dimensiones.height / 2;

    const minTileX = Math.floor(leftWorld / 256);
    const maxTileX = Math.floor(rightWorld / 256);
    const minTileY = Math.max(0, Math.floor(topWorld / 256));
    const maxTileY = Math.min(maxTileIndex - 1, Math.floor(bottomWorld / 256));

    const tiles: {
      key: string;
      url: string;
      left: number;
      top: number;
    }[] = [];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const wrappedX = ((tx % maxTileIndex) + maxTileIndex) % maxTileIndex;
        tiles.push({
          key: `${zoom}-${wrappedX}-${ty}`,
          url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`,
          left: Math.round(tx * 256 - centerWorldX + dimensiones.width / 2),
          top: Math.round(ty * 256 - centerWorldY + dimensiones.height / 2),
        });
      }
    }
    return tiles;
  }, [zoom, centerWorldX, centerWorldY, dimensiones.width, dimensiones.height]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-map-control='true']")) return;
    setArrastrando(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      worldX: centerWorldX,
      worldY: centerWorldY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!arrastrando || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    const nuevoWorldX = dragStartRef.current.worldX - dx;
    const nuevoWorldY = dragStartRef.current.worldY - dy;

    setCentroMapa({
      lat: worldYToLat(nuevoWorldY, zoom),
      lon: worldXToLon(nuevoWorldX, zoom),
    });
  };

  const finalizarArrastre = () => {
    setArrastrando(false);
    dragStartRef.current = null;
  };

  const enfocarPunto = (pt: PuntoMapaRuta) => {
    setPuntoSeleccionadoId(pt.id);
    setCentroMapa({ lat: pt.lat, lon: pt.lon });
    if (zoom < 14) setZoom(14);
  };

  const restablecerVistaCompleta = () => {
    setCentroMapa({ lat: encuadreOptimo.lat, lon: encuadreOptimo.lon });
    setZoom(encuadreOptimo.zoom);
  };

  const puntoActivo = useMemo(
    () =>
      puntosRuta.find((p) => p.id === puntoSeleccionadoId) ??
      puntosRuta[puntosRuta.length > 1 ? 1 : 0],
    [puntosRuta, puntoSeleccionadoId]
  );

  const urlGoogleMaps = useMemo(() => {
    if (puntosRuta.length <= 1) {
      return `https://www.google.com/maps/search/?api=1&query=${origen.lat},${origen.lon}`;
    }
    const ultimo = puntosRuta[puntosRuta.length - 1];
    const intermedios = puntosRuta
      .slice(1, -1)
      .map((p) => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`)
      .join("|");
    const base = `https://www.google.com/maps/dir/?api=1&origin=${origen.lat.toFixed(
      5
    )},${origen.lon.toFixed(5)}&destination=${ultimo.lat.toFixed(5)},${ultimo.lon.toFixed(
      5
    )}&travelmode=driving`;
    return intermedios ? `${base}&waypoints=${encodeURIComponent(intermedios)}` : base;
  }, [puntosRuta, origen]);

  const polylinePoints = useMemo(
    () =>
      verticesVialesEnPantalla
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" "),
    [verticesVialesEnPantalla]
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-[#0B2D4A] to-[#123d63] text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
            <Compass className="w-4 h-4 text-sky-300" />
          </div>
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2">
              <span>Mapa Vial de la Ruta de Entrega</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-300/40 text-emerald-200 text-[10px] font-bold">
                {paradas.length} parada{paradas.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="text-[11px] text-white/80 flex flex-wrap items-center gap-2 mt-0.5">
              <span>
                Origen: <strong>{origen.nombre}</strong>
              </span>
              {choferNombre && (
                <>
                  <span>&bull;</span>
                  <span>
                    Chofer: <strong>{choferNombre}</strong>
                  </span>
                </>
              )}
              {unidadPlacas && (
                <>
                  <span>&bull;</span>
                  <span>
                    Unidad: <strong className="font-mono">{unidadPlacas}</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {distanciaTotalKm > 0 && (
            <div className="hidden sm:flex items-center gap-3 px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-[11px]">
              <span className="inline-flex items-center gap-1 font-bold">
                <Navigation className="w-3.5 h-3.5 text-sky-300" />
                {distanciaTotalKm} km
              </span>
              <span className="inline-flex items-center gap-1 font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                {tiempoTotalMin} min
              </span>
              {combustibleTotalLitros > 0 && (
                <span className="inline-flex items-center gap-1 font-bold">
                  <Fuel className="w-3.5 h-3.5 text-emerald-300" />
                  {combustibleTotalLitros.toFixed(1)} L
                </span>
              )}
            </div>
          )}

          <a
            href={urlGoogleMaps}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#0B2D4A] hover:bg-blue-50 text-[11px] font-extrabold shadow-2xs transition-colors no-underline"
            title="Abrir navegación GPS paso a paso en Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Navegar en Google Maps</span>
          </a>
        </div>
      </div>

      {/* Cinta de paradas */}
      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
        {puntosRuta.map((pt) => {
          const activo = pt.id === puntoActivo?.id;
          const esOrigen = pt.orden === 0;
          const estadoEnvio = pt.envio?.estado;
          const entregado = estadoEnvio === "entregado";

          return (
            <button
              key={pt.id}
              type="button"
              onClick={() => enfocarPunto(pt)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 border transition-all cursor-pointer ${
                activo
                  ? "bg-[#0B2D4A] text-white border-[#0B2D4A] shadow-2xs"
                  : entregado
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                  activo
                    ? "bg-white text-[#0B2D4A]"
                    : esOrigen
                    ? "bg-[#D64545] text-white"
                    : entregado
                    ? "bg-emerald-600 text-white"
                    : "bg-[#0B2D4A] text-white"
                }`}
              >
                {esOrigen ? "S" : pt.orden}
              </span>
              <span className="truncate max-w-[165px]">
                {esOrigen
                  ? "Sucursal Origen"
                  : `${pt.envio?.guia ?? `Parada #${pt.orden}`} · ${
                      pt.envio?.destinoCiudadResumen || "Entrega"
                    }`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lienzo del mapa */}
      <div
        ref={contenedorRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={finalizarArrastre}
        onMouseLeave={finalizarArrastre}
        style={{ height: `${alturaPx}px` }}
        className={`relative w-full overflow-hidden select-none bg-[#e6edf5] ${
          arrastrando ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div
          className="absolute inset-0 opacity-45 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="absolute inset-0 pointer-events-none">
          {tilesVisibles.map((tile) => (
            <img
              key={tile.key}
              src={tile.url}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: `${tile.left}px`,
                top: `${tile.top}px`,
                width: "256px",
                height: "256px",
              }}
              className="max-w-none select-none"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = "0";
              }}
            />
          ))}
        </div>

        {/* Capa Vectorial SVG: Trazado Vial sobre Calles, Avenidas y Autopistas */}
        <svg
          width={dimensiones.width}
          height={dimensiones.height}
          className="absolute inset-0 pointer-events-none"
        >
          {verticesVialesEnPantalla.length > 1 && (
            <>
              <polyline
                fill="none"
                stroke="#0F172A"
                strokeWidth={9}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
                opacity={0.14}
              />
              <polyline
                fill="none"
                stroke="#ffffff"
                strokeWidth={7}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
                opacity={0.96}
              />
              <polyline
                fill="none"
                stroke="#2563EB"
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />
            </>
          )}
        </svg>

        {/* Marcadores de ruta */}
        {puntosEnPantalla.map((pt) => {
          const esOrigen = pt.orden === 0;
          const esSeleccionado = pt.id === puntoActivo?.id;
          const estado = pt.envio?.estado;
          const esEntregado = estado === "entregado";
          const esEnRuta = estado === "en_ruta";

          let bgPin = "bg-[#0B2D4A] border-white text-white shadow-md";
          if (esOrigen) bgPin = "bg-[#D64545] border-white text-white shadow-md";
          else if (esEntregado) bgPin = "bg-[#16A34A] border-white text-white shadow-md";
          else if (esEnRuta) bgPin = "bg-[#2563EB] border-white text-white shadow-md";

          return (
            <div
              key={pt.id}
              data-map-control="true"
              style={{
                left: `${pt.x}px`,
                top: `${pt.y}px`,
              }}
              className={`absolute -translate-x-1/2 -translate-y-full ${
                esSeleccionado ? "z-30" : "z-10"
              }`}
            >
              {esSeleccionado && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-xl bg-[#0B2D4A] text-white shadow-2xl border border-white/20 text-xs pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between gap-1.5 mb-1 pb-1 border-b border-white/15">
                    <span className="font-extrabold text-[11px] text-sky-300">
                      {esOrigen ? "Sucursal Origen" : `Parada #${pt.orden}`}
                    </span>
                    {pt.envio && (
                      <span className="font-mono text-[10px] bg-white/15 px-1.5 py-0.2 rounded text-white font-bold">
                        {pt.envio.guia}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-white truncate text-[11px]">
                    {pt.etiqueta}
                  </div>
                  <div className="text-[10px] text-slate-300 truncate mt-0.5">
                    {pt.subtitulo}
                  </div>
                  {pt.distanciaTramoKm !== undefined && (
                    <div className="mt-1 pt-1 border-t border-white/10 text-[10px] text-emerald-300 font-semibold flex items-center justify-between">
                      <span>+{pt.distanciaTramoKm} km · ~{pt.tiempoTramoMin} min</span>
                      <span className="text-slate-300">Tramo #{pt.orden}</span>
                    </div>
                  )}
                  {/* Flechita inferior del tooltip */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#0B2D4A]" />
                </div>
              )}

              <button
                type="button"
                onClick={() => setPuntoSeleccionadoId(pt.id)}
                className={`group relative flex items-center justify-center rounded-full border-2 transition-transform cursor-pointer ${bgPin} ${
                  esSeleccionado
                    ? "w-9 h-9 scale-110 ring-4 ring-[#0B2D4A]/30"
                    : "w-7 h-7 hover:scale-115"
                }`}
                title={`${esOrigen ? "Sucursal Origen" : `Parada #${pt.orden}`}: ${pt.etiqueta}`}
              >
                {esOrigen ? (
                  <Store className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-xs font-black">{pt.orden}</span>
                )}
              </button>

              <div
                className={`w-0 h-0 mx-auto -mt-0.5 border-x-[5px] border-x-transparent border-t-[6px] ${
                  esOrigen
                    ? "border-t-[#D64545]"
                    : esEntregado
                    ? "border-t-[#16A34A]"
                    : esEnRuta
                    ? "border-t-[#2563EB]"
                    : "border-t-[#0B2D4A]"
                }`}
              />
            </div>
          );
        })}

        {/* Controles de zoom */}
        <div
          data-map-control="true"
          className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-xs p-1.5 rounded-xl border border-slate-200 shadow-md"
        >
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(16, z + 1))}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#0B2D4A] flex items-center justify-center cursor-pointer transition-colors"
            title="Acercar mapa"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(6, z - 1))}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#0B2D4A] flex items-center justify-center cursor-pointer transition-colors"
            title="Alejar mapa"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="border-t border-slate-200 my-0.5" />
          <button
            type="button"
            onClick={restablecerVistaCompleta}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[#0B2D4A] flex items-center justify-center cursor-pointer transition-colors"
            title="Centrar toda la ruta"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Leyenda */}
        <div
          data-map-control="true"
          className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-xs px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-[10.5px] space-y-1"
        >
          <div className="font-extrabold uppercase tracking-wider text-slate-500">
            Simbología Vial
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-slate-700 font-semibold">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D64545] inline-block" />
              Origen
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0B2D4A] inline-block" />
              Programada
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] inline-block" />
              En ruta
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] inline-block" />
              Entregada
            </span>
          </div>
        </div>

        <div className="absolute bottom-1.5 right-2 z-10 px-2 py-0.5 rounded bg-white/80 text-[9.5px] text-slate-500 pointer-events-none">
          Trazado Vial Terrestre © OpenStreetMap / OSRM · Transportes Rojas
        </div>
      </div>

      {/* Detalle de parada seleccionada */}
      {puntoActivo && (
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 text-white shadow-xs ${
                puntoActivo.orden === 0 ? "bg-[#D64545]" : "bg-[#0B2D4A]"
              }`}
            >
              {puntoActivo.orden === 0 ? "S" : `#${puntoActivo.orden}`}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-[#0B2D4A]">
                  {puntoActivo.orden === 0
                    ? `Sucursal de Salida: ${puntoActivo.etiqueta}`
                    : `Parada #${puntoActivo.orden} — ${puntoActivo.etiqueta}`}
                </span>
                {puntoActivo.envio && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      obtenerMetaEstadoEnvio(puntoActivo.envio.estado).badgeClass
                    }`}
                  >
                    {obtenerMetaEstadoEnvio(puntoActivo.envio.estado).etiqueta}
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-[#D64545] shrink-0" />
                  {puntoActivo.subtitulo}
                </span>
                {puntoActivo.envio?.destinoLatitud != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                    Puerta a puerta ({Number(puntoActivo.envio.destinoLatitud).toFixed(4)}, {Number(puntoActivo.envio.destinoLongitud).toFixed(4)})
                  </span>
                )}
                {puntoActivo.envio?.destinatarioTelefono && (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {puntoActivo.envio.destinatarioTelefono}
                  </span>
                )}
                {puntoActivo.envio && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Package className="w-3 h-3 text-slate-400" />
                    {Number(puntoActivo.envio.pesoKg).toFixed(2)} kg ·{" "}
                    {puntoActivo.envio.descripcion}
                  </span>
                )}
              </div>

              {puntoActivo.corredorVial && (
                <div className="text-[11px] text-[#0B2D4A] font-semibold mt-1">
                  Vía terrestre: <span className="font-normal">{puntoActivo.corredorVial}</span>
                  {puntoActivo.distanciaTramoKm
                    ? ` (+${puntoActivo.distanciaTramoKm} km · ~${puntoActivo.tiempoTramoMin} min)`
                    : ""}
                </div>
              )}
            </div>
          </div>

          {puntoActivo.envio && (
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {onVerDetalleEnvio && (
                <button
                  type="button"
                  onClick={() => onVerDetalleEnvio(puntoActivo.envio!)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-[#0B2D4A] cursor-pointer transition-colors"
                >
                  Ver Guía
                </button>
              )}

              {mostrarControlesOperativosChofer &&
                onIniciarRecorrido &&
                (puntoActivo.envio.estado === "asignado_flotilla" ||
                  puntoActivo.envio.estado === "reprogramado") && (
                  <button
                    type="button"
                    onClick={() => onIniciarRecorrido(puntoActivo.envio!)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Iniciar Recorrido</span>
                  </button>
                )}

              {mostrarControlesOperativosChofer &&
                onValidarEntregaPin &&
                puntoActivo.envio.estado === "en_ruta" && (
                  <button
                    type="button"
                    onClick={() => onValidarEntregaPin(puntoActivo.envio!)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Validar Entrega (PIN)</span>
                  </button>
                )}

              {puntoActivo.envio.estado === "entregado" && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Parada Entregada</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
