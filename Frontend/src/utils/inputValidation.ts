import type React from "react";

const TECLAS_CONTROL = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "Enter",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

export function limpiarSoloDigitos(valor: string, maxLength?: number): string {
  const soloDigitos = valor.replace(/\D/g, "");
  return maxLength !== undefined ? soloDigitos.slice(0, maxLength) : soloDigitos;
}

export function limpiarEnteroPositivo(valor: string, maxLength?: number): string {
  return limpiarSoloDigitos(valor, maxLength);
}

export function limpiarNombreSinNumeros(valor: string): string {
  return valor.replace(/\d/g, "");
}

export function contieneNumeros(valor?: string | null): boolean {
  return Boolean(valor && /\d/.test(valor));
}

export function validarNombresPersona(campos: {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
}): string | null {
  if (!campos.nombre.trim()) return "El nombre es obligatorio.";
  if (contieneNumeros(campos.nombre)) return "El nombre no debe contener números.";
  if (!campos.apellidoPaterno.trim()) return "El apellido paterno es obligatorio.";
  if (contieneNumeros(campos.apellidoPaterno)) {
    return "El apellido paterno no debe contener números.";
  }
  if (contieneNumeros(campos.apellidoMaterno)) {
    return "El apellido materno no debe contener números.";
  }
  return null;
}

export function bloquearTeclasNumericas(
  e: React.KeyboardEvent<HTMLInputElement>
): void {
  if (e.ctrlKey || e.metaKey || e.altKey || TECLAS_CONTROL.has(e.key)) {
    return;
  }

  if (/^\d$/.test(e.key)) {
    e.preventDefault();
  }
}

export function limpiarDecimalPositivo(valor: string, maxDecimales = 2): string {
  const sinInvalidos = valor.replace(/[^0-9.]/g, "");
  const indicePunto = sinInvalidos.indexOf(".");
  if (indicePunto === -1) return sinInvalidos;

  const entero = sinInvalidos.slice(0, indicePunto);
  const decimales = sinInvalidos
    .slice(indicePunto + 1)
    .replace(/\./g, "")
    .slice(0, maxDecimales);

  return `${entero}.${decimales}`;
}

export function bloquearTeclasNoNumericas(
  e: React.KeyboardEvent<HTMLInputElement>,
  permitirDecimal = false
): void {
  if (e.ctrlKey || e.metaKey || e.altKey || TECLAS_CONTROL.has(e.key)) {
    return;
  }

  if (/^\d$/.test(e.key)) {
    return;
  }

  if (permitirDecimal && e.key === ".") {
    const input = e.currentTarget;
    const tieneSeleccionCompleta =
      input.selectionStart !== null &&
      input.selectionEnd !== null &&
      input.selectionStart !== input.selectionEnd;
    if (!input.value.includes(".") || tieneSeleccionCompleta) {
      return;
    }
  }

  e.preventDefault();
}

export function formatearNumeroExterior(numeroExterior?: string | null): string | null {
  const limpio = (numeroExterior || "").trim();
  if (!limpio) return null;
  if (/^(s\/?n|sin\s*n[uú]mero)$/i.test(limpio)) {
    return "S/N";
  }
  return `#${limpio}`;
}

