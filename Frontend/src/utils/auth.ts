export interface UsuarioSesion {
  id: number;
  email: string;
  tipoUsuario: "Empleado" | "Cliente" | string;
  nombreCompleto?: string;
  nombre?: string;
  roles: string[];
  permisos: string[];
  puestoActual?: string;
  sucursal?: string;
  sucursalId?: number;
  requiereCambioPassword?: boolean;
  empleadoOClienteId?: number;
}

export interface SessionInfo {
  token: string | null;
  user: UsuarioSesion | null;
  isAuthenticated: boolean;
  tipoUsuario: "Empleado" | "Cliente" | string | null;
  roles: string[];
}

// Lectura y expiración de JWT

export function parseJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload || typeof payload.exp !== "number") {
    return false;
  }
  const bufferMs = 5000;
  return Date.now() >= payload.exp * 1000 - bufferMs;
}

// Gestión de sesión local

export function getToken(): string | null {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

export function getStoredUser(): UsuarioSesion | null {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    return JSON.parse(userStr) as UsuarioSesion;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("tr_sidebar_open");
  } catch (error) {
    console.error("Error al limpiar la sesión:", error);
  }
}

export async function logoutUsuario(): Promise<void> {
  try {
    const token = getToken();
    if (token) {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5121/api";
      await fetch(`${apiUrl}/Autenticacion/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => { });
    }
  } catch (error) {
    console.error("Error al revocar token en servidor:", error);
  } finally {
    clearSession();
  }
}

export function getSession(): SessionInfo {
  const token = getToken();
  const user = getStoredUser();

  if (!token || !user) {
    return {
      token: null,
      user: null,
      isAuthenticated: false,
      tipoUsuario: null,
      roles: [],
    };
  }

  if (isTokenExpired(token)) {
    clearSession();
    return {
      token: null,
      user: null,
      isAuthenticated: false,
      tipoUsuario: null,
      roles: [],
    };
  }

  const jwt = parseJwt(token);
  if (jwt && user) {
    if (user.sucursalId === undefined && jwt.sucursal_id) {
      user.sucursalId = Number(jwt.sucursal_id);
    }
    if (!user.sucursal && jwt.sucursal_nombre) {
      user.sucursal = String(jwt.sucursal_nombre);
    }
    if (user.empleadoOClienteId === undefined && jwt.empleado_id) {
      user.empleadoOClienteId = Number(jwt.empleado_id);
    }
  }

  const rolesArray = Array.isArray(user.roles) ? user.roles : [];

  return {
    token,
    user,
    isAuthenticated: true,
    tipoUsuario: user.tipoUsuario || null,
    roles: rolesArray,
  };
}

// Verificación de roles y permisos

export function hasRequiredRole(userRoles: string[], allowedRoles?: string[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (!userRoles || userRoles.length === 0) return false;

  const normalizedUserRoles = userRoles.map((r) => r.trim().toLowerCase());
  return allowedRoles.some((allowed) =>
    normalizedUserRoles.includes(allowed.trim().toLowerCase())
  );
}

export function hasPermissionOrRole(
  codigoPermiso?: string,
  rolesRespaldo: string[] = []
): boolean {
  const session = getSession();
  if (!session.isAuthenticated || !session.user) return false;

  const rolesNorm = (session.roles || []).map((r) => r.trim().toLowerCase());

  if (codigoPermiso) {
    const permisos = (session.user.permisos || []).map((p) => p.trim().toLowerCase());
    if (permisos.includes(codigoPermiso.trim().toLowerCase())) return true;
  }

  if (rolesRespaldo && rolesRespaldo.length > 0) {
    return rolesRespaldo.some((r) => rolesNorm.includes(r.trim().toLowerCase()));
  }

  return false;
}

