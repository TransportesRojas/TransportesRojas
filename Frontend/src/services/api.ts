import { clearSession } from "../utils/auth";
import { ApiError, obtenerMensajeAmigableHttp } from "../utils/errorMessages";

export { ApiError };

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5121/api";

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_URL}${endpoint}`;
  const token = localStorage.getItem("token");

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (err: any) {
    if (
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      err?.message?.includes("Failed to fetch") ||
      err?.name === "TypeError"
    ) {
      window.dispatchEvent(new Event("offline"));
    }
    throw new ApiError(
      "No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.",
      0
    );
  }

  if (response.status === 401 && !endpoint.toLowerCase().includes("login")) {
    clearSession();
    const isClient = window.location.pathname.startsWith("/cliente");
    window.location.href = isClient ? "/login-clientes" : "/login-empleados";
  }

  if (!response.ok) {
    const errorBody = await response.text();
    const { mensaje, data } = obtenerMensajeAmigableHttp(response.status, errorBody);
    throw new ApiError(mensaje, response.status, data);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};
