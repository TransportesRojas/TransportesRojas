export interface GeocodingQuery {
  calle: string;
  numeroExterior?: string | null;
  colonia?: string | null;
  municipio?: string | null;
  estado?: string | null;
  codigoPostal?: string | null;
  coordenadasRespaldo?: {
    lat: number;
    lon: number;
  } | null;
}

export type NivelPrecisionGeocodificacion = "exacto" | "calle" | "colonia";

export interface ResultadoGeocodificacion {
  latitud: number;
  longitud: number;
  nivelPrecision: NivelPrecisionGeocodificacion;
  direccionFormateada: string;
  fuente: "nominatim" | "cache" | "fallback_local";
}

interface NominatimResponseItem {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  class?: string;
  type?: string;
  addresstype?: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
}

// Caché y límite de peticiones

const CACHE_GEOCODING = new Map<string, ResultadoGeocodificacion>();
const MAX_CACHE_ENTRIES = 250;

let ultimaLlamadaTimestamp = 0;
const INTERVALO_MINIMO_MS = 600;

function sanitizarTexto(t?: string | null): string {
  if (!t) return "";
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function generarClaveCache(query: GeocodingQuery): string {
  const c = sanitizarTexto(query.calle);
  const num = sanitizarTexto(query.numeroExterior);
  const col = sanitizarTexto(query.colonia);
  const cp = (query.codigoPostal || "").replace(/\D/g, "");
  const mun = sanitizarTexto(query.municipio);
  return `${c}|${num}|${col}|${cp}|${mun}`;
}

async function esperarPaseDeTasa(): Promise<void> {
  const ahora = Date.now();
  const transcurrido = ahora - ultimaLlamadaTimestamp;
  if (transcurrido < INTERVALO_MINIMO_MS) {
    await new Promise((r) => setTimeout(r, INTERVALO_MINIMO_MS - transcurrido));
  }
  ultimaLlamadaTimestamp = Date.now();
}

async function ejecutarConsultaNominatim(
  terminoBusqueda: string,
  signal?: AbortSignal
): Promise<NominatimResponseItem[]> {
  await esperarPaseDeTasa();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", terminoBusqueda);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "mx");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const respuesta = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": "es-MX,es;q=0.9",
      },
      signal: controller.signal,
    });

    if (!respuesta.ok) {
      return [];
    }

    const data = (await respuesta.json()) as NominatimResponseItem[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

// Servicio de geocodificación

export const geocodingService = {
  async geocodificarDireccion(
    query: GeocodingQuery,
    signal?: AbortSignal
  ): Promise<ResultadoGeocodificacion | null> {
    const calleLimpia = (query.calle || "").trim();
    if (!calleLimpia) {
      if (query.coordenadasRespaldo) {
        return {
          latitud: query.coordenadasRespaldo.lat,
          longitud: query.coordenadasRespaldo.lon,
          nivelPrecision: "colonia",
          direccionFormateada: query.colonia || query.municipio || "Ubicación referencial",
          fuente: "fallback_local",
        };
      }
      return null;
    }

    const claveCache = generarClaveCache(query);
    if (CACHE_GEOCODING.has(claveCache)) {
      const res = CACHE_GEOCODING.get(claveCache)!;
      return { ...res, fuente: "cache" };
    }

    const numLimpio = (query.numeroExterior || "").trim();
    const esNumeroValido =
      numLimpio.length > 0 &&
      !/^s[\/\.]?n$/i.test(numLimpio) &&
      !/^sin\s+num/i.test(numLimpio);

    const municipio = (query.municipio || "Culiacán").trim();
    const estado = (query.estado || "Sinaloa").trim();
    const colonia = (query.colonia || "").trim();

    // Nivel 1: calle y número
    if (esNumeroValido) {
      const busquedaNivel1 = [
        `${calleLimpia} ${numLimpio}`,
        colonia ? colonia : null,
        municipio,
        estado,
        "México",
      ]
        .filter(Boolean)
        .join(", ");

      const itemsNivel1 = await ejecutarConsultaNominatim(busquedaNivel1, signal);
      if (itemsNivel1.length > 0) {
        const item = itemsNivel1[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        if (!isNaN(lat) && !isNaN(lon)) {
          const resultado: ResultadoGeocodificacion = {
            latitud: Number(lat.toFixed(6)),
            longitud: Number(lon.toFixed(6)),
            nivelPrecision: "exacto",
            direccionFormateada: item.display_name,
            fuente: "nominatim",
          };

          guardarEnCache(claveCache, resultado);
          return resultado;
        }
      }
    }

    // Nivel 2: calle general
    const busquedaNivel2 = [
      calleLimpia,
      colonia ? colonia : null,
      municipio,
      estado,
      "México",
    ]
      .filter(Boolean)
      .join(", ");

    const itemsNivel2 = await ejecutarConsultaNominatim(busquedaNivel2, signal);
    if (itemsNivel2.length > 0) {
      const item = itemsNivel2[0];
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      if (!isNaN(lat) && !isNaN(lon)) {
        const resultado: ResultadoGeocodificacion = {
          latitud: Number(lat.toFixed(6)),
          longitud: Number(lon.toFixed(6)),
          nivelPrecision: "calle",
          direccionFormateada: item.display_name,
          fuente: "nominatim",
        };

        guardarEnCache(claveCache, resultado);
        return resultado;
      }
    }

    // Nivel 3: respaldo local
    if (query.coordenadasRespaldo) {
      const resultado: ResultadoGeocodificacion = {
        latitud: Number(query.coordenadasRespaldo.lat.toFixed(6)),
        longitud: Number(query.coordenadasRespaldo.lon.toFixed(6)),
        nivelPrecision: "colonia",
        direccionFormateada: `${colonia ? `${colonia}, ` : ""}${municipio}, ${estado}`,
        fuente: "fallback_local",
      };

      guardarEnCache(claveCache, resultado);
      return resultado;
    }

    return null;
  },

  limpiarCache(): void {
    CACHE_GEOCODING.clear();
  },
};

function guardarEnCache(clave: string, res: ResultadoGeocodificacion) {
  if (CACHE_GEOCODING.size >= MAX_CACHE_ENTRIES) {
    const primeraClave = CACHE_GEOCODING.keys().next().value;
    if (primeraClave) CACHE_GEOCODING.delete(primeraClave);
  }
  CACHE_GEOCODING.set(clave, res);
}
