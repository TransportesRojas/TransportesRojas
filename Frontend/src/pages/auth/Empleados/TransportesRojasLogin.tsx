import { useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoTransportesRojas from "../../../assets/LogoCompleto.webp";
import { ApiError, fetchApi } from "../../../services/api";
import { extraerMensajeErrorApi } from "../../../utils/errorMessages";

const COLOR_ROJO = "#D64545";
const COLOR_VERDE = "#16A34A";

function getRedirectPath(roles: string[]): string {
  if (!roles || roles.length === 0) return "/login-empleados";
  const rolesNorm = roles.map((r) => r.toLowerCase());
  const tieneRolAdmin = rolesNorm.some((r) =>
    [
      "rh",
      "supervisor",
      "jefe de flotilla",
      "jefe",
      "personal administrativo",
      "personal de sucursal",
    ].includes(r)
  );
  if (rolesNorm.includes("chofer") && !tieneRolAdmin) {
    return "/chofer";
  }
  return "/admin/bienvenida";
}

export default function LoginEmpleados() {
  const navigate = useNavigate();


  const [numeroEmpleado, setNumeroEmpleado] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);


  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");

  async function manejarEnvio(evento: SubmitEvent<HTMLFormElement> | React.FormEvent) {
    evento.preventDefault();
    if (cargando) return;
    setMensajeError("");

    if (!numeroEmpleado.trim() || !contrasena.trim()) {
      setMensajeError("Ingresa tus credenciales para continuar.");
      return;
    }

    setCargando(true);
    try {
      const idStr = numeroEmpleado.replace(/\D/g, "");
      const empleadoId = parseInt(idStr, 10);

      const resp = await fetchApi("/Autenticacion/login-empleado", {
        method: "POST",
        body: JSON.stringify({
          empleadoId: isNaN(empleadoId) ? 0 : empleadoId,
          password: contrasena,
        }),
      });

      if (resp) {
        if (!resp.roles || resp.roles.length === 0) {
          setMensajeError(
            "Tu usuario no tiene ningún rol asignado. Contacta a RH para que te asignen uno."
          );
          return;
        }

        localStorage.setItem("token", resp.token);
        localStorage.setItem("user", JSON.stringify(resp));

        const ruta = getRedirectPath(resp.roles);
        navigate(ruta);
      } else {
        setMensajeError("Credenciales no válidas. Contacta al área de Sistemas.");
      }
    } catch (error: any) {
      console.error(error);
      if (error instanceof ApiError && error.status === 401) {
        setMensajeError("Credenciales incorrectas. Revisa tu número de empleado y contraseña.");
      } else {
        setMensajeError(
          extraerMensajeErrorApi(
            error,
            "Error al iniciar sesión. Verifica tus datos o intenta más tarde."
          )
        );
      }
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
          POR QUE TÚ, HACES LA DIFERENCIA
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
            Portal Empleados
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
                htmlFor="emp"
                className="text-[12.5px] font-bold uppercase tracking-[0.6px] text-[#0B2D4A]"
              >
                Número de empleado
              </label>
              <input
                id="emp"
                type="text"
                autoComplete="username"
                placeholder="TR-0421"
                value={numeroEmpleado}
                onChange={(evento) => setNumeroEmpleado(evento.target.value)}
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
                  Entrar al sistema
                  <FlechaAvance />
                </>
              )}
            </button>
          </form>


          <p className="mt-6 border-t border-dashed border-[#E4E8EE] pt-5 text-[13px] leading-[1.6] text-[#64748B]">
            ¿Problemas de acceso? Escríbenos a{" "}
            <a
              href="mailto:sistemas@transportesrojas.mx"
              className="font-semibold text-[#B13333] no-underline hover:underline"
            >
              sistemas@transportesrojas.mx
            </a>
          </p>

          <div className="mt-3">
            <Link
              to="/login-clientes"
              id="link-portal-clientes"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0B2D4A] no-underline transition-colors hover:text-[#D64545] hover:underline"
            >
              ¿Eres cliente? Ir al Portal de Clientes →
            </Link>
          </div>


        </div>

        <p className="mt-6 text-center font-[Poppins,sans-serif] text-[12.5px] text-white/50">
          © {new Date().getFullYear()} Transportes Rojas · Culiacán, Sinaloa
        </p>
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


