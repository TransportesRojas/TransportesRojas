import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  User,
  Briefcase,
  Building2,
  Calendar,
  Phone,
  Mail,
  Shield,
  History,
  CheckCircle2,
  Loader2,
  Printer,
  Award,
  FileCheck,
} from "lucide-react";
import type { Empleado, ExpedienteEmpleado } from "./types";
import { fetchApi } from "../../../services/api";
import logoTransportesRojas from "../../../assets/LogoCompleto.webp";

interface EmpleadoModalExpedienteProps {
  abierto: boolean;
  empleado: Empleado | null;
  onClose: () => void;
}

export function EmpleadoModalExpediente({
  abierto,
  empleado,
  onClose,
}: EmpleadoModalExpedienteProps) {
  const [expediente, setExpediente] = useState<ExpedienteEmpleado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [tabActiva, setTabActiva] = useState<"generales" | "trayectoria" | "roles" | "completo">("generales");

  useEffect(() => {
    if (abierto && empleado) {
      setCargando(true);
      setTabActiva("generales");
      fetchApi(`/Empleado/${empleado.id}/expediente`)
        .then((data: ExpedienteEmpleado) => setExpediente(data))
        .catch((err) => {
          console.error("Error al cargar expediente de empleado", err);
        })
        .finally(() => setCargando(false));
    } else {
      setExpediente(null);
    }
  }, [abierto, empleado]);

  if (!abierto || !empleado) return null;

  const iniciales = `${empleado.nombre?.[0] ?? ""}${empleado.apellidoPaterno?.[0] ?? ""}`.toUpperCase();

  const nombreCompletoReal = expediente
    ? [expediente.nombre, expediente.apellidoPaterno, expediente.apellidoMaterno].filter(Boolean).join(" ")
    : [empleado.nombre, empleado.apellidoPaterno, empleado.apellidoMaterno].filter(Boolean).join(" ");

  const folioExpediente = `EXP-TR-${String(empleado.id).padStart(3, "0")}`;
  const claveEmpleado = expediente?.clave || `TR-${String(empleado.id).padStart(3, "0")}`;

  const imprimirExpediente = () => {
    window.print();
  };

  // Documento para impresión
  const documentoImpresion = (
    <div
      id="expediente-documento-oficial"
      style={{
        display: "none",
        fontFamily: "'Poppins', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#1E293B",
        backgroundColor: "#FFFFFF",
        width: "100%",
        maxWidth: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          height: "5px",
          width: "100%",
          background: "#0B2D4A",
          borderRadius: "3px 3px 0 0",
          marginBottom: "10px",
        }}
      />

      <div
        className="exp-avoid-break"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid #0B2D4A",
          paddingBottom: "10px",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src={logoTransportesRojas}
            alt="Transportes Rojas"
            style={{ height: "48px", width: "auto", objectFit: "contain" }}
          />
          <div>
            <div style={{ fontSize: "15pt", fontWeight: "900", color: "#0B2D4A", letterSpacing: "-0.5px", lineHeight: "1.15" }}>
              TRANSPORTES <span style={{ color: "#D64545" }}>ROJAS</span>
            </div>
            <div style={{ fontSize: "7.5pt", color: "#64748B", fontWeight: "700", letterSpacing: "0.8px", textTransform: "uppercase" }}>
              Transportes Rojas S.A. de C.V. • Paquetería, Carga y Logística Especializada
            </div>
            <div style={{ fontSize: "8pt", color: "#0B2D4A", fontWeight: "800", marginTop: "2px", textTransform: "uppercase" }}>
              Dirección de Capital Humano — Expediente Laboral Oficial
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 10px",
              backgroundColor: "#0B2D4A",
              color: "#FFFFFF",
              borderRadius: "5px",
              fontSize: "9.5pt",
              fontWeight: "800",
              fontFamily: "monospace",
              border: "1px solid #1E3A8A",
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            }}
          >
            FOLIO: {folioExpediente}
          </div>
          <div style={{ marginTop: "4px" }}>
            <span
              style={{
                display: "inline-block",
                padding: "2px 8px",
                backgroundColor: empleado.activo ? "#DCFCE7" : "#FEE2E2",
                color: empleado.activo ? "#166534" : "#991B1B",
                border: `1px solid ${empleado.activo ? "#86EFAC" : "#FCA5A5"}`,
                borderRadius: "999px",
                fontSize: "7pt",
                fontWeight: "800",
                letterSpacing: "0.3px",
              }}
            >
              {empleado.activo ? "● ACTIVO / VIGENTE" : "● INACTIVO / BAJA"}
            </span>
          </div>
        </div>
      </div>

      <div
        className="exp-avoid-break"
        style={{
          background: "linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)",
          border: "1px solid #CBD5E1",
          borderLeft: "5px solid #0B2D4A",
          borderRadius: "7px",
          padding: "8px 12px",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(11, 45, 74, 0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              backgroundColor: "#0B2D4A",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12pt",
              fontWeight: "900",
              border: "2px solid #FFFFFF",
              boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
              flexShrink: 0,
            }}
          >
            {iniciales}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11pt", fontWeight: "900", color: "#0B2D4A", letterSpacing: "-0.3px" }}>
                {nombreCompletoReal}
              </span>
              <span
                style={{
                  backgroundColor: "#0B2D4A",
                  color: "#FFFFFF",
                  fontSize: "7.5pt",
                  fontWeight: "700",
                  padding: "1.5px 7px",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                }}
              >
                {claveEmpleado}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px", fontSize: "7.5pt", color: "#475569" }}>
              <span>
                <strong style={{ color: "#0B2D4A" }}>Puesto:</strong> {expediente?.puestoActual || "Operador de Reparto y Carga"}
              </span>
              <span>•</span>
              <span>
                <strong style={{ color: "#0B2D4A" }}>Sucursal:</strong> {expediente?.sucursalNombre || "Sin asignar"}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "5px",
              padding: "3px 8px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "6pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Antigüedad</div>
            <div style={{ fontSize: "7.5pt", fontWeight: "800", color: "#166534" }}>{expediente?.antiguedadTexto || "Menos de 1 mes"}</div>
          </div>
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: "5px",
              padding: "3px 8px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "6pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Tipo Contrato</div>
            <div style={{ fontSize: "7.5pt", fontWeight: "800", color: "#0B2D4A" }}>Planta / Confianza</div>
          </div>
        </div>
      </div>

      <div
        className="exp-avoid-break"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "7px",
          padding: "8px 12px",
          marginBottom: "8px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1.5px solid #0B2D4A",
            paddingBottom: "4px",
            marginBottom: "7px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                backgroundColor: "#0B2D4A",
                color: "#FFFFFF",
                fontSize: "7pt",
                fontWeight: "900",
                padding: "1px 5px",
                borderRadius: "3px",
              }}
            >
              I
            </span>
            <span style={{ fontSize: "8.5pt", fontWeight: "800", color: "#0B2D4A", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              I. Ficha de Identidad del Empleado
            </span>
          </div>
          <span style={{ fontSize: "6.5pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Datos Generales y de Contacto
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "5px", fontSize: "7.5pt" }}>
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 7px" }}>
            <span style={{ display: "block", fontSize: "6pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Nombre(s)</span>
            <span style={{ fontWeight: "700", color: "#0F172A" }}>{expediente?.nombre || empleado.nombre}</span>
          </div>
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 7px" }}>
            <span style={{ display: "block", fontSize: "6pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Apellido Paterno</span>
            <span style={{ fontWeight: "700", color: "#0F172A" }}>{expediente?.apellidoPaterno || empleado.apellidoPaterno}</span>
          </div>
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 7px" }}>
            <span style={{ display: "block", fontSize: "6pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Apellido Materno</span>
            <span style={{ fontWeight: "700", color: "#0F172A" }}>{expediente?.apellidoMaterno || empleado.apellidoMaterno || "No registrado"}</span>
          </div>
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 7px" }}>
            <span style={{ display: "block", fontSize: "6pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Teléfono de Contacto</span>
            <span style={{ fontWeight: "700", color: "#0F172A" }}>{expediente?.telefono || empleado.telefono || "Sin registrar"}</span>
          </div>
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 7px" }}>
            <span style={{ display: "block", fontSize: "6pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Correo Electrónico</span>
            <span style={{ fontWeight: "700", color: "#0F172A", wordBreak: "break-all" }}>{expediente?.email || empleado.email || "Sin registrar"}</span>
          </div>
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 7px" }}>
            <span style={{ display: "block", fontSize: "6pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Fecha de Ingreso</span>
            <span style={{ fontWeight: "700", color: "#0F172A" }}>{expediente?.fechaIngreso || empleado.fechaIngreso || "No registrada"}</span>
          </div>
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 7px" }}>
            <span style={{ display: "block", fontSize: "6pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Fecha Registro en BD</span>
            <span style={{ fontWeight: "700", fontFamily: "monospace", color: "#475569" }}>
              {expediente?.createdAt ? new Date(expediente.createdAt).toLocaleDateString("es-MX") : "N/A"}
            </span>
          </div>
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 7px" }}>
            <span style={{ display: "block", fontSize: "6pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Clasificación Laboral</span>
            <span style={{ fontWeight: "700", color: "#0B2D4A" }}>Personal Operativo / Confianza</span>
          </div>
        </div>
      </div>

      <div
        className="exp-avoid-break"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "7px",
          padding: "8px 12px",
          marginBottom: "8px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1.5px solid #0B2D4A",
            paddingBottom: "4px",
            marginBottom: "7px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                backgroundColor: "#0B2D4A",
                color: "#FFFFFF",
                fontSize: "7pt",
                fontWeight: "900",
                padding: "1px 5px",
                borderRadius: "3px",
              }}
            >
              II
            </span>
            <span style={{ fontSize: "8.5pt", fontWeight: "800", color: "#0B2D4A", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              II. Adscripción Oficial y Centro Operativo
            </span>
          </div>
          <span style={{ fontSize: "6.5pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Asignación y Responsabilidades
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "5px", fontSize: "7.5pt" }}>
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 7px" }}>
            <span style={{ display: "block", fontSize: "6pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Sucursal Asignada</span>
            <span style={{ fontWeight: "800", color: "#0B2D4A" }}>{expediente?.sucursalNombre || "Sin asignar"}</span>
          </div>
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 7px" }}>
            <span style={{ display: "block", fontSize: "6pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Código de Sucursal</span>
            <span style={{ fontWeight: "800", fontFamily: "monospace", color: "#0B2D4A" }}>{expediente?.sucursalCodigo || "N/A"}</span>
          </div>
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 7px" }}>
            <span style={{ display: "block", fontSize: "6pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Nombre Corto / Alias</span>
            <span style={{ fontWeight: "700", color: "#0F172A" }}>{expediente?.sucursalAlias || "N/A"}</span>
          </div>
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 7px" }}>
            <span style={{ display: "block", fontSize: "6pt", color: "#64748B", fontWeight: "700", textTransform: "uppercase" }}>Centros a su Cargo</span>
            <span style={{ fontWeight: "700", color: "#0F172A" }}>
              {expediente?.sucursalesACargo && expediente.sucursalesACargo.length > 0
                ? expediente.sucursalesACargo.map(s => `${s.nombre} (${s.alias || s.codigo})`).join(", ")
                : "Ninguno"}
            </span>
          </div>
        </div>
      </div>

      <div
        className="exp-avoid-break"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "7px",
          padding: "8px 12px",
          marginBottom: "8px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1.5px solid #0B2D4A",
            paddingBottom: "4px",
            marginBottom: "6px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                backgroundColor: "#0B2D4A",
                color: "#FFFFFF",
                fontSize: "7pt",
                fontWeight: "900",
                padding: "1px 5px",
                borderRadius: "3px",
              }}
            >
              III
            </span>
            <span style={{ fontSize: "8.5pt", fontWeight: "800", color: "#0B2D4A", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              III. Trayectoria y Movimientos Laborales
            </span>
          </div>
          <span style={{ fontSize: "6.5pt", color: "#64748B", fontWeight: "700" }}>
            {expediente?.trayectoriaLaboral?.length ?? 0} movimiento(s) registrado(s)
          </span>
        </div>
        {expediente?.trayectoriaLaboral && expediente.trayectoriaLaboral.length > 0 ? (
          <table style={{ width: "100%", fontSize: "7.5pt", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#0B2D4A", color: "#FFFFFF" }}>
                <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: "700", borderTopLeftRadius: "3px" }}>Puesto</th>
                <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: "700" }}>Período</th>
                <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: "700", borderTopRightRadius: "3px" }}>Motivo de Asignación / Movimiento</th>
              </tr>
            </thead>
            <tbody>
              {expediente.trayectoriaLaboral.map((mov, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: i % 2 === 0 ? "#F8FAFC" : "#FFFFFF" }}>
                  <td style={{ padding: "4px 8px", fontWeight: "700", color: "#0F172A" }}>{mov.puestoNombre}</td>
                  <td style={{ padding: "4px 8px", fontFamily: "monospace", color: "#475569" }}>
                    {mov.fechaInicio} al {mov.fechaFin ?? "Actual (Vigente)"}
                  </td>
                  <td style={{ padding: "4px 8px", color: "#334155" }}>
                    {mov.motivo || mov.motivoCambio || "Asignación inicial"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ fontSize: "7.5pt", color: "#64748B", fontStyle: "italic", padding: "4px 0" }}>
            Sin registros adicionales en el historial de puestos.
          </div>
        )}
      </div>

      <div
        className="exp-avoid-break"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "7px",
          padding: "8px 12px",
          marginBottom: "8px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1.5px solid #0B2D4A",
            paddingBottom: "4px",
            marginBottom: "6px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                backgroundColor: "#0B2D4A",
                color: "#FFFFFF",
                fontSize: "7pt",
                fontWeight: "900",
                padding: "1px 5px",
                borderRadius: "3px",
              }}
            >
              IV
            </span>
            <span style={{ fontSize: "8.5pt", fontWeight: "800", color: "#0B2D4A", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              IV. Roles y Privilegios en el Sistema Operativo
            </span>
          </div>
          <span style={{ fontSize: "6.5pt", color: "#64748B", fontWeight: "600", textTransform: "uppercase" }}>
            Nivel de Acceso Plataforma
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          {expediente?.roles && expediente.roles.length > 0 ? (
            expediente.roles.map((r, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 8px",
                  backgroundColor: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: "4px",
                  fontSize: "7.5pt",
                  fontWeight: "700",
                  color: "#0B2D4A",
                }}
              >
                <span style={{ color: "#16A34A", fontWeight: "900" }}>✓</span> {r}
              </span>
            ))
          ) : (
            <span style={{ fontSize: "7.5pt", color: "#64748B", fontStyle: "italic" }}>Sin roles adicionales asignados</span>
          )}
        </div>
      </div>

      <div
        className="exp-avoid-break"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #CBD5E1",
          borderRadius: "7px",
          padding: "8px 12px",
          marginBottom: "8px",
        }}
      >
        <div style={{ textAlign: "center", fontSize: "7pt", color: "#64748B", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" }}>
          V. Constancia de Validación y Conformidad Institucional
        </div>
        <table style={{ width: "100%", textAlign: "center", fontSize: "7.5pt", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ width: "42%", verticalAlign: "bottom", padding: "0 14px" }}>
                <div style={{ borderTop: "1.5px solid #0F172A", width: "85%", margin: "0 auto 4px auto" }} />
                <div style={{ fontWeight: "800", color: "#0B2D4A", fontSize: "8.5pt" }}>{nombreCompletoReal}</div>
                <div style={{ fontSize: "7pt", color: "#64748B" }}>Firma del Colaborador — Clave: {claveEmpleado}</div>
              </td>
              <td style={{ width: "16%", verticalAlign: "middle", textAlign: "center" }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    border: "2px dashed #0B2D4A",
                    margin: "0 auto",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "4.5pt",
                    fontWeight: "900",
                    color: "#0B2D4A",
                    lineHeight: "1.05",
                    transform: "rotate(-5deg)",
                    textTransform: "uppercase",
                    backgroundColor: "#F8FAFC",
                  }}
                >
                  <span style={{ fontSize: "4.5pt", color: "#D64545" }}>★ ROJAS ★</span>
                  <span style={{ fontSize: "4pt" }}>CAPITAL</span>
                  <span style={{ fontSize: "4pt" }}>HUMANO</span>
                  <span style={{ fontSize: "3.5pt", color: "#166534", fontWeight: "bold" }}>VALIDADO</span>
                </div>
              </td>
              <td style={{ width: "42%", verticalAlign: "bottom", padding: "0 14px" }}>
                <div style={{ borderTop: "1.5px solid #0F172A", width: "85%", margin: "0 auto 4px auto" }} />
                <div style={{ fontWeight: "800", color: "#0B2D4A", fontSize: "8.5pt" }}>Dirección de Capital Humano</div>
                <div style={{ fontSize: "7pt", color: "#64748B" }}>Transportes Rojas S.A. de C.V. — Sello de Validación</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        className="exp-avoid-break"
        style={{
          backgroundColor: "#0B2D4A",
          color: "#FFFFFF",
          borderRadius: "5px",
          padding: "6px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "7.5pt", fontWeight: "900", letterSpacing: "1px", textTransform: "uppercase" }}>
          " TUS ENVÍOS, EN BUENAS MANOS "
        </div>
        <div
          style={{
            backgroundColor: "#D64545",
            color: "#FFFFFF",
            padding: "2px 8px",
            borderRadius: "3px",
            fontSize: "6.5pt",
            fontWeight: "800",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          TRANSPORTES ROJAS S.A. DE C.V.
        </div>
      </div>
      <div style={{ fontSize: "6pt", color: "#94A3B8", textAlign: "center", marginTop: "4px" }}>
        Documento oficial emitido por el Sistema Institucional de Transportes Rojas S.A. de C.V. Prohibida su alteración o reproducción no autorizada.
      </div>
    </div>
  );

  return (
    <>
      {/* Estilos de impresión */}
      <style>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 0 !important;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #1f2937 !important;
            font-size: 8.5pt !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #root, .cc-backdrop, .admin-sidebar-wrapper, .admin-header, .cc-header {
            display: none !important;
            visibility: hidden !important;
          }
          #expediente-documento-oficial {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 8mm 12mm 6mm 12mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            color: #1f2937 !important;
          }
          #expediente-documento-oficial * {
            visibility: visible !important;
          }
          .exp-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {typeof document !== "undefined" && createPortal(documentoImpresion, document.body)}

      {/* Modal en pantalla */}
      <div
        className="cc-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-expediente-titulo"
      >
        <div
          className="cc-modal"
          style={{ maxWidth: 860, width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
        >
          <div className="cc-modal-header" style={{ borderBottom: "1px solid #e2e8f0" }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-tr-navy text-white flex items-center justify-center font-bold text-base shadow-xs border-2 border-white">
                {iniciales}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="modal-expediente-titulo" className="cc-modal-title text-lg">
                    Expediente Laboral
                  </h2>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-tr-navy border border-blue-200">
                    {claveEmpleado}
                  </span>
                  <span
                    className={`cc-badge-status ${empleado.activo ? "cc-badge-status--on" : "cc-badge-status--off"
                      }`}
                  >
                    {empleado.activo ? "Vigente / Activo" : "Baja Laboral"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {nombreCompletoReal}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="cc-modal-close"
                onClick={onClose}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{expediente?.email || empleado.email || "Sin correo"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{expediente?.telefono || empleado.telefono || "Sin teléfono"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{expediente?.sucursalAlias || expediente?.sucursalNombre || "Sin sucursal"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Antigüedad: {expediente?.antiguedadTexto || "En cálculo"}</span>
            </div>
          </div>

          {/* Pestañas */}
          <div className="flex border-b border-slate-200 px-5 bg-white overflow-x-auto">
            <button
              type="button"
              onClick={() => setTabActiva("generales")}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${tabActiva === "generales"
                  ? "border-tr-navy text-tr-navy"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              <User className="w-4 h-4" />
              <span>Datos Generales y Sucursal</span>
            </button>
            <button
              type="button"
              onClick={() => setTabActiva("trayectoria")}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${tabActiva === "trayectoria"
                  ? "border-tr-navy text-tr-navy"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              <History className="w-4 h-4" />
              <span>
                Trayectoria Laboral ({expediente?.trayectoriaLaboral?.length ?? 0})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTabActiva("roles")}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${tabActiva === "roles"
                  ? "border-tr-navy text-tr-navy"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              <Shield className="w-4 h-4" />
              <span>Roles y Accesos ({expediente?.roles?.length ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setTabActiva("completo")}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${tabActiva === "completo"
                  ? "border-tr-navy text-tr-navy bg-blue-50/50 rounded-t"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-800">Vista Completa (Dossier Oficial)</span>
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 bg-[#F8FAFC]">
            {cargando ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-tr-navy" />
                <span className="text-xs font-medium">Cargando expediente laboral...</span>
              </div>
            ) : !expediente ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No se pudo obtener la información del expediente.
              </div>
            ) : tabActiva === "generales" ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-2 border-b pb-2">
                    <User className="w-4 h-4 text-tr-navy" />
                    Ficha de Identidad del Empleado
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Clave de Empleado</span>
                      <span className="font-mono font-bold text-tr-navy">{expediente.clave}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Nombre(s)</span>
                      <span className="font-semibold text-slate-800">{expediente.nombre}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Apellido Paterno</span>
                      <span className="font-semibold text-slate-800">{expediente.apellidoPaterno}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Apellido Materno</span>
                      <span className="font-semibold text-slate-800">{expediente.apellidoMaterno || "No registrado"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Teléfono de Contacto</span>
                      <span className="font-semibold text-slate-800">{expediente.telefono || "Sin registrar"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Correo Electrónico</span>
                      <span className="font-semibold text-slate-800">{expediente.email || "Sin registrar"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Fecha de Ingreso</span>
                      <span className="font-semibold text-slate-800">
                        {expediente.fechaIngreso || "No registrada"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Antigüedad en la Empresa</span>
                      <span className="font-bold text-emerald-700">{expediente.antiguedadTexto}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Fecha de Registro en BD</span>
                      <span className="font-mono text-slate-600">
                        {new Date(expediente.createdAt).toLocaleDateString("es-MX")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-2 border-b pb-2">
                    <Building2 className="w-4 h-4 text-tr-navy" />
                    Sucursal y Adscripción Oficial
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Sucursal Asignada</span>
                      <span className="font-bold text-slate-900">{expediente.sucursalNombre || "Sin asignar"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Alias / Nombre Corto</span>
                      <span className="font-semibold text-slate-800">{expediente.sucursalAlias || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Código de Sucursal</span>
                      <span className="font-mono font-bold text-tr-navy">{expediente.sucursalCodigo || "N/A"}</span>
                    </div>
                  </div>

                  {expediente.sucursalesACargo && expediente.sucursalesACargo.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <span className="text-slate-400 block text-[11px] mb-1">
                        Sucursales bajo su Responsabilidad Directa:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {expediente.sucursalesACargo.map((suc) => (
                          <span
                            key={suc.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-tr-navy"
                          >
                            <Award className="w-3.5 h-3.5 text-blue-600" />
                            <span>{suc.nombre} ({suc.alias || suc.codigo})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : tabActiva === "trayectoria" ? (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between border-b pb-2 mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-tr-navy" />
                    Puesto Actual y Registro de Movimientos
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                    Puesto Vigente: {expediente.puestoActual || "Sin puesto"}
                  </span>
                </div>

                {expediente.trayectoriaLaboral.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    No cuenta con movimientos registrados en el historial de puestos.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {expediente.trayectoriaLaboral.map((mov, idx) => (
                      <div key={mov.puestoId || idx} className="relative">
                        <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-tr-navy border-2 border-white shadow-xs" />
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">
                              {mov.puestoNombre}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {mov.fechaInicio} — {mov.fechaFin ?? "Actual"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            <span className="text-slate-400 font-medium">Motivo: </span>
                            {mov.motivo || mov.motivoCambio || "Asignación inicial de ingreso"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : tabActiva === "roles" ? (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-2 border-b pb-2">
                  <Shield className="w-4 h-4 text-tr-navy" />
                  Roles y Permisos Operativos Asignados
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Roles vigentes asignados a la cuenta de usuario del empleado en la base de datos de Transportes Rojas.
                </p>

                {expediente.roles.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    Este empleado no tiene roles de sistema asociados.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {expediente.roles.map((r, i) => (
                      <div
                        key={i}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-slate-900">{r}</div>
                          <div className="text-[11px] text-slate-500">
                            Rol oficial activo en la plataforma
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Dossier completo */
              <div className="space-y-4">
                <div className="h-1.5 w-full bg-[#0B2D4A] rounded-t-lg" />

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={logoTransportesRojas}
                        alt="Transportes Rojas"
                        className="h-12 w-auto object-contain"
                      />
                      <div>
                        <h1 className="text-base font-black text-tr-navy tracking-tight uppercase leading-tight">
                          Transportes <span className="text-tr-red">Rojas</span> S.A. de C.V.
                        </h1>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Tus Envíos, En Buenas Manos • Servicios de Paquetería, Carga y Logística
                        </p>
                        <p className="text-[10.5px] text-tr-navy font-bold uppercase mt-0.5">
                          Dirección de Capital Humano — Expediente Laboral Oficial
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="inline-block font-mono text-xs font-bold text-white bg-tr-navy px-3 py-1 rounded shadow-xs border border-blue-900">
                        FOLIO: {folioExpediente}
                      </span>
                      <div className="mt-1">
                        <span className={`inline-block font-bold px-2.5 py-0.5 rounded-full text-[10.5px] ${expediente.activo
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-red-100 text-red-800 border border-red-300"
                          }`}>
                          {expediente.activo ? "● VIGENTE / ACTIVO" : "● INACTIVO"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs bg-gradient-to-r from-slate-50 to-blue-50/40 p-4 rounded-xl border border-slate-200 border-l-4 border-l-tr-navy shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-tr-navy text-white flex items-center justify-center font-black text-sm border-2 border-white shadow-xs">
                        {iniciales}
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10.5px] font-bold block uppercase tracking-wide">Colaborador Titular</span>
                        <span className="font-black text-tr-navy text-base">{nombreCompletoReal}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-bold bg-tr-navy text-white px-2 py-0.5 rounded">
                            {claveEmpleado}
                          </span>
                          <span className="text-slate-600 font-semibold text-xs">
                            {expediente.puestoActual || "Operador de Reparto y Carga"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-center shadow-2xs">
                        <span className="text-slate-400 text-[10px] font-bold block uppercase">Antigüedad</span>
                        <span className="font-black text-emerald-700 text-xs">{expediente.antiguedadTexto}</span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-center shadow-2xs">
                        <span className="text-slate-400 text-[10px] font-bold block uppercase">Sucursal</span>
                        <span className="font-bold text-tr-navy text-xs">{expediente.sucursalNombre || "Sin asignar"}</span>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-center shadow-2xs">
                        <span className="text-slate-400 text-[10px] font-bold block uppercase">Tipo Contrato</span>
                        <span className="font-bold text-slate-700 text-xs">Planta / Confianza</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-tr-navy mb-3 flex items-center gap-2 border-b pb-2">
                    <div className="w-1 h-3.5 bg-tr-red rounded-xs" />
                    <User className="w-4 h-4 text-tr-navy" />
                    I. Ficha de Identidad del Empleado
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 text-[11px] block font-medium">Nombre(s)</span>
                      <span className="font-bold text-slate-800">{expediente.nombre}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block font-medium">Apellido Paterno</span>
                      <span className="font-bold text-slate-800">{expediente.apellidoPaterno}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block font-medium">Apellido Materno</span>
                      <span className="font-bold text-slate-800">{expediente.apellidoMaterno || "No registrado"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block font-medium">Teléfono Móvil</span>
                      <span className="font-bold text-slate-800">{expediente.telefono || "Sin registrar"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block font-medium">Correo Electrónico</span>
                      <span className="font-bold text-slate-800 truncate block">{expediente.email || "Sin registrar"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block font-medium">Fecha de Ingreso</span>
                      <span className="font-bold text-slate-800">{expediente.fechaIngreso || "No registrada"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block font-medium">Fecha Registro BD</span>
                      <span className="font-mono text-slate-600">{new Date(expediente.createdAt).toLocaleDateString("es-MX")}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block font-medium">Clasificación</span>
                      <span className="font-semibold text-tr-navy">Operativo / Confianza</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-tr-navy mb-3 flex items-center gap-2 border-b pb-2">
                    <div className="w-1 h-3.5 bg-tr-red rounded-xs" />
                    <Building2 className="w-4 h-4 text-tr-navy" />
                    II. Adscripción Oficial y Centro Operativo
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 text-[11px] block font-medium">Sucursal Asignada</span>
                      <span className="font-bold text-tr-navy text-sm">{expediente.sucursalNombre || "Sin asignar"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block font-medium">Código Sucursal</span>
                      <span className="font-mono font-bold text-tr-navy">{expediente.sucursalCodigo || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block font-medium">Nombre Corto / Alias</span>
                      <span className="font-semibold text-slate-800">{expediente.sucursalAlias || "N/A"}</span>
                    </div>
                  </div>
                  {expediente.sucursalesACargo && expediente.sucursalesACargo.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 text-[11px] block mb-1 font-medium">
                        Centros bajo su Responsabilidad:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {expediente.sucursalesACargo.map((suc) => (
                          <span
                            key={suc.id}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-xs font-semibold text-tr-navy"
                          >
                            <Award className="w-3.5 h-3.5 text-blue-600" />
                            {suc.nombre} ({suc.alias || suc.codigo})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-tr-navy mb-3 flex items-center justify-between border-b pb-2">
                    <span className="flex items-center gap-2">
                      <div className="w-1 h-3.5 bg-tr-red rounded-xs" />
                      <Briefcase className="w-4 h-4 text-tr-navy" />
                      III. Trayectoria y Movimientos Laborales
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {expediente.trayectoriaLaboral.length} movimiento(s)
                    </span>
                  </h3>
                  {expediente.trayectoriaLaboral.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      Sin movimientos adicionales en el historial de puestos.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {expediente.trayectoriaLaboral.map((mov, idx) => (
                        <div
                          key={mov.puestoId || idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{mov.puestoNombre}</span>
                            <span className="text-slate-600 block text-[11px] mt-0.5">
                              Motivo: {mov.motivo || mov.motivoCambio || "Asignación inicial"}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-600 font-semibold sm:text-right mt-1 sm:mt-0">
                            {mov.fechaInicio} al {mov.fechaFin ?? "Actual (Vigente)"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-tr-navy mb-3 flex items-center gap-2 border-b pb-2">
                    <div className="w-1 h-3.5 bg-tr-red rounded-xs" />
                    <Shield className="w-4 h-4 text-tr-navy" />
                    IV. Roles y Privilegios en el Sistema Operativo
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {expediente.roles.length === 0 ? (
                      <span className="text-slate-400 italic text-xs">Sin roles de acceso registrados</span>
                    ) : (
                      expediente.roles.map((r, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 border border-slate-300 font-semibold text-slate-800"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {r}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6 text-center border-b pb-2">
                    V. Constancia de Validación y Conformidad Institucional
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center pt-2">
                    <div>
                      <div className="w-48 mx-auto border-b-2 border-slate-800 pb-1 mb-2" />
                      <p className="text-xs font-bold text-slate-900">{nombreCompletoReal}</p>
                      <p className="text-[11px] text-slate-500">Firma del Colaborador — Clave: {claveEmpleado}</p>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-tr-navy flex flex-col items-center justify-center p-1 transform -rotate-6 bg-slate-50 shadow-2xs">
                        <span className="text-[6.5px] font-black text-tr-red uppercase tracking-tighter">★ ROJAS ★</span>
                        <span className="text-[6px] font-extrabold text-tr-navy leading-none">CAPITAL</span>
                        <span className="text-[6px] font-extrabold text-tr-navy leading-none">HUMANO</span>
                        <span className="text-[5.5px] font-bold text-emerald-700 mt-0.5">VALIDADO</span>
                      </div>
                    </div>
                    <div>
                      <div className="w-48 mx-auto border-b-2 border-slate-800 pb-1 mb-2" />
                      <p className="text-xs font-bold text-slate-900">Dirección de Capital Humano</p>
                      <p className="text-[11px] text-slate-500">Transportes Rojas S.A. de C.V. — Sello de Validación</p>
                    </div>
                  </div>
                </div>

                <div className="bg-tr-navy text-white rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
                  <span className="text-xs font-extrabold tracking-wider uppercase">
                    " TUS ENVÍOS, EN BUENAS MANOS "
                  </span>
                  <span className="bg-tr-red text-white text-[10px] font-bold px-2.5 py-1 rounded tracking-wide uppercase">
                    Transportes Rojas
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="cc-modal-actions bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-between">
            <button
              type="button"
              onClick={imprimirExpediente}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white border border-slate-300 text-tr-navy hover:bg-slate-50 hover:border-tr-navy rounded-lg shadow-2xs transition-all"
            >
              <Printer className="w-4 h-4 text-tr-navy" />
              <span>Imprimir Expediente Oficial</span>
            </button>
            <button
              type="button"
              className="cc-btn-cancel"
              onClick={onClose}
            >
              Cerrar Expediente
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
