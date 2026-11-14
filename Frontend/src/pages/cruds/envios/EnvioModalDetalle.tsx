import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Package,
  Copy,
  Check,
  Clock,
  MapPin,
  Truck,
  ShieldCheck,
  User,
  Phone,
  Mail,
  Calendar,
  Scale,
  Loader2,
  AlertTriangle,
  Store,
} from "lucide-react";
import { envioService, extraerMensajeErrorApi } from "../../../services/envioService";
import { useToast } from "../../../components/Toast";
import {
  type EnvioDetalleResponse,
  type EnvioListadoItem,
  type DireccionSnapshotDto,
  formatearFechaHora,
  obtenerMetaEstadoEnvio,
} from "./types";

interface EnvioModalDetalleProps {
  abierto: boolean;
  envioBase: EnvioListadoItem | null;
  onClose: () => void;
}

function BloqueDireccion({
  titulo,
  subtituloSucursal,
  icono,
  direccion,
}: {
  titulo: string;
  subtituloSucursal?: string | null;
  icono: React.ReactNode;
  direccion?: DireccionSnapshotDto | null;
}) {
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col gap-2.5 shadow-2xs">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#0B2D4A]">
          {icono}
          <span>{titulo}</span>
        </div>
        {subtituloSucursal && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-[#0B2D4A] border border-blue-200 text-[11px] font-bold">
            <Store className="w-3 h-3" />
            <span>{subtituloSucursal}</span>
          </span>
        )}
      </div>

      {direccion ? (
        <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
          <div className="font-bold text-slate-900 text-sm">
            {[
              direccion.calle,
              !direccion.numeroExterior?.trim()
                ? null
                : /^(s\/?n|sin\s*n[uú]mero)$/i.test(direccion.numeroExterior.trim())
                  ? "S/N"
                  : `#${direccion.numeroExterior.trim()}`,
              direccion.numeroInterior ? `Int. ${direccion.numeroInterior}` : null,
            ]
              .filter(Boolean)
              .join(" ") || "Vialidad no especificada"}
          </div>
          <div>
            {direccion.colonia && (
              <span className="font-semibold text-slate-800">Col. {direccion.colonia}</span>
            )}
            {direccion.codigoPostal && (
              <span className="ml-1.5 font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-bold">
                C.P. {direccion.codigoPostal}
              </span>
            )}
          </div>
          <div className="text-slate-600 font-medium">
            {[direccion.localidad, direccion.municipio, direccion.estado, direccion.pais]
              .filter((v, idx, arr) => Boolean(v) && arr.indexOf(v) === idx)
              .join(", ")}
          </div>
          {direccion.entreCalles && (
            <div className="text-[11px] text-slate-500">
              <strong className="text-slate-600">Entre calles:</strong> {direccion.entreCalles}
            </div>
          )}
          {direccion.referencias && (
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
              <strong className="text-slate-700">Referencias:</strong> {direccion.referencias}
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 text-xs text-slate-400 italic">
          Recepción directa en mostrador de sucursal{subtituloSucursal ? ` (${subtituloSucursal})` : ""}.
        </div>
      )}
    </div>
  );
}

export function EnvioModalDetalle({
  abierto,
  envioBase,
  onClose,
}: EnvioModalDetalleProps) {
  const { toast } = useToast();
  const [detalle, setDetalle] = useState<EnvioDetalleResponse | null>(null);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [tabActiva, setTabActiva] = useState<"timeline" | "direcciones" | "operacion">("timeline");

  useEffect(() => {
    if (!abierto || !envioBase) {
      setDetalle(null);
      setCopiado(false);
      setTabActiva("timeline");
      return;
    }

    let activo = true;
    setCargando(true);
    envioService
      .obtenerDetalle(envioBase.id)
      .then((data) => {
        if (activo) setDetalle(data);
      })
      .catch((err) => {
        if (activo) {
          toast.error(extraerMensajeErrorApi(err, "No se pudo cargar el expediente del envío."));
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [abierto, envioBase, toast]);

  useEffect(() => {
    if (!abierto) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [abierto]);

  if (!abierto || !envioBase) return null;

  const estadoActual = detalle?.estado ?? envioBase.estado;
  const metaEstado = obtenerMetaEstadoEnvio(estadoActual);

  const copiarGuia = async () => {
    try {
      await navigator.clipboard.writeText(envioBase.guia);
      setCopiado(true);
      toast.success(`Guía ${envioBase.guia} copiada al portapapeles.`);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.info(`Guía: ${envioBase.guia}`);
    }
  };

  return createPortal(
    <div
      className="cc-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-envio-detalle-titulo"
    >
      <div className="cc-modal !max-w-4xl">
        <div className="cc-modal-header">
          <div className="flex flex-wrap items-center gap-2.5">
            <Package className="w-5 h-5 text-[#0B2D4A]" />
            <h2 id="modal-envio-detalle-titulo" className="cc-modal-title">
              Expediente de Envío:{" "}
              <span className="font-mono text-[#D64545] tracking-wide">{envioBase.guia}</span>
            </h2>
            <button
              type="button"
              onClick={copiarGuia}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer transition-colors"
              title="Copiar número de guía"
            >
              {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiado ? "Copiada" : "Copiar"}</span>
            </button>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${metaEstado.badgeClass}`}
            >
              <span className={`w-2 h-2 rounded-full ${metaEstado.dotClass}`} />
              {metaEstado.etiqueta}
            </span>
          </div>

          <button
            type="button"
            className="cc-btn-close"
            onClick={onClose}
            aria-label="Cerrar expediente"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Remitente</span>
            <span className="font-bold text-slate-900 block truncate">
              {detalle?.remitenteNombre ?? envioBase.remitenteNombre}
            </span>
            {(detalle?.remitenteTelefono || envioBase.remitenteTelefono) && (
              <span className="text-[11px] text-slate-500 font-mono">
                {detalle?.remitenteTelefono ?? envioBase.remitenteTelefono}
              </span>
            )}
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Destinatario</span>
            <span className="font-bold text-slate-900 block truncate">
              {detalle?.destinatarioNombre ?? envioBase.destinatarioNombre}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              {detalle?.destinatarioTelefono ?? envioBase.destinatarioTelefono}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Paquete y Medidas</span>
            <span className="font-bold text-slate-900">
              {Number(detalle?.pesoKg ?? envioBase.pesoKg).toFixed(2)} kg
            </span>
            <span className="text-[11px] text-slate-500 block">
              {detalle?.largoCm ?? envioBase.largoCm}×{detalle?.anchoCm ?? envioBase.anchoCm}×
              {detalle?.altoCm ?? envioBase.altoCm} cm
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Entrega Estimada</span>
            <span className="font-bold text-[#0B2D4A] block">
              {formatearFechaHora(detalle?.fechaEntregaEstimada ?? envioBase.fechaEntregaEstimada)}
            </span>
            <span className="text-[11px] text-slate-500">
              Modalidad:{" "}
              <strong>
                {(detalle?.requiereRecoleccion ?? envioBase.requiereRecoleccion)
                  ? "Recolección"
                  : "Sucursal"}
              </strong>
            </span>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex flex-wrap border-b border-slate-200 mb-4 gap-1.5">
          <button
            type="button"
            onClick={() => setTabActiva("timeline")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${tabActiva === "timeline"
                ? "border-[#0B2D4A] text-[#0B2D4A] bg-slate-50 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <Clock className="w-4 h-4" />
            <span>Línea de Tiempo ({detalle?.eventos?.length ?? 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva("direcciones")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${tabActiva === "direcciones"
                ? "border-[#0B2D4A] text-[#0B2D4A] bg-slate-50 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Ficha y Direcciones</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva("operacion")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${tabActiva === "operacion"
                ? "border-[#0B2D4A] text-[#0B2D4A] bg-slate-50 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            <Truck className="w-4 h-4" />
            <span>Recepción, Ruta y Entregas</span>
          </button>
        </div>

        {cargando ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-[#0B2D4A]" />
            <span className="text-xs font-medium">Cargando trazabilidad e historial del envío...</span>
          </div>
        ) : !detalle ? (
          <div className="py-12 text-center text-slate-400 text-xs italic">
            No se encontró información detallada para esta guía.
          </div>
        ) : tabActiva === "timeline" ? (
          <div className="max-h-96 overflow-y-auto pr-2 py-1">
            {detalle.eventos.length === 0 ? (
              <div className="py-10 text-center text-slate-400 italic text-xs">
                Aún no existen eventos registrados en la bitácora.
              </div>
            ) : (
              <ol className="relative border-l-2 border-slate-200 ml-3 space-y-4">
                {detalle.eventos.map((ev, index) => {
                  const metaEv = obtenerMetaEstadoEnvio(ev.estado);
                  const esUltimo = index === 0;
                  return (
                    <li key={ev.id} className="ml-5 relative">
                      <span
                        className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${esUltimo ? `${metaEv.dotClass} ring-4 ring-blue-500/15` : "bg-slate-300"
                          }`}
                      />
                      <div
                        className={`p-3 rounded-xl border transition-colors ${esUltimo
                            ? "bg-blue-50/40 border-blue-200 shadow-2xs"
                            : "bg-white border-slate-200"
                          }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${metaEv.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${metaEv.dotClass}`} />
                            {metaEv.etiqueta}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatearFechaHora(ev.fechaEvento)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium m-0 leading-relaxed">
                          {ev.descripcion || metaEv.descripcion}
                        </p>
                        {ev.registradoPorNombre && (
                          <div className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>Registrado por: </span>
                            <strong className="text-slate-700">{ev.registradoPorNombre}</strong>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        ) : tabActiva === "direcciones" ? (
          <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Descripción declarada del paquete
                </span>
                <span className="font-semibold text-slate-800">{detalle.descripcion}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Valor declarado
                </span>
                <span className="font-bold text-emerald-700">
                  {detalle.valorDeclarado != null
                    ? `$${Number(detalle.valorDeclarado).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })} MXN`
                    : "No declarado"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <BloqueDireccion
                titulo={detalle.requiereRecoleccion ? "Origen (Recolección a domicilio)" : "Origen"}
                subtituloSucursal={detalle.sucursalRecepcionNombre}
                icono={<MapPin className="w-4 h-4 text-[#0B2D4A]" />}
                direccion={detalle.direccionOrigen}
              />
              <BloqueDireccion
                titulo="Domicilio de Entrega (Destino)"
                subtituloSucursal={detalle.sucursalDestinoNombre}
                icono={<MapPin className="w-4 h-4 text-[#D64545]" />}
                direccion={detalle.direccionDestino}
              />
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-5 text-xs text-slate-700">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#0B2D4A]" />
                <span className="text-slate-500">Recibe:</span>
                <strong className="text-slate-900">{detalle.destinatarioNombre}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-[#0B2D4A]" />
                <span className="text-slate-500">Teléfono:</span>
                <strong className="font-mono text-slate-900">{detalle.destinatarioTelefono}</strong>
              </div>
              {detalle.destinatarioEmail && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#0B2D4A]" />
                  <span className="text-slate-500">Correo:</span>
                  <strong className="text-slate-900">{detalle.destinatarioEmail}</strong>
                </div>
              )}
            </div>

            {detalle.citasRecoleccion.length > 0 && (
              <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2 text-xs">
                <div className="font-extrabold uppercase tracking-wider text-amber-900 text-[11px]">
                  Citas de Recolección Programadas
                </div>
                {detalle.citasRecoleccion.map((cita) => (
                  <div
                    key={cita.id}
                    className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-amber-200/80"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">
                        Solicitada: {formatearFechaHora(cita.fechaHoraSolicitada)}
                      </span>
                      {cita.observaciones && (
                        <span className="block text-[11px] text-slate-500">
                          Nota: {cita.observaciones}
                        </span>
                      )}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-amber-100 text-amber-800">
                      {cita.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-4 pr-1 text-xs">
            {/* Recepción física */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2 font-extrabold uppercase tracking-wider text-[#0B2D4A] text-[11px] mb-2.5">
                <Scale className="w-4 h-4" />
                <span>Verificación Física en Sucursal</span>
              </div>
              {detalle.recepcion ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Fecha recepción
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatearFechaHora(detalle.recepcion.fechaRecepcion)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Recibido por
                    </span>
                    <span className="font-semibold text-slate-900">
                      {detalle.recepcion.recibidoPorNombre}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Peso báscula
                    </span>
                    <span className="font-bold text-emerald-700">
                      {detalle.recepcion.pesoVerificadoKg ?? detalle.pesoKg} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Dimensiones reales
                    </span>
                    <span className="font-semibold text-slate-900">
                      {detalle.recepcion.largoVerificadoCm ?? detalle.largoCm}×
                      {detalle.recepcion.anchoVerificadoCm ?? detalle.anchoCm}×
                      {detalle.recepcion.altoVerificadoCm ?? detalle.altoCm} cm
                    </span>
                  </div>
                  {detalle.recepcion.observaciones && (
                    <div className="col-span-2 sm:col-span-4 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                      <strong>Observaciones en mostrador:</strong> {detalle.recepcion.observaciones}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 italic py-2">
                  El paquete aún no registra recepción física en mostrador de sucursal.
                </div>
              )}
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2 font-extrabold uppercase tracking-wider text-[#0B2D4A] text-[11px] mb-2.5">
                <Truck className="w-4 h-4" />
                <span>Asignación de Flotilla y Hoja de Ruta</span>
              </div>
              {detalle.rutasAsignadas.length === 0 ? (
                <div className="text-slate-400 italic py-2">
                  Sin hoja de ruta vehicular asignada todavía.
                </div>
              ) : (
                <div className="space-y-2">
                  {detalle.rutasAsignadas.map((r) => (
                    <div
                      key={`${r.rutaId}-${r.ordenEntrega}`}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">
                          {r.flotillaNombre || "Flotilla operativa"}{" "}
                          {r.unidadPlacas && (
                            <span className="ml-1.5 font-mono text-[11px] px-2 py-0.5 rounded bg-white border border-slate-300 text-[#0B2D4A]">
                              Placas: {r.unidadPlacas}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Operador: <strong>{r.choferNombre || "Por asignar"}</strong> &bull; Fecha:{" "}
                          <strong>{r.fecha}</strong> &bull; Parada #{r.ordenEntrega}
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-blue-100 text-[#0B2D4A]">
                        Ruta: {r.estadoRuta.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3.5 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2 font-extrabold uppercase tracking-wider text-[#0B2D4A] text-[11px] mb-2.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Intentos de Reparto ({detalle.entregas.length})</span>
              </div>
              {detalle.entregas.length === 0 ? (
                <div className="text-slate-400 italic py-2">
                  No se han registrado intentos de entrega en domicilio aún.
                </div>
              ) : (
                <div className="space-y-2">
                  {detalle.entregas.map((ent) => {
                    const exito = ent.estado === "exitosa";
                    return (
                      <div
                        key={ent.id}
                        className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 ${exito
                            ? "bg-emerald-50/50 border-emerald-200"
                            : "bg-orange-50/50 border-orange-200"
                          }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {exito ? (
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                            )}
                            <span>Intento #{ent.intentoReparto}</span>
                            <span className="text-slate-400">&bull;</span>
                            <span>{formatearFechaHora(ent.fechaHora)}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            Chofer: <strong>{ent.choferNombre}</strong>
                            {ent.observaciones && ` — "${ent.observaciones}"`}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${exito
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-orange-100 text-orange-800"
                            }`}
                        >
                          {exito && ent.validado ? "PIN Verificado · Exitosa" : "Intento Fallido"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="cc-modal-actions mt-4">
          <button type="button" className="cc-btn-cancel" onClick={onClose}>
            Cerrar expediente
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

