import { ApiError, fetchApi } from "./api";
import { extraerMensajeErrorApi } from "../utils/errorMessages";
import type {
  CambioRutaItemResponse,
  ClienteCatalogoItem,
  ConsultaCodigoPostalResponse,
  CrearEnvioPayload,
  CrearEnvioResponse,
  EnvioDetalleResponse,
  EnvioListadoItem,
  NotificarCambioRutaPayload,
  PlanificarRutaConsolidadaPayload,
  RastreoPublicoResponse,
  RecursosAsignacionEnvioResponse,
  RutaPlanificadaResultadoResponse,
  SucursalOperativaItem,
} from "../pages/cruds/envios/types";

export { extraerMensajeErrorApi };

export const envioService = {
  listar(params?: {
    skip?: number;
    take?: number;
    estado?: string;
    sucursalId?: number;
    requiereRecoleccion?: boolean;
    busqueda?: string;
  }): Promise<EnvioListadoItem[]> {
    const qs = new URLSearchParams();
    if (params?.skip !== undefined) qs.set("skip", String(params.skip));
    if (params?.take !== undefined) qs.set("take", String(params.take));
    if (params?.estado) qs.set("estado", params.estado);
    if (params?.sucursalId) qs.set("sucursalId", String(params.sucursalId));
    if (params?.requiereRecoleccion !== undefined) {
      qs.set("requiereRecoleccion", String(params.requiereRecoleccion));
    }
    if (params?.busqueda) qs.set("busqueda", params.busqueda);

    const queryString = qs.toString();
    return fetchApi(`/Envio${queryString ? `?${queryString}` : ""}`);
  },

  obtenerDetalle(id: number): Promise<EnvioDetalleResponse> {
    return fetchApi(`/Envio/${id}`);
  },

  rastrearPorGuia(guia: string): Promise<RastreoPublicoResponse> {
    return fetchApi(`/Envio/rastreo/${encodeURIComponent(guia.trim())}`);
  },

  crear(payload: CrearEnvioPayload): Promise<CrearEnvioResponse> {
    return fetchApi("/Envio", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  consultarCodigoPostal(cp: string): Promise<ConsultaCodigoPostalResponse> {
    return fetchApi(`/CatalogoGeografico/cp/${encodeURIComponent(cp.trim())}`);
  },

  obtenerSucursalesOperativas(): Promise<SucursalOperativaItem[]> {
    return fetchApi("/CatalogoGeografico/sucursales-operativas");
  },

  async obtenerClientesActivos(): Promise<ClienteCatalogoItem[]> {
    const lista: ClienteCatalogoItem[] = await fetchApi("/Cliente?skip=0&take=500");
    return (lista || []).filter((c) => c.activo);
  },

  obtenerRecursosAsignacion(): Promise<RecursosAsignacionEnvioResponse> {
    return fetchApi("/Envio/recursos-asignacion");
  },

  confirmarRecoleccion(
    id: number,
    payload: { observaciones?: string | null } = {}
  ): Promise<EnvioDetalleResponse> {
    return fetchApi(`/Envio/${id}/confirmar-recoleccion`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  registrarRecepcion(
    id: number,
    payload: {
      pesoVerificadoKg: number;
      largoVerificadoCm: number;
      anchoVerificadoCm: number;
      altoVerificadoCm: number;
      sucursalId?: number | null;
      evidenciaFotoUrl?: string | null;
      observaciones?: string | null;
    }
  ): Promise<EnvioDetalleResponse> {
    return fetchApi(`/Envio/${id}/recepcion`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  asignarFlotilla(
    id: number,
    payload: {
      flotillaId: number;
      unidadId?: number | null;
      choferId?: number | null;
      fechaRuta?: string | null;
      distanciaEstimadaKm?: number | null;
      tiempoEstimadoMin?: number | null;
      observaciones?: string | null;
      ordenEntrega?: number | null;
    }
  ): Promise<EnvioDetalleResponse> {
    return fetchApi(`/Envio/${id}/asignar-flotilla`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async planificarRutaConsolidada(
    payload: PlanificarRutaConsolidadaPayload
  ): Promise<RutaPlanificadaResultadoResponse> {
    try {
      return await fetchApi("/Envio/planificar-ruta", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const esNoEncontrado =
        (err instanceof ApiError && (err.status === 404 || err.status === 405)) ||
        msg.includes("404") ||
        msg.includes("405");
      if (esNoEncontrado) {
        const guiasAsignadas: string[] = [];
        let ultimoDetalle: EnvioDetalleResponse | null = null;

        for (let idx = 0; idx < payload.enviosIdsOrdenados.length; idx++) {
          const envioId = payload.enviosIdsOrdenados[idx];
          const ordenParada = idx + 1;
          const partesNota: string[] = [`Parada #${ordenParada}/${payload.enviosIdsOrdenados.length}`];
          if (payload.nombreRutaRecomendada) {
            partesNota.push(`Vía óptima: ${payload.nombreRutaRecomendada}`);
          }
          if (payload.consumoCombustibleEstimadoLitros) {
            partesNota.push(`Combustible est. ruta: ${payload.consumoCombustibleEstimadoLitros.toFixed(2)} L`);
          }
          if (payload.observaciones?.trim()) {
            partesNota.push(payload.observaciones.trim());
          }

          const res = await this.asignarFlotilla(envioId, {
            flotillaId: payload.flotillaId,
            unidadId: payload.unidadId,
            choferId: payload.choferId,
            fechaRuta: payload.fechaRuta ?? null,
            distanciaEstimadaKm: payload.distanciaEstimadaKm ?? null,
            tiempoEstimadoMin: payload.tiempoEstimadoMin ?? null,
            ordenEntrega: ordenParada,
            observaciones: partesNota.join(" · "),
          });
          guiasAsignadas.push(res.guia);
          ultimoDetalle = res;
        }

        return {
          rutaId: ultimoDetalle?.rutasAsignadas?.[0]?.rutaId,
          flotillaId: payload.flotillaId,
          flotillaNombre: ultimoDetalle?.flotillaAsignadaNombre ?? undefined,
          choferId: payload.choferId,
          choferNombre: ultimoDetalle?.choferAsignadoNombre ?? undefined,
          unidadId: payload.unidadId,
          unidadPlacas: ultimoDetalle?.unidadAsignadaPlacas ?? undefined,
          fecha: payload.fechaRuta ?? undefined,
          distanciaEstimadaKm: payload.distanciaEstimadaKm,
          tiempoEstimadoMin: payload.tiempoEstimadoMin,
          consumoCombustibleEstimadoLitros: payload.consumoCombustibleEstimadoLitros,
          totalParadas: guiasAsignadas.length,
          guiasAsignadas,
        };
      }
      throw err;
    }
  },

  iniciarRuta(
    id: number,
    payload: { kmInicialOdometro?: number | null; observaciones?: string | null } = {}
  ): Promise<EnvioDetalleResponse> {
    return fetchApi(`/Envio/${id}/iniciar-ruta`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  validarEntrega(
    id: number,
    payload: {
      entregaExitosa: boolean;
      codigoSeguridad?: string | null;
      observaciones?: string | null;
      evidenciaFotoUrl?: string | null;
      firmaUrl?: string | null;
      kmFinalOdometro?: number | null;
    }
  ): Promise<EnvioDetalleResponse> {
    return fetchApi(`/Envio/${id}/validar-entrega`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  reprogramar(
    id: number,
    payload: {
      nuevaFechaHora: string;
      tipoIncidencia: string;
      motivo: string;
      evidenciaUrl?: string | null;
    }
  ): Promise<EnvioDetalleResponse> {
    return fetchApi(`/Envio/${id}/reprogramar`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  cancelar(id: number, payload: { motivo: string }): Promise<EnvioDetalleResponse> {
    return fetchApi(`/Envio/${id}/cancelar`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  registrarDevolucion(
    id: number,
    payload: {
      motivo: string;
      origenSolicitud: string;
      sucursalDestinoId?: number | null;
      observaciones?: string | null;
    }
  ): Promise<EnvioDetalleResponse> {
    return fetchApi(`/Envio/${id}/devolucion`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  confirmarDevolucion(
    id: number,
    payload: {
      entregadoAlRemitente: boolean;
      aceptadaPorRemitente: boolean;
      observaciones?: string | null;
    }
  ): Promise<EnvioDetalleResponse> {
    return fetchApi(`/Envio/${id}/devolucion/confirmar`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  notificarCambioRuta(
    rutaId: number,
    payload: NotificarCambioRutaPayload
  ): Promise<CambioRutaItemResponse> {
    return fetchApi(`/Ruta/${rutaId}/notificar-cambio`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  obtenerHistorialCambiosRuta(params?: {
    rutaId?: number;
    choferId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<CambioRutaItemResponse[]> {
    const qs = new URLSearchParams();
    if (params?.rutaId) qs.set("rutaId", String(params.rutaId));
    if (params?.choferId) qs.set("choferId", String(params.choferId));
    if (params?.fechaDesde) qs.set("fechaDesde", params.fechaDesde);
    if (params?.fechaHasta) qs.set("fechaHasta", params.fechaHasta);

    const queryString = qs.toString();
    return fetchApi(`/Ruta/cambios-trayecto${queryString ? `?${queryString}` : ""}`);
  },

  // Operaciones de ruta

  asignarEnviosAFlotillaLote(payload: {
    flotillaId: number;
    enviosIds: number[];
  }): Promise<{ mensaje: string; enviosActualizados: number }> {
    return fetchApi(`/Envio/asignar-envios-flotilla`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  asignarRecursosRuta(
    rutaId: number,
    payload: {
      choferId: number;
      unidadId: number;
      fechaProgramada?: string;
    }
  ): Promise<{ mensaje: string; rutaId: number }> {
    return fetchApi(`/Ruta/${rutaId}/asignar-recursos`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  obtenerRutaChoferActiva(): Promise<RutaChoferActivaResponse | null> {
    return fetchApi(`/Ruta/chofer-activa`, {
      method: "GET",
    });
  },

  iniciarRecorridoRuta(
    rutaId: number,
    payload?: { kmInicialOdometro?: number }
  ): Promise<{ mensaje: string; estadoRuta: string; totalEnviosEnRuta: number }> {
    return fetchApi(`/Ruta/${rutaId}/iniciar-recorrido`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },
};

export interface ParadaChoferItem {
  envioId: number;
  guia: string;
  estado: string;
  orden: number;
  destinatarioNombre: string;
  destinatarioTelefono: string;
  destinoDireccion: string;
  destinoCiudad: string;
  tipoPaquete?: string | null;
  pesoKg?: number | null;
  volumenM3?: number | null;
  observaciones?: string | null;
}

export interface RutaChoferActivaResponse {
  rutaId: number;
  nombreRuta: string;
  estadoRuta: string;
  unidadId?: number | null;
  unidadNumeroEconomico?: string | null;
  unidadPlacas?: string | null;
  fechaProgramada?: string | null;
  totalEnvios: number;
  enviosEntregados: number;
  paradas: ParadaChoferItem[];
}

