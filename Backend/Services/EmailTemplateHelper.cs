namespace Backend.Services;

using System;
using System.Net;

public static class EmailTemplateHelper
{
    public static string GenerarHtmlActivacionCuenta(
        string toName,
        string toEmail,
        string passwordGenerada,
        string urlActivacion,
        string logoSrc = "cid:logo_transportes_rojas")
    {
        var encodedName = WebUtility.HtmlEncode(toName);
        var encodedEmail = WebUtility.HtmlEncode(toEmail);
        var encodedPassword = WebUtility.HtmlEncode(passwordGenerada);
        var currentYear = DateTime.UtcNow.Year;

        return $$"""
<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activa tu cuenta en Transportes Rojas</title>
  <!-- Tipografía institucional: Montserrat y Poppins -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #F7F9FB; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    @media only screen and (max-width: 640px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-header-padding { padding-top: 26px !important; padding-bottom: 22px !important; }
      .col-half { display: block !important; width: 100% !important; box-sizing: border-box !important; padding-left: 0 !important; padding-right: 0 !important; margin-bottom: 12px !important; }
      .col-step { display: block !important; width: 100% !important; box-sizing: border-box !important; padding-left: 0 !important; padding-right: 0 !important; margin-bottom: 14px !important; }
      .btn-cta { display: block !important; width: 100% !important; text-align: center !important; box-sizing: border-box !important; padding-left: 16px !important; padding-right: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 32px 10px; background-color: #F7F9FB; color: #1F2937;">

  <!-- Contenedor exterior centrado -->
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F7F9FB;">
    <tr>
      <td align="center" style="padding: 0;">

        <!-- Tarjeta principal de correo (640px ancho de escritorio para Gmail) -->
        <table role="presentation" class="email-container" width="640" border="0" cellpadding="0" cellspacing="0" style="width: 640px; max-width: 640px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(11, 45, 74, 0.08); border: 1px solid #E2E8F0;">
          
          <!-- Franja superior de marca: Azul corporativo -->
          <tr>
            <td style="background-color: #0B2D4A; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Encabezado en fondo blanco limpio (El logo se integra naturalmente sin caja recortada) -->
          <tr>
            <td align="center" class="mobile-header-padding" style="padding: 34px 30px 24px 30px; background-color: #FFFFFF; border-bottom: 1px solid #F1F5F9;">
              
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <img src="{{logoSrc}}" alt="Transportes Rojas" width="220" style="display: block; width: 220px; max-width: 220px; height: auto; margin: 0 auto;" />
                  </td>
                </tr>
              </table>

              <!-- Frase Icónica de Transportes Rojas -->
              <div style="margin-top: 10px; font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; font-weight: 800; color: #0B2D4A; letter-spacing: 2px; text-transform: uppercase;">
                &ldquo;TUS ENV&Iacute;OS, <span style="color: #D64545;">EN BUENAS MANOS</span>&rdquo;
              </div>

              <!-- Badge distintivo -->
              <div style="margin-top: 14px;">
                <span style="display: inline-block; background-color: #0B2D4A; color: #FFFFFF; font-family: 'Montserrat', Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 6px 18px; border-radius: 20px;">
                  Activaci&oacute;n de Cuenta de Usuario
                </span>
              </div>

            </td>
          </tr>

          <!-- Cuerpo principal con proporciones óptimas de escritorio -->
          <tr>
            <td class="mobile-padding" style="padding: 38px 46px 28px 46px; background-color: #FFFFFF;">
              
              <h1 style="margin: 0 0 16px 0; font-family: 'Montserrat', Arial, sans-serif; font-size: 24px; font-weight: 800; color: #0B2D4A; line-height: 1.3;">
                &iexcl;Hola, {{encodedName}}!
              </h1>

              <p style="margin: 0 0 24px 0; font-family: 'Poppins', Arial, sans-serif; font-size: 14.5px; line-height: 1.65; color: #334155;">
                Te damos la bienvenida a <strong>Transportes Rojas</strong>. Tu cuenta de acceso para la gesti&oacute;n y rastreo de env&iacute;os ha sido dada de alta exitosamente en nuestra plataforma. Utiliza las siguientes credenciales temporales para activar tu cuenta:
              </p>

              <!-- Módulo de credenciales en dos columnas (Aprovechamiento balanceado de escritorio) -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 22px 24px;">
                    
                    <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 12px; font-weight: 800; color: #0B2D4A; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px;">
                      <span style="display: inline-block; width: 4px; height: 13px; background-color: #D64545; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>
                      Credenciales Iniciales de Acceso
                    </div>

                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Columna Izquierda: Correo -->
                        <td class="col-half" width="50%" valign="top" style="padding-right: 12px;">
                          <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px;">
                            Correo de Acceso:
                          </div>
                          <div style="background-color: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 14px; font-family: 'Consolas', 'Courier New', monospace; font-size: 14px; font-weight: 700; color: #0B2D4A; word-break: break-all;">
                            {{encodedEmail}}
                          </div>
                        </td>

                        <!-- Columna Derecha: Contraseña temporal -->
                        <td class="col-half" width="50%" valign="top" style="padding-left: 12px;">
                          <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px;">
                            Contrase&ntilde;a Temporal:
                          </div>
                          <div style="background-color: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 14px; font-family: 'Consolas', 'Courier New', monospace; font-size: 15px; font-weight: 800; color: #D64545; letter-spacing: 1.5px;">
                            {{encodedPassword}}
                          </div>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Botón de Llamado a la Acción (CTA) Central -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="border-radius: 10px; background-color: #D64545;">
                          <a href="{{urlActivacion}}" target="_blank" class="btn-cta" style="font-family: 'Montserrat', Arial, sans-serif; font-size: 15px; font-weight: 800; color: #FFFFFF; text-decoration: none; padding: 16px 42px; display: inline-block; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.8px; box-shadow: 0 4px 14px rgba(214, 69, 69, 0.35);">
                            Activar mi Cuenta Ahora &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                    <div style="font-family: 'Poppins', Arial, sans-serif; font-size: 12px; color: #64748B; margin-top: 10px;">
                      &#9201; Enlace de acceso seguro v&aacute;lido durante <strong>48 horas</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Guía de 3 Pasos Informativos (Estructura amplia para escritorio) -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border-radius: 12px; border: 1px solid #EDF2F7; margin-bottom: 26px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 11.5px; font-weight: 800; color: #0B2D4A; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 12px;">
                      Pasos para completar tu registro:
                    </div>

                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td class="col-step" width="33.33%" valign="top" style="padding-right: 10px;">
                          <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; font-weight: 700; color: #D64545; margin-bottom: 4px;">1. Activa tu cuenta</div>
                          <div style="font-family: 'Poppins', Arial, sans-serif; font-size: 12px; color: #475569; line-height: 1.45;">
                            Haz clic en el bot&oacute;n superior para validar tu correo.
                          </div>
                        </td>
                        <td class="col-step" width="33.33%" valign="top" style="padding-right: 10px; padding-left: 5px;">
                          <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; font-weight: 700; color: #0B2D4A; margin-bottom: 4px;">2. Define tu clave</div>
                          <div style="font-family: 'Poppins', Arial, sans-serif; font-size: 12px; color: #475569; line-height: 1.45;">
                            Crea tu contrase&ntilde;a definitiva personal de alta seguridad.
                          </div>
                        </td>
                        <td class="col-step" width="33.33%" valign="top" style="padding-left: 5px;">
                          <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; font-weight: 700; color: #0B2D4A; margin-bottom: 4px;">3. Gestiona env&iacute;os</div>
                          <div style="font-family: 'Poppins', Arial, sans-serif; font-size: 12px; color: #475569; line-height: 1.45;">
                            Cotiza, genera gu&iacute;as y da seguimiento en tiempo real.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Nota de Seguridad -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #EFF6FF; border-left: 4px solid #0B2D4A; border-radius: 6px; margin-bottom: 22px;">
                <tr>
                  <td style="padding: 14px 18px; font-family: 'Poppins', Arial, sans-serif; font-size: 12.5px; color: #1E293B; line-height: 1.55;">
                    <strong style="color: #0B2D4A;">Recomendaci&oacute;n de seguridad:</strong> Tu contrase&ntilde;a definitiva debe contener al menos 12 caracteres, may&uacute;sculas no consecutivas, min&uacute;sculas, n&uacute;meros y un car&aacute;cter especial. Transportes Rojas nunca te solicitar&aacute; tu contrase&ntilde;a por tel&eacute;fono ni por mensajer&iacute;a.
                  </td>
                </tr>
              </table>

              <!-- Enlace alternativo de respaldo -->
              <p style="margin: 0; font-family: 'Poppins', Arial, sans-serif; font-size: 12px; color: #64748B; line-height: 1.55;">
                Si el bot&oacute;n no abre autom&aacute;ticamente, copia y pega el siguiente enlace directo en tu navegador web:<br>
                <a href="{{urlActivacion}}" style="color: #0B2D4A; font-weight: 600; word-break: break-all; text-decoration: underline;">{{urlActivacion}}</a>
              </p>

            </td>
          </tr>

          <!-- Pie de correo institucional (Manual de Marca) -->
          <tr>
            <td align="center" style="background-color: #0B2D4A; padding: 32px 30px; border-top: 3px solid #D64545;">
              
              <!-- Frase icónica de Transportes Rojas -->
              <div style="font-family: 'Montserrat', Arial, sans-serif; font-size: 13px; font-weight: 700; color: #FFFFFF; letter-spacing: 1.8px; text-transform: uppercase; margin-bottom: 12px;">
                &ldquo;TUS ENV&Iacute;OS, <span style="color: #F87171;">EN BUENAS MANOS</span>&rdquo;
              </div>

              <!-- Divisor decorativo -->
              <div style="width: 50px; height: 2px; background-color: #D64545; margin: 0 auto 14px auto;"></div>

              <!-- Información corporativa -->
              <div style="font-family: 'Poppins', Arial, sans-serif; font-size: 12px; color: #A7B3C3; line-height: 1.65; max-width: 500px;">
                <strong>Transportes Rojas S.A. de C.V.</strong><br>
                Soluciones log&iacute;sticas y paqueter&iacute;a de alta confianza &bull; Culiac&aacute;n, Sinaloa, M&eacute;xico.<br>
                &copy; {{currentYear}} Todos los derechos reservados.
              </div>

            </td>
          </tr>

        </table>
        <!-- Fin Tarjeta Principal -->

      </td>
    </tr>
  </table>

</body>
</html>
""";
    }
}
