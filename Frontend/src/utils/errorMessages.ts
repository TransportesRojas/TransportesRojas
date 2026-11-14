export class ApiError extends Error {
  readonly status: number;
  readonly data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const MENSAJE_CONEXION =
  "No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.";

const MENSAJE_SERVIDOR_TEMPORAL =
  "Ocurrió un problema temporal al procesar tu solicitud. Por favor, intenta nuevamente en unos momentos.";

const PATRONES_TECNICOS = [
  "postgres",
  "npgsql",
  "sqlstate",
  "dbupdate",
  "entityframework",
  "dbcontext",
  "microsoft.",
  "system.",
  "at backend.",
  "at system.",
  "at microsoft.",
  "--- end of stack trace",
  "stacktrace",
  "stack trace",
  "innerexception",
  "inner exception",
  "violates foreign key",
  "violates unique constraint",
  "duplicate key",
  "null value in column",
  'relation "',
  'column "',
  'constraint "',
  "syntax error at",
  "value too long for type",
  'select "',
  "insert into",
  'update "',
  "delete from",
  "<!doctype",
  "<html",
  "<title>",
  "one or more validation errors occurred",
  "the json value could not be converted",
  "an exception has been raised",
  "an error occurred while saving the entity changes",
  "transient failure",
  "syntaxerror:",
];

const LONGITUD_MAXIMA_MENSAJE = 240;

export function esMensajeTecnico(texto: string): boolean {
  if (!texto) return false;
  const lower = texto.toLowerCase();
  if (PATRONES_TECNICOS.some((patron) => lower.includes(patron))) {
    return true;
  }
  return texto.includes("\n") && texto.length > 180;
}

// Sanitización y formateo de mensajes

export function sanitizarMensajeUsuario(texto: string | null | undefined, respaldo: string): string {
  if (!texto || !texto.trim()) {
    return respaldo;
  }

  let limpio = texto
    .replace(/^API Error:\s*\d+\s*-\s*/i, "")
    .replace(/\r\n/g, "\n")
    .trim();

  if (!limpio || esMensajeTecnico(limpio)) {
    return respaldo;
  }

  limpio = limpio.replace(/\s+/g, " ").trim();

  if (limpio.length > LONGITUD_MAXIMA_MENSAJE) {
    return respaldo;
  }

  return limpio;
}

// Respaldo por código HTTP

export function respaldoPorStatusHttp(status: number, respaldo?: string): string {
  if (respaldo && status >= 500) {
    return respaldo;
  }
  switch (status) {
    case 0:
      return MENSAJE_CONEXION;
    case 400:
      return respaldo || "Verifica los datos ingresados; hay campos incorrectos o incompletos.";
    case 401:
      return respaldo || "Tu sesión expiró o las credenciales son incorrectas.";
    case 403:
      return "No cuentas con permisos suficientes para realizar esta acción.";
    case 404:
      return respaldo || "No se encontró el recurso solicitado.";
    case 408:
      return "La solicitud tardó demasiado en responder. Por favor, intenta nuevamente.";
    case 409:
      return respaldo || "No se pudo completar la operación por un conflicto con los datos actuales.";
    default:
      return status >= 500 ? MENSAJE_SERVIDOR_TEMPORAL : respaldo || "No se pudo completar la operación.";
  }
}

function extraerDesdeObjetoJson(parsed: any): string | null {
  if (!parsed || typeof parsed !== "object") return null;

  if (Array.isArray(parsed.errores) && parsed.errores.length > 0) {
    const primero = parsed.errores.find((item: unknown) => typeof item === "string" && item.trim());
    if (typeof primero === "string") return primero;
  }

  if (typeof parsed.mensaje === "string" && parsed.mensaje.trim()) {
    return parsed.mensaje;
  }

  if (parsed.errors && typeof parsed.errors === "object") {
    for (const val of Object.values(parsed.errors)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string" && val[0].trim()) {
        return val[0];
      }
    }
  }

  if (typeof parsed.title === "string" && parsed.title.trim()) {
    return parsed.title;
  }

  return null;
}

// Extracción de respuesta HTTP

export function obtenerMensajeAmigableHttp(
  status: number,
  cuerpoCrudo: string,
  respaldoPersonalizado?: string
): { mensaje: string; data?: unknown } {
  const respaldo = respaldoPorStatusHttp(status, respaldoPersonalizado);
  const texto = (cuerpoCrudo || "").trim();

  if (texto) {
    const indiceJson = texto.indexOf("{");
    if (indiceJson >= 0) {
      try {
        const parsed = JSON.parse(texto.slice(indiceJson));
        const candidato = extraerDesdeObjetoJson(parsed);
        if (candidato) {
          return {
            mensaje: sanitizarMensajeUsuario(candidato, respaldo),
            data: parsed,
          };
        }
        return { mensaje: respaldo, data: parsed };
      } catch {
      }
    }
  }

  if (status >= 500) {
    return { mensaje: respaldo };
  }

  return {
    mensaje: sanitizarMensajeUsuario(texto, respaldo),
  };
}

function esErrorDeRed(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true;
  }
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("network request failed") ||
      msg.includes("load failed") ||
      msg.includes("err_connection")
    );
  }
  return false;
}

export function extraerMensajeErrorApi(
  error: unknown,
  respaldo = "No se pudo completar la operación."
): string {
  if (error instanceof ApiError) {
    if (error.status === 0 || esErrorDeRed(error)) {
      return MENSAJE_CONEXION;
    }
    const baseRespaldo = error.status === 403 ? respaldoPorStatusHttp(403) : respaldo;
    return sanitizarMensajeUsuario(error.message, baseRespaldo);
  }

  if (esErrorDeRed(error)) {
    return MENSAJE_CONEXION;
  }

  if (error instanceof Error && error.message) {
    const matchApiError = error.message.match(/^API Error:\s*(\d+)\s*-\s*([\s\S]*)$/i);
    if (matchApiError) {
      const status = Number(matchApiError[1]);
      const body = matchApiError[2] ?? "";
      return obtenerMensajeAmigableHttp(status, body, respaldo).mensaje;
    }

    const indiceJson = error.message.indexOf("{");
    if (indiceJson >= 0) {
      try {
        const parsed = JSON.parse(error.message.slice(indiceJson));
        const candidato = extraerDesdeObjetoJson(parsed);
        if (candidato) {
          return sanitizarMensajeUsuario(candidato, respaldo);
        }
      } catch {
      }
    }

    return sanitizarMensajeUsuario(error.message, respaldo);
  }

  if (typeof error === "string") {
    return sanitizarMensajeUsuario(error, respaldo);
  }

  return respaldo;
}

