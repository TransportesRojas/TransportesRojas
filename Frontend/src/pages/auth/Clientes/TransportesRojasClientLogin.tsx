import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Package, Search, X } from "lucide-react";
import logoTransportesRojas from "../../../assets/LogoCompleto.webp";
import { fetchApi } from "../../../services/api";
import { envioService, extraerMensajeErrorApi } from "../../../services/envioService";
import {
  type RastreoPublicoResponse,
  formatearFechaCorta,
  formatearFechaHora,
  obtenerMetaEstadoEnvio,
} from "../../cruds/envios/types";

const COLOR_ROJO = "#D64545";
const COLOR_VERDE = "#16A34A";

export default function LoginClientes() {
  const navigate = useNavigate();
  const [identificador, setIdentificador] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [modalRastreoAbierto, setModalRastreoAbierto] = useState(
    () => typeof window !== "undefined" && window.location.hash === "#rastreo"
  );

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (cargando) return;
    setMensajeError("");
    if (!identificador.trim() || !contrasena.trim()) {
      setMensajeError("Ingresa tu correo o teléfono y tu contraseña.");
      return;
    }
    setCargando(true);
    try {
      const resp = await fetchApi("/Autenticacion/login-cliente", {
        method: "POST",
        body: JSON.stringify({
          email: identificador,
          password: contrasena,
        }),
      });
      if (resp && resp.token) {
        localStorage.setItem("token", resp.token);
        localStorage.setItem("user", JSON.stringify(resp));
        navigate("/cliente/bienvenida");
      } else {
        setMensajeError("No encontramos una cuenta con esos datos.");
      }
    } catch (err: any) {
      setMensajeError(
        extraerMensajeErrorApi(
          err,
          "Error al iniciar sesión. Verifica tus datos o intenta más tarde."
        )
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-x-hidden font-[Poppins,system-ui,sans-serif] text-[#1F2937]"
      style={{
        background:
          "radial-gradient(circle at 15% 10%, rgba(214,69,69,0.16), transparent 45%), radial-gradient(circle at 90% 95%, rgba(37,99,235,0.08), transparent 55%), #0B2D4A",
      }}
    >
      <FondoDecorativo />
      <div className="relative z-10 border-b border-white/[0.08] bg-[#071E33] py-3 text-center font-[Poppins,sans-serif] text-[11.5px] font-semibold tracking-[3.2px] text-white/70">
        <span className="strip-span relative inline-block px-4">
          TUS ENVÍOS, EN BUENAS MANOS
        </span>
      </div>
      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div
          className="card-pop relative w-full max-w-[540px] rounded-3xl bg-white px-12 py-9 text-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
                     max-sm:rounded-2xl max-sm:px-6 max-sm:py-8"
        >
          <div
            className="absolute left-1/2 top-0 h-1 w-24 -translate-x-1/2 rounded-b"
            style={{ background: "linear-gradient(90deg,#0B2D4A,#D64545)" }}
          />
          <div className="mb-5 inline-flex items-center rounded-full border border-[#E4E8EE] bg-[#F7F9FB] px-[14px] py-[7px] text-[11px] font-bold uppercase tracking-[2.4px] text-[#0B2D4A]">
            Portal Clientes
          </div>
          <img
            src={logoTransportesRojas}
            alt="Transportes Rojas"
            className="mx-auto mb-6 block w-[220px] select-none max-sm:w-[160px]"
            draggable={false}
          />
          {mensajeError && (
            <div className="lrc-shake mb-5 rounded-[10px] border border-[rgba(214,69,69,0.22)] bg-[rgba(214,69,69,0.08)] px-[14px] py-3 text-left text-[13px] leading-[1.5] text-[#B13333]">
              {mensajeError}
            </div>
          )}
          <form onSubmit={manejarEnvio} noValidate>
            <div className="mb-[18px] flex flex-col gap-[7px] text-left">
              <label
                htmlFor="identifier"
                className="text-[12.5px] font-bold uppercase tracking-[0.6px] text-[#0B2D4A]"
              >
                Correo o teléfono
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                placeholder="tu@correo.com"
                value={identificador}
                onChange={(evento) => setIdentificador(evento.target.value)}
                className="w-full rounded-xl border-[1.5px] border-[#E4E8EE] bg-[#F7F9FB] px-4 py-[15px] font-[Poppins,sans-serif] text-base text-[#1F2937] outline-none transition-[border-color,box-shadow,background] duration-150 placeholder:text-[#A9B3C0] focus:border-[#D64545] focus:bg-white focus:shadow-[0_0_0_4px_rgba(214,69,69,0.24)]"
              />
            </div>
            <div className="mb-[18px] flex flex-col gap-[7px] text-left">
              <label
                htmlFor="pwd"
                className="text-[12.5px] font-bold uppercase tracking-[0.6px] text-[#0B2D4A]"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="pwd"
                  type={mostrarContrasena ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={contrasena}
                  onChange={(evento) => setContrasena(evento.target.value)}
                  className="w-full rounded-xl border-[1.5px] border-[#E4E8EE] bg-[#F7F9FB] py-[15px] pl-4 pr-[100px] font-[Poppins,sans-serif] text-base text-[#1F2937] outline-none transition-[border-color,box-shadow,background] duration-150 placeholder:text-[#A9B3C0] focus:border-[#D64545] focus:bg-white focus:shadow-[0_0_0_4px_rgba(214,69,69,0.24)]"
                />
                <button
                  type="button"
                  onClick={() => setMostrarContrasena((v) => !v)}
                  aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-[10px] top-1/2 -translate-y-1/2 cursor-pointer rounded-md border-none bg-transparent px-[10px] py-[6px] text-[11.5px] font-bold uppercase tracking-[0.8px] text-[#64748B] transition-[color,background] duration-150 hover:bg-[rgba(214,69,69,0.07)] hover:text-[#B13333]"
                >
                  {mostrarContrasena ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>
            <button
              className="submit-btn relative mt-1.5 inline-flex w-full cursor-pointer items-center justify-center gap-[10px] overflow-hidden rounded-xl border-none px-6 py-[17px] text-[15.5px] font-bold tracking-[0.4px] text-white shadow-[0_14px_28px_-14px_rgba(11,45,74,0.65)] transition-[transform,box-shadow,filter] duration-200 disabled:cursor-not-allowed disabled:opacity-75"
              style={{ background: "linear-gradient(135deg,#0B2D4A 0%,#143F66 100%)" }}
              type="submit"
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <span
                    className="inline-block h-[15px] w-[15px] animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden="true"
                  />
                  Verificando…
                </>
              ) : (
                <>
                  Entrar a mi cuenta
                  <FlechaAvance />
                </>
              )}
            </button>
          </form>
          <a
            id="btn-abrir-rastreo-publico"
            className="mt-5 flex items-center gap-[14px] rounded-[14px] border border-[#E4E8EE] bg-[#F7F9FB] px-[18px] py-4 text-left text-[#0B2D4A] no-underline transition-[border-color,transform,box-shadow,background] duration-200 hover:-translate-y-0.5 hover:border-[rgba(214,69,69,0.4)] hover:bg-white hover:shadow-[0_12px_24px_-16px_rgba(11,45,74,0.35)]"
            href="#rastreo"
            onClick={(e) => {
              e.preventDefault();
              setModalRastreoAbierto(true);
            }}
          >
            <span className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[rgba(214,69,69,0.1)] text-[#D64545]">
              <IconoLupa />
            </span>
            <span className="flex flex-col gap-0.5 leading-[1.35]">
              <strong className="text-[13.5px] font-bold text-[#0B2D4A]">
                ¿Solo quieres rastrear?
              </strong>
              <span className="text-[12.5px] text-[#64748B]">
                Consulta tu guía sin iniciar sesión →
              </span>
            </span>
          </a>
          <p className="mt-5 border-t border-dashed border-[#E4E8EE] pt-5 text-[13px] leading-[1.6] text-[#64748B]">
            ¿Problemas para acceder? Contáctanos en{" "}
            <a
              href="mailto:soporte@transportesrojas.mx"
              className="font-semibold text-[#B13333] no-underline hover:underline"
            >
              soporte@transportesrojas.mx
            </a>
          </p>

          <div className="mt-3">
            <Link
              to="/login-empleados"
              id="link-portal-empleados"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#64748B] no-underline transition-colors hover:text-[#0B2D4A] hover:underline"
            >
              ¿Eres colaborador? Acceso a Portal Empleados →
            </Link>
          </div>
          <ul
            className="mt-5 grid list-none grid-cols-3 gap-2 border-t border-dashed border-[#E4E8EE] p-0 pt-4"
            aria-label="Servicios para clientes"
          >
            <li className="flex flex-col items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.6px] text-[#A7B3C3] transition-colors duration-200 hover:text-[#0B2D4A]">
              <IconoRastreo />
              Rastreo
            </li>
            <li className="flex flex-col items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.6px] text-[#A7B3C3] transition-colors duration-200 hover:text-[#0B2D4A]">
              <IconoEntregas />
              Entregas
            </li>
            <li className="flex flex-col items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.6px] text-[#A7B3C3] transition-colors duration-200 hover:text-[#0B2D4A]">
              <IconoSoporte />
              Soporte
            </li>
          </ul>
        </div>
        <p className="mt-6 text-center font-[Poppins,sans-serif] text-[12.5px] text-white/50">
          © {new Date().getFullYear()} Transportes Rojas · Culiacán, Sinaloa
        </p>
      </div>

      {modalRastreoAbierto && (
        <ModalRastreoPublico onClose={() => setModalRastreoAbierto(false)} />
      )}
    </div>
  );
}

function ModalRastreoPublico({ onClose }: { onClose: () => void }) {
  const [guia, setGuia] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<RastreoPublicoResponse | null>(null);

  const consultarGuia = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const guiaLimpia = guia.trim().toUpperCase();
    setError("");
    setResultado(null);

    if (!guiaLimpia) {
      setError("Ingresa el número de guía oficial (ej. TR-20261107-XXXX).");
      return;
    }

    setGuia(guiaLimpia);
    setBuscando(true);

    try {
      const resp = await envioService.rastrearPorGuia(guiaLimpia);
      setResultado(resp);
    } catch (err) {
      setError(
        extraerMensajeErrorApi(
          err,
          `No se encontró ningún envío con la guía "${guiaLimpia}".`
        )
      );
    } finally {
      setBuscando(false);
    }
  };

  const metaEstado = resultado ? obtenerMetaEstadoEnvio(resultado.estado) : null;
  const esEntregado = metaEstado?.codigo === "entregado";
  const esIncidenciaFinal =
    metaEstado?.codigo === "cancelado" || metaEstado?.codigo === "devuelto";

  const eventosCronologicos = resultado
    ? [...(resultado.eventos || [])].sort(
        (a, b) => new Date(a.fechaEvento).getTime() - new Date(b.fechaEvento).getTime()
      )
    : [];

  return (
    <div
      id="modal-rastreo-publico"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-rastreo-publico"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#071E33]/75 px-4 py-6 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !buscando) onClose();
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-[600px] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)]">
        <div
          className="absolute left-0 right-0 top-0 h-1.5 bg-[#0B2D4A]"
        />

        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="text-left">
            <span className="inline-flex items-center rounded-full border border-[#E4E8EE] bg-[#F7F9FB] px-3 py-1 text-[10.5px] font-bold uppercase tracking-[1.8px] text-[#0B2D4A]">
              Consulta sin iniciar sesión
            </span>
            <h2
              id="titulo-rastreo-publico"
              className="m-0 mt-2 text-xl font-extrabold text-[#0B2D4A]"
            >
              Rastreo Público de Envío
            </h2>
            <p className="m-0 mt-1 text-xs text-[#64748B]">
              Consulta el estatus general y movimientos de tu paquete ingresando tu guía oficial.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar rastreo público"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#E4E8EE] bg-[#F7F9FB] text-[#64748B] transition-colors hover:border-[#D64545] hover:bg-red-50 hover:text-[#D64545]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={consultarGuia} noValidate className="mb-4 flex flex-col gap-2.5 sm:flex-row">
          <input
            id="input-guia-publica"
            type="text"
            autoComplete="off"
            placeholder="Ej. TR-20261107-7XGT"
            value={guia}
            onChange={(e) => setGuia(e.target.value)}
            disabled={buscando}
            className="flex-1 rounded-xl border-[1.5px] border-[#E4E8EE] bg-[#F7F9FB] px-4 py-3 font-mono text-sm uppercase text-[#1F2937] outline-none transition-all placeholder:normal-case placeholder:text-[#A9B3C0] focus:border-[#0B2D4A] focus:bg-white focus:ring-4 focus:ring-blue-500/15"
          />
          <button
            id="btn-rastrear-publico"
            type="submit"
            disabled={buscando}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-[#D64545] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#B83232] disabled:cursor-not-allowed disabled:opacity-65"
          >
            {buscando ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                <span>Consultando…</span>
              </>
            ) : (
              <>
                <Search size={16} />
                <span>Rastrear guía</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div
            id="error-rastreo-publico"
            className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-xs font-semibold text-[#B13333]"
          >
            <AlertCircle size={17} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resultado && metaEstado ? (
          <div
            id="resultado-rastreo-publico"
            className="rounded-2xl border border-[#E4E8EE] bg-[#F7F9FB] p-5 text-left"
          >
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-lg font-extrabold text-[#0B2D4A]">
                {resultado.guia}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${metaEstado.badgeClass}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${metaEstado.dotClass}`} />
                {metaEstado.etiqueta}
              </span>
            </div>

            <div className="mb-4 rounded-xl border border-[#E4E8EE] bg-white px-4 py-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 font-bold text-[#0B2D4A]">
                <span>
                  {resultado.origenResumen ||
                    resultado.sucursalRecepcionNombre ||
                    "Origen documentado"}
                </span>
                <span className="text-[#D64545]">→</span>
                <span>
                  {resultado.destinoResumen ||
                    resultado.sucursalDestinoNombre ||
                    "Destino nacional"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[#64748B]">
                <span>
                  Paquete: <strong>{resultado.descripcionPaquete}</strong> (
                  {Number(resultado.pesoKg).toFixed(2)} kg)
                </span>
                <span>
                  {esEntregado
                    ? "Entregado en destino"
                    : esIncidenciaFinal
                    ? metaEstado?.codigo === "cancelado"
                      ? "Cancelado (sin entrega programada)"
                      : "Devuelto al remitente"
                    : `Entrega est.: ${formatearFechaCorta(resultado.fechaEntregaEstimada)}`}
                </span>
              </div>
            </div>

            {eventosCronologicos.length > 0 && (
              <ul className="relative m-0 mb-3 list-none space-y-3 border-l-2 border-[#CBD5E1] pl-4">
                {eventosCronologicos.map((ev, idx) => {
                  const esUltimo = idx === eventosCronologicos.length - 1;
                  const metaEv = obtenerMetaEstadoEnvio(ev.estado);
                  const colorPunto =
                    esUltimo && !esEntregado
                      ? esIncidenciaFinal
                        ? "bg-slate-500"
                        : "bg-[#D64545]"
                      : "bg-[#16A34A]";

                  return (
                    <li key={`${ev.fechaEvento}-${idx}`} className="relative">
                      <span
                        className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-[#F7F9FB] ${colorPunto}`}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#0B2D4A]">
                          {metaEv.etiqueta}
                        </span>
                        <span className="text-[11px] text-[#64748B]">
                          {formatearFechaHora(ev.fechaEvento)}
                        </span>
                      </div>
                      {ev.descripcion && (
                        <p className="m-0 mt-0.5 text-xs leading-relaxed text-[#475569]">
                          {ev.descripcion}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="m-0 border-t border-[#E4E8EE] pt-3 text-[11px] text-[#64748B]">
              Por seguridad, los datos personales completos y el PIN de entrega solo son visibles
              iniciando sesión en tu cuenta.
            </p>
          </div>
        ) : (
          !error && (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F7F9FB] px-4 py-8 text-center">
              <Package size={36} strokeWidth={1.5} className="mb-2 text-[#0B2D4A]/45" />
              <p className="m-0 max-w-xs text-xs leading-relaxed text-[#64748B]">
                Escribe tu número de guía de Transportes Rojas para consultar en segundos dónde se
                encuentra tu paquete.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function FondoDecorativo() {
  return (
    <div
      className="pointer-events-none fixed inset-0"
      aria-hidden="true"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.045) 1px,transparent 1px)",
        backgroundSize: "64px 64px",
      }}
    >
      <svg
        viewBox="0 0 1400 900"
        preserveAspectRatio="xMidYMid slice"
        className="block h-full w-full"
      >
        <path
          d="M 60 820 C 320 700, 500 520, 720 460 S 1120 260, 1340 100"
          fill="none"
          stroke={COLOR_ROJO}
          strokeWidth="2.5"
          strokeDasharray="6 12"
          opacity="0.55"
        />
        <circle cx="60" cy="820" r="7" fill={COLOR_VERDE} opacity="0.85" />
        <g transform="translate(1340 100)" opacity="0.7">
          <path
            d="M0 -18 C-8 -18 -14 -12 -14 -4 C-14 6 0 20 0 20 C0 20 14 6 14 -4 C14 -12 8 -18 0 -18 Z"
            fill={COLOR_ROJO}
          />
          <circle cx="0" cy="-5" r="4" fill="#fff" />
        </g>
        <circle cx="720" cy="460" r="7" fill={COLOR_ROJO}>
          <animate attributeName="r" values="7;12;7" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <g opacity="0.3" fill="#fff">
          <path d="M300 640 l18 -6 -4 18 z" />
          <path d="M980 320 l18 -6 -4 18 z" />
        </g>
      </svg>
    </div>
  );
}

function FlechaAvance() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoLupa() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16 16l5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconoRastreo() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[22px] w-[22px] text-[#0B2D4A] opacity-85"
    >
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      <path
        d="M12 4v3M12 17v3M4 12h3M17 12h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconoEntregas() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[22px] w-[22px] text-[#0B2D4A] opacity-85"
    >
      <path
        d="M3 7l9-4 9 4v10l-9 4-9-4V7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M3 7l9 4 9-4M12 11v10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoSoporte() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[22px] w-[22px] text-[#0B2D4A] opacity-85"
    >
      <path
        d="M4 13a8 8 0 0 1 16 0v4a3 3 0 0 1-3 3h-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="3"
        y="12"
        width="4"
        height="6"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="17"
        y="12"
        width="4"
        height="6"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}
