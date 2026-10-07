import { useState, type SubmitEvent } from "react";
import logoTransportesRojas from "../../../../assets/LogoCompleto.webp";
const TIEMPO_REGISTRO = 1200;
const MIN_LONGITUD_CONTRASENA = 12;
const DIGITOS_TELEFONO = 10;
const COLOR_ROJO = "#D64545";
const COLOR_VERDE = "#16A34A";
interface DatosRegistro {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  telefono: string;
  contrasena: string;
}
const DATOS_INICIALES: DatosRegistro = {
  nombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  email: "",
  telefono: "",
  contrasena: "",
};
function registrarCliente(_datos: DatosRegistro): Promise<boolean> {
  return new Promise((resolver) => {
    setTimeout(() => resolver(false), TIEMPO_REGISTRO);
  });
}
function validarDatos(datos: DatosRegistro): string {
  if (!datos.nombre.trim()) return "El nombre es obligatorio.";
  if (!datos.apellidoPaterno.trim()) return "El apellido paterno es obligatorio.";
  if (!datos.apellidoMaterno.trim()) return "El apellido materno es obligatorio.";
  if (!datos.email.trim()) return "El correo electrónico es obligatorio.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
    return "El correo electrónico no tiene un formato válido.";
  }
  const soloDigitos = datos.telefono.replace(/\D/g, "");
  if (!soloDigitos) return "El teléfono es obligatorio.";
  if (soloDigitos.length !== DIGITOS_TELEFONO) {
    return `El teléfono debe tener ${DIGITOS_TELEFONO} dígitos.`;
  }
  if (!datos.contrasena) return "La contraseña es obligatoria.";
  if (datos.contrasena.length < MIN_LONGITUD_CONTRASENA) {
    return `La contraseña debe tener al menos ${MIN_LONGITUD_CONTRASENA} caracteres.`;
  }
  return "";
}
export default function RegistroClientes() {
  const [datos, setDatos] = useState<DatosRegistro>(DATOS_INICIALES);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  function alCambiarCampo(campo: keyof DatosRegistro, valor: string) {
    setDatos((anteriores) => ({ ...anteriores, [campo]: valor }));
  }
  async function manejarEnvio(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensajeError("");
    setMensajeExito("");
    const error = validarDatos(datos);
    if (error) {
      setMensajeError(error);
      return;
    }
    setCargando(true);
    const seCreo = await registrarCliente(datos);
    setCargando(false);
    if (!seCreo) {
      setMensajeError(
          "No pudimos crear tu cuenta en este momento. Intenta más tarde."
      );
      return;
    }
    setMensajeExito("¡Cuenta creada! Ya puedes iniciar sesión.");
    setDatos(DATOS_INICIALES);
  }
  return (
    <div
      className="relative flex min-h-screen flex-col overflow-x-hidden font-[Poppins,Inter,system-ui,sans-serif] text-[#1F2937]"
      style={{
        background:
          "radial-gradient(circle at 15% 10%, rgba(214,69,69,0.16), transparent 45%), radial-gradient(circle at 90% 95%, rgba(37,99,235,0.08), transparent 55%), #0B2D4A",
      }}
    >
      <FondoDecorativo />
      <div className="relative z-10 border-b border-white/[0.08] bg-[#071E33] py-3 text-center font-[Montserrat,sans-serif] text-[11.5px] font-semibold tracking-[3.2px] text-white/70">
        <span className="strip-span relative inline-block px-4">
          TUS ENVÍOS, EN BUENAS MANOS
        </span>
      </div>
      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div
          className="card-pop relative w-full max-w-[560px] rounded-3xl bg-white px-12 py-9 text-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
                     max-sm:rounded-2xl max-sm:px-6 max-sm:py-8"
        >
          <div
            className="absolute left-1/2 top-0 h-1 w-24 -translate-x-1/2 rounded-b"
            style={{ background: "linear-gradient(90deg,#0B2D4A,#D64545)" }}
          />
          <div className="mb-5 inline-flex items-center rounded-full border border-[#E4E8EE] bg-[#F7F9FB] px-[14px] py-[7px] text-[11px] font-bold uppercase tracking-[2.4px] text-[#0B2D4A]">
            Registro
          </div>
          <img
            src={logoTransportesRojas}
            alt="Transportes Rojas"
            className="mx-auto mb-5 block w-[220px] select-none max-sm:w-[160px]"
            draggable={false}
          />
          {mensajeError && (
            <div className="lrc-shake mb-5 rounded-[10px] border border-[rgba(214,69,69,0.22)] bg-[rgba(214,69,69,0.08)] px-[14px] py-3 text-left text-[13px] leading-[1.5] text-[#B13333]">
              {mensajeError}
            </div>
          )}
          {mensajeExito && (
            <div className="mb-5 rounded-[10px] border border-[rgba(22,163,74,0.22)] bg-[rgba(22,163,74,0.08)] px-[14px] py-3 text-left text-[13px] leading-[1.5] text-[#166534]">
              {mensajeExito}
            </div>
          )}
          <form onSubmit={manejarEnvio} noValidate>
            <CampoTexto
              id="nombre"
              label="Nombre"
              tipo="text"
              autoComplete="given-name"
              placeholder="Ana"
              value={datos.nombre}
              onChange={(e) => alCambiarCampo("nombre", e.target.value)}
            />
            <div className="mb-[18px] grid grid-cols-2 gap-[18px] max-sm:grid-cols-1">
              <CampoTexto
                id="apellido-paterno"
                label="Apellido paterno"
                tipo="text"
                autoComplete="family-name"
                placeholder="García"
                value={datos.apellidoPaterno}
                onChange={(e) =>
                  alCambiarCampo("apellidoPaterno", e.target.value)
                }
                sinMargen
              />
              <CampoTexto
                id="apellido-materno"
                label="Apellido materno"
                tipo="text"
                autoComplete="additional-name"
                placeholder="López"
                value={datos.apellidoMaterno}
                onChange={(e) =>
                  alCambiarCampo("apellidoMaterno", e.target.value)
                }
                sinMargen
              />
            </div>
            <CampoTexto
              id="email"
              label="Correo electrónico"
              tipo="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={datos.email}
              onChange={(e) => alCambiarCampo("email", e.target.value)}
            />
            <CampoTexto
              id="telefono"
              label="Teléfono"
              tipo="tel"
              autoComplete="tel"
              placeholder="55 1234 5678"
              value={datos.telefono}
              onChange={(e) => alCambiarCampo("telefono", e.target.value)}
            />
            <div className="mb-[18px] flex flex-col gap-[7px] text-left">
              <label
                htmlFor="contrasena"
                className="font-[Montserrat,sans-serif] text-[12.5px] font-bold uppercase tracking-[0.6px] text-[#0B2D4A]"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="contrasena"
                  type={mostrarContrasena ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={datos.contrasena}
                  onChange={(e) =>
                    alCambiarCampo("contrasena", e.target.value)
                  }
                  className="w-full rounded-xl border-[1.5px] border-[#E4E8EE] bg-[#F7F9FB] py-[15px] pl-4 pr-[100px] font-[Poppins,sans-serif] text-base text-[#1F2937] outline-none transition-[border-color,box-shadow,background] duration-150 placeholder:text-[#A9B3C0] focus:border-[#D64545] focus:bg-white focus:shadow-[0_0_0_4px_rgba(214,69,69,0.24)]"
                />
                <button
                  type="button"
                  onClick={() => setMostrarContrasena((v) => !v)}
                  aria-label={
                    mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  className="absolute right-[10px] top-1/2 -translate-y-1/2 cursor-pointer rounded-md border-none bg-transparent px-[10px] py-[6px] font-[Montserrat,sans-serif] text-[11.5px] font-bold uppercase tracking-[0.8px] text-[#64748B] transition-[color,background] duration-150 hover:bg-[rgba(214,69,69,0.07)] hover:text-[#B13333]"
                >
                  {mostrarContrasena ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              <p className="mt-1 text-[12px] leading-[1.4] text-[#64748B]">
                Mínimo {MIN_LONGITUD_CONTRASENA} caracteres.
              </p>
            </div>
            <button
              className="submit-btn relative mt-1.5 inline-flex w-full cursor-pointer items-center justify-center gap-[10px] overflow-hidden rounded-xl border-none px-6 py-[17px] font-[Montserrat,sans-serif] text-[15.5px] font-bold tracking-[0.4px] text-white shadow-[0_14px_28px_-14px_rgba(11,45,74,0.65)] transition-[transform,box-shadow,filter] duration-200 disabled:cursor-not-allowed disabled:opacity-75"
              style={{
                background: "linear-gradient(135deg,#0B2D4A 0%,#143F66 100%)",
              }}
              type="submit"
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <span
                    className="inline-block h-[15px] w-[15px] animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden="true"
                  />
                  Creando tu cuenta…
                </>
              ) : (
                <>
                  Crear cuenta
                  <FlechaAvance />
                </>
              )}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center font-[Poppins,sans-serif] text-[12.5px] text-white/50">
          © {new Date().getFullYear()} Transportes Rojas · Culiacán, Sinaloa
        </p>
      </div>
    </div>
  );
}
interface PropsCampoTexto {
  id: string;
  label: string;
  tipo: string;
  autoComplete?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sinMargen?: boolean;
}
function CampoTexto({
  id,
  label,
  tipo,
  autoComplete,
  placeholder,
  value,
  onChange,
  sinMargen = false,
}: PropsCampoTexto) {
  return (
    <div
      className={`flex flex-col gap-[7px] text-left${sinMargen ? "" : " mb-[18px]"}`}
    >
      <label
        htmlFor={id}
        className="font-[Montserrat,sans-serif] text-[12.5px] font-bold uppercase tracking-[0.6px] text-[#0B2D4A]"
      >
        {label}
      </label>
      <input
        id={id}
        type={tipo}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border-[1.5px] border-[#E4E8EE] bg-[#F7F9FB] px-4 py-[15px] font-[Poppins,sans-serif] text-base text-[#1F2937] outline-none transition-[border-color,box-shadow,background] duration-150 placeholder:text-[#A9B3C0] focus:border-[#D64545] focus:bg-white focus:shadow-[0_0_0_4px_rgba(214,69,69,0.24)]"
      />
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
          <animate
            attributeName="r"
            values="7;12;7"
            dur="2.4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="1;0.4;1"
            dur="2.4s"
            repeatCount="indefinite"
          />
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