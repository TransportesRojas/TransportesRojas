-- Limpieza de datos operativos y reinicio de identidad

BEGIN;

-- Truncar tablas operativas preservando catálogos base
TRUNCATE TABLE
    queja_seguimiento,
    queja,
    evaluacion,
    reprogramacion,
    incidencia,
    telemetria_unidad,
    alerta,
    cancelacion,
    reclamacion,
    devolucion,
    cambio_ruta,
    entrega,
    ruta_envio,
    ruta,
    cita_recoleccion,
    aviso_sms,
    recepcion_paquete,
    evento_envio,
    envio,
    mantenimiento,
    alerta_mantenimiento,
    asignacion_flotilla_chofer,
    unidad,
    flotilla,
    horario_sucursal,
    cliente_direccion,
    cliente,
    usuario_estado_historial,
    empleado_puesto_historial,
    empleado,
    usuario_rol,
    usuario,
    sucursal_cobertura,
    sucursal,
    direccion
RESTART IDENTITY CASCADE;

-- Restauración de cuentas base (clave DepR6670000000)
WITH cuentas AS (
  SELECT * FROM (VALUES
    ('jefe@transportesrojas.test',
     'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==',
     'Jefe', 'Gerente General', 'Ricardo', 'Rojas', 'Medina', '6672450918')
  ) AS t(email, password_hash, rol, puesto, nombre, ap_paterno, ap_materno, telefono)
),
nuevos_usuarios AS (
  INSERT INTO usuario (email, password_hash, tipo_usuario)
  SELECT c.email, c.password_hash, 'empleado' FROM cuentas c
  RETURNING id, email
),
roles_asignados AS (
  INSERT INTO usuario_rol (usuario_id, rol_id)
  SELECT nu.id, r.id
  FROM nuevos_usuarios nu
  JOIN cuentas c ON c.email = nu.email
  JOIN rol r     ON r.nombre = c.rol
  RETURNING usuario_id
),
nuevos_empleados AS (
  INSERT INTO empleado (usuario_id, nombre, apellido_paterno, apellido_materno, telefono, email, fecha_ingreso)
  SELECT nu.id, c.nombre, c.ap_paterno, c.ap_materno, c.telefono, c.email, (NOW() AT TIME ZONE 'America/Mazatlan')::date
  FROM nuevos_usuarios nu
  JOIN cuentas c ON c.email = nu.email
  RETURNING id, email
)
INSERT INTO empleado_puesto_historial (empleado_id, puesto_id, fecha_inicio, motivo)
SELECT ne.id, p.id, (NOW() AT TIME ZONE 'America/Mazatlan')::date, 'Alta inicial'
FROM nuevos_empleados ne
JOIN cuentas c ON c.email = ne.email
JOIN puesto p  ON p.nombre = c.puesto;

COMMIT;

