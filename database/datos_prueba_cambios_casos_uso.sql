-- Datos de prueba y matriz de permisos (clave DepR6670000000)

ROLLBACK;

BEGIN;

-- Catálogos base
INSERT INTO rol (nombre, descripcion) VALUES
('RH',                      'Recursos Humanos'),
('Supervisor',              'Supervisor de operaciones'),
('Jefe de flotilla',        'Planificación de rutas y monitoreo'),
('Chofer',                  'Operador de unidad'),
('Personal administrativo', 'Registro y atención al cliente'),
('Personal de sucursal',    'Recepción de paquetes en sucursal'),
('Jefe',                    'Máxima autoridad corporativa, asigna roles y supervisa RH')
ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

INSERT INTO puesto (nombre, descripcion) VALUES
('Chofer',               'Conductor de unidad de reparto'),
('Supervisor',           'Supervisión de operaciones'),
('Jefe de flotilla',     'Planeación y monitoreo de rutas'),
('Atención a clientes',  'Call center y soporte'),
('Recursos Humanos',     'Gestión de personal'),
('Administrativo',       'Registro de clientes y envíos'),
('Personal de sucursal', 'Recepción física de paquetes'),
('Gerente General',      'Dirección y máxima autoridad de la empresa')
ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

INSERT INTO tipo_mantenimiento (nombre, descripcion, km_intervalo, activo, created_at, updated_at) VALUES
('Cambio de aceite',       'Cambio de aceite y filtro',                 10000, true, NOW(), NOW()),
('Rotación de neumáticos', 'Rotación e inspección de neumáticos',         8000, true, NOW(), NOW()),
('Revisión de frenos',     'Inspección y ajuste del sistema de frenos', 20000, true, NOW(), NOW()),
('Cambio de filtros',      'Cambio de filtro de aire y combustible',    15000, true, NOW(), NOW()),
('Servicio mayor',         'Servicio mayor de mantenimiento',           50000, true, NOW(), NOW())
ON CONFLICT (nombre) DO UPDATE SET km_intervalo = EXCLUDED.km_intervalo, updated_at = EXCLUDED.updated_at;


-- Direcciones y sucursales

INSERT INTO direccion (
    id, calle, numero_exterior, numero_interior, entre_calles,
    colonia, localidad, municipio, estado, pais, codigo_postal,
    referencias, latitud, longitud, metadata, activo, created_at, updated_at
)
OVERRIDING SYSTEM VALUE VALUES
(1, 'Av. Álvaro Obregón', '450', 'Local A', 'Entre Ángel Flores e Hidalgo',
 'Centro', 'Culiacán Rosales', 'Culiacán', 'Sinaloa', 'México', '80000',
 'Edificio corporativo Transportes Rojas Matriz', 24.8049100, -107.3940100, '{"tipo":"matriz"}'::jsonb, true, NOW(), NOW()),

(2, 'Blvd. Emiliano Zapata', '2150', 'Bodega 4', 'Entre Av. Aztlán y Calzada Aeropuerto',
 'Industrial El Palmito', 'Culiacán Rosales', 'Culiacán', 'Sinaloa', 'México', '80100',
 'Centro Operativo y Patio de Maniobras', 24.7824500, -107.4281500, '{"tipo":"patio"}'::jsonb, true, NOW(), NOW()),

(3, 'Av. Ejército Mexicano', '1200', NULL, 'Entre Aquiles Serdán y Gutiérrez Nájera',
 'Centro', 'Mazatlán', 'Mazatlán', 'Sinaloa', 'México', '82000',
 'Sucursal regional Mazatlán', 23.2165200, -106.4163200, '{"tipo":"sucursal"}'::jsonb, true, NOW(), NOW()),

(4, 'Blvd. Rosendo G. Castro', '845', 'PB', 'Entre Guillermo Prieto e Ignacio Zaragoza',
 'Centro', 'Los Mochis', 'Ahome', 'Sinaloa', 'México', '81200',
 'Sucursal regional Los Mochis', 25.7904600, -108.9930500, '{"tipo":"sucursal"}'::jsonb, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    calle = EXCLUDED.calle,
    numero_exterior = EXCLUDED.numero_exterior,
    colonia = EXCLUDED.colonia,
    municipio = EXCLUDED.municipio,
    estado = EXCLUDED.estado,
    codigo_postal = EXCLUDED.codigo_postal;

INSERT INTO sucursal (
    id, nombre, nombre_corto, codigo, direccion_id, responsable_id,
    telefono, email, cobertura, activo, created_at, updated_at
)
OVERRIDING SYSTEM VALUE VALUES
(1, 'Sucursal Matriz Culiacán Centro',    'Culiacán Centro',   'SUC-CUL-01', 1, NULL, '6677123400', 'matriz.culiacan@transportesrojas.mx',   'Culiacán Centro, Tres Ríos y zona urbana', true, NOW(), NOW()),
(2, 'Centro Operativo Culiacán Poniente', 'Culiacán Poniente', 'SUC-CUL-02', 2, NULL, '6677158890', 'poniente.culiacan@transportesrojas.mx', 'Zona Industrial El Palmito y Aeropuerto', true, NOW(), NOW()),
(3, 'Sucursal Regional Mazatlán',         'Mazatlán',          'SUC-MAZ-01', 3, NULL, '6699814420', 'mazatlan@transportesrojas.mx',          'Mazatlán y zona turística',                true, NOW(), NOW()),
(4, 'Sucursal Regional Los Mochis',       'Los Mochis',        'SUC-LMM-01', 4, NULL, '6688129910', 'losmochis@transportesrojas.mx',         'Los Mochis y corredor norte',              true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    nombre_corto = EXCLUDED.nombre_corto,
    codigo = EXCLUDED.codigo,
    direccion_id = EXCLUDED.direccion_id,
    telefono = EXCLUDED.telefono,
    email = EXCLUDED.email;


-- Permisos y matriz por rol

INSERT INTO permiso (codigo, nombre, modulo, descripcion, created_at)
SELECT v.codigo, v.nombre, v.modulo, v.descripcion, NOW()
FROM (VALUES
('cliente.registrar',            'Registrar cliente',                   'clientes',      'Alta de clientes'),
('cliente.consultar',            'Consultar cliente',                   'clientes',      'Consulta de clientes'),
('cliente.editar',               'Editar cliente',                      'clientes',      'Modificación de datos de cliente'),
('cliente.desactivar',           'Desactivar cliente',                  'clientes',      'Baja lógica de cuenta de cliente'),
('servicio.calificar',           'Calificar servicio',                  'clientes',      'Opinión del destinatario sobre la entrega'),
('empleado.registrar',           'Registrar empleado',                  'rh',            'Alta de empleados con rol y acceso'),
('empleado.consultar',           'Consultar empleado',                  'rh',            'Consulta de expediente e historial laboral'),
('empleado.editar',              'Editar empleado',                     'rh',            'Modificación de expediente laboral'),
('empleado.desactivar',          'Desactivar empleado',                 'rh',            'Baja lógica del empleado'),
('empleado.cambiar_rol',         'Cambiar rol de empleado',             'rh',            'Actualización de roles y permisos'),
('empleado.suspender_acceso',    'Suspender acceso',                    'rh',            'Suspensión temporal de un acceso (CU-05)'),
('empleado.desactivar_acceso',   'Desactivar acceso',                   'rh',            'Baja definitiva de un acceso (CU-06)'),
('empleado.reactivar_acceso',    'Reactivar acceso',                    'rh',            'Reactivación de accesos suspendidos (CU-07)'),
('puesto.administrar',           'Administrar puestos',                 'rh',            'Alta, edición y baja de puestos'),
('puesto.consultar',             'Consultar puestos',                   'rh',            'Consulta de puestos laborales'),
('sesion.iniciar',               'Iniciar sesión',                      'seguridad',     'Autenticación en el sistema'),
('rol.administrar',              'Administrar roles',                   'seguridad',     'Alta, edición y baja de roles'),
('rol.consultar',                'Consultar roles',                     'seguridad',     'Consulta de roles y sus permisos'),
('permiso.consultar',            'Consultar permisos',                  'seguridad',     'Consulta del catálogo de permisos'),
('usuario.consultar',            'Consultar usuario',                   'seguridad',     'Consulta de cuentas de usuario'),
('usuario.editar',               'Editar usuario',                      'seguridad',     'Modificación de datos de cuenta'),
('sucursal.registrar',           'Registrar sucursal',                  'sucursales',    'Alta de sucursales'),
('sucursal.consultar',           'Consultar sucursal',                  'sucursales',    'Consulta de sucursales'),
('sucursal.editar',              'Editar sucursal',                     'sucursales',    'Modificación de datos de sucursal'),
('sucursal.desactivar',          'Desactivar sucursal',                 'sucursales',    'Baja lógica de sucursal'),
('flotilla.registrar',           'Registrar flotilla',                  'flotillas',     'Alta de flotillas'),
('flotilla.consultar',           'Consultar flotilla',                  'flotillas',     'Consulta de flotillas registradas'),
('flotilla.editar',              'Editar flotilla',                     'flotillas',     'Modificación de datos de flotilla'),
('flotilla.desactivar',          'Desactivar flotilla',                 'flotillas',     'Baja lógica de flotilla'),
('flotilla.asignar_chofer',      'Asignar chofer a flotilla',           'flotillas',     'Vinculación de choferes a flotillas'),
('unidad.registrar',             'Registrar unidad',                    'unidades',      'Alta de unidades de transporte'),
('unidad.consultar',             'Consultar unidad',                    'unidades',      'Consulta de unidades registradas'),
('unidad.editar',                'Editar unidad',                       'unidades',      'Modificación de datos de unidad'),
('unidad.desactivar',            'Desactivar unidad',                   'unidades',      'Baja lógica de unidad'),
('unidad.asignar_flotilla',      'Asignar unidad a flotilla',           'unidades',      'Vinculación de unidades a flotillas'),
('ruta.planificar',              'Planificar ruta',                     'rutas',         'Organización de itinerarios de entrega (CU-22)'),
('ruta.asignar_recursos',        'Asignar recursos a ruta',             'rutas',         'Asignar chofer y unidad a una ruta (CU-23)'),
('ruta.iniciar_recorrido',       'Iniciar recorrido',                   'rutas',         'Inicio de la ejecución de una ruta (CU-25)'),
('cambio_ruta.registrar',        'Notificar cambio de ruta',            'rutas',         'Registro manual de cambio de trayecto (CU-26)'),
('cambio_ruta.consultar',        'Consultar cambios de ruta',           'rutas',         'Consulta de reportes de cambio de ruta'),
('alerta.recibir',               'Recibir alertas de ruta',             'alertas',       'Recepción de notificaciones de ruta'),
('alerta.consultar_historial',   'Consultar historial de alertas',      'alertas',       'Consulta de alertas registradas'),
('mantenimiento.registrar',      'Registrar mantenimiento',             'mantenimiento', 'Alta de mantenimientos realizados'),
('mantenimiento.consultar',      'Consultar mantenimiento',             'mantenimiento', 'Consulta de historial y próximo mantenimiento'),
('tipo_mantenimiento.administrar','Administrar tipos de mantenimiento', 'mantenimiento', 'Alta y edición de tipos de mantenimiento'),
('tipo_mantenimiento.consultar', 'Consultar tipos de mantenimiento',    'mantenimiento', 'Consulta del catálogo de tipos'),
('alerta.mantenimiento_recibir', 'Recibir alertas de mantenimiento',    'mantenimiento', 'Recepción exclusiva de alertas por km'),
('envio.registrar',              'Registrar envío',                     'envios',        'Alta de envíos y generación de guía'),
('envio.recepcion_sucursal',     'Registrar recepción en sucursal',     'envios',        'Confirmación física de un paquete'),
('envio.cancelar',               'Cancelar envío',                      'envios',        'Cancelación de un envío (CU-30)'),
('envio.reprogramar',            'Reprogramar entrega',                 'envios',        'Nueva fecha de entrega tras incidencia (CU-27, CU-32)'),
('envio.rastrear',               'Rastrear envío',                      'envios',        'Consulta de estado y ubicación'),
('envio.asignar_flotilla',       'Asignar envíos a flotilla',           'envios',        'Asignación en lote de envíos a flotillas (CU-21)'),
('envio.validar_entrega',        'Validar entrega',                     'entregas',      'Cierre de entrega con PIN dinámico (CU-28, CU-29)'),
('envio.devolucion_registrar',   'Registrar devolución',                'devoluciones',  'Documentación del retorno de un paquete (CU-31)'),
('envio.devolucion_confirmar',   'Confirmar recepción de devolución',   'devoluciones',  'Recepción del paquete devuelto en sucursal'),
('incidencia.reportar',          'Reportar incidencia',                 'incidencias',   'Documentación de incidencias en campo'),
('queja.registrar',              'Registrar queja',                     'quejas',        'Alta de inconformidades'),
('queja.atender',                'Atender queja',                       'quejas',        'Seguimiento y cierre de quejas')
) AS v(codigo, nombre, modulo, descripcion)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    modulo = EXCLUDED.modulo,
    descripcion = EXCLUDED.descripcion;

-- Asignación exacta de permisos a roles
DELETE FROM rol_permiso;

-- RH
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
WHERE r.nombre = 'RH'
  AND p.codigo IN (
    'sesion.iniciar',
    'empleado.registrar','empleado.consultar','empleado.editar','empleado.desactivar','empleado.cambiar_rol',
    'empleado.suspender_acceso','empleado.desactivar_acceso','empleado.reactivar_acceso',
    'puesto.administrar','puesto.consultar',
    'rol.administrar','rol.consultar','permiso.consultar','usuario.consultar','usuario.editar',
    'sucursal.registrar','sucursal.consultar','sucursal.editar','sucursal.desactivar',
    'cliente.registrar','cliente.consultar',
    'flotilla.consultar','unidad.consultar',
    'mantenimiento.registrar','mantenimiento.consultar','tipo_mantenimiento.administrar','tipo_mantenimiento.consultar',
    'alerta.consultar_historial','cambio_ruta.consultar'
  );

-- Supervisor
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
WHERE r.nombre = 'Supervisor'
  AND p.codigo IN (
    'sesion.iniciar',
    'flotilla.registrar','flotilla.consultar','flotilla.editar','flotilla.desactivar','flotilla.asignar_chofer',
    'unidad.registrar','unidad.consultar','unidad.editar','unidad.desactivar','unidad.asignar_flotilla',
    'envio.rastrear','envio.asignar_flotilla',
    'ruta.asignar_recursos','cambio_ruta.consultar',
    'mantenimiento.registrar','mantenimiento.consultar','tipo_mantenimiento.administrar','tipo_mantenimiento.consultar',
    'sucursal.consultar','puesto.consultar','cliente.consultar','empleado.consultar'
  );

-- Jefe de flotilla
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
WHERE r.nombre = 'Jefe de flotilla'
  AND p.codigo IN (
    'sesion.iniciar',
    'ruta.planificar','ruta.asignar_recursos','cambio_ruta.consultar',
    'flotilla.consultar','unidad.consultar',
    'envio.rastrear','envio.asignar_flotilla',
    'alerta.recibir','alerta.consultar_historial','alerta.mantenimiento_recibir',
    'mantenimiento.consultar','tipo_mantenimiento.consultar',
    'sucursal.consultar','cliente.consultar','empleado.consultar'
  );

-- Chofer
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
WHERE r.nombre = 'Chofer'
  AND p.codigo IN (
    'sesion.iniciar',
    'ruta.iniciar_recorrido',
    'cambio_ruta.registrar',
    'envio.validar_entrega',
    'envio.reprogramar',
    'envio.devolucion_registrar',
    'incidencia.reportar',
    'cliente.consultar',
    'unidad.consultar'
  );

-- Personal administrativo
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
WHERE r.nombre = 'Personal administrativo'
  AND p.codigo IN (
    'sesion.iniciar',
    'cliente.registrar','cliente.consultar','cliente.editar','cliente.desactivar',
    'envio.registrar','envio.rastrear','envio.reprogramar','envio.cancelar',
    'sucursal.consultar','usuario.consultar','usuario.editar','queja.atender'
  );

-- Personal de sucursal
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
WHERE r.nombre = 'Personal de sucursal'
  AND p.codigo IN (
    'sesion.iniciar',
    'envio.recepcion_sucursal','envio.rastrear','envio.devolucion_registrar','envio.devolucion_confirmar',
    'sucursal.consultar','cliente.consultar'
  );

-- Jefe
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
WHERE r.nombre = 'Jefe'
  AND p.codigo IN (
    'sesion.iniciar',
    'cliente.registrar','cliente.consultar','cliente.editar','cliente.desactivar',
    'empleado.registrar','empleado.consultar','empleado.editar','empleado.desactivar','empleado.cambiar_rol',
    'empleado.suspender_acceso','empleado.desactivar_acceso','empleado.reactivar_acceso',
    'puesto.administrar','puesto.consultar',
    'rol.administrar','rol.consultar','permiso.consultar','usuario.consultar','usuario.editar',
    'sucursal.registrar','sucursal.consultar','sucursal.editar','sucursal.desactivar',
    'flotilla.consultar','unidad.consultar',
    'ruta.planificar','ruta.asignar_recursos','cambio_ruta.consultar',
    'envio.registrar','envio.rastrear','envio.asignar_flotilla','envio.cancelar','envio.reprogramar',
    'mantenimiento.consultar','tipo_mantenimiento.consultar','alerta.consultar_historial','queja.atender'
  );


-- Limpieza de datos de prueba
DELETE FROM entrega WHERE envio_id >= 9000 OR chofer_id >= 9000;
DELETE FROM devolucion WHERE envio_id >= 9000;
DELETE FROM aviso_sms WHERE envio_id >= 9000;
DELETE FROM evento_envio WHERE envio_id >= 9000;
DELETE FROM ruta_envio WHERE envio_id >= 9000 OR ruta_id >= 9000;
DELETE FROM ruta WHERE id >= 9000 OR chofer_id >= 9000;
DELETE FROM envio WHERE id >= 9000;
DELETE FROM asignacion_flotilla_chofer WHERE flotilla_id >= 9000 OR chofer_id >= 9000;
DELETE FROM unidad WHERE id >= 9000;
DELETE FROM flotilla WHERE id >= 9000;
DELETE FROM cliente_direccion WHERE cliente_id >= 9000;
DELETE FROM cliente WHERE id >= 9000;
DELETE FROM usuario_estado_historial WHERE usuario_id >= 9000;
DELETE FROM empleado_puesto_historial WHERE empleado_id >= 9000;
DELETE FROM usuario_rol WHERE usuario_id >= 9000;
DELETE FROM empleado WHERE id >= 9000;
DELETE FROM usuario WHERE id >= 9000;


-- Usuarios administrativos (IDs 9010 a 9015)

INSERT INTO usuario (id, email, password_hash, tipo_usuario, activo, ultimo_acceso, created_at, updated_at)
OVERRIDING SYSTEM VALUE VALUES
(9010, 'rh@transportesrojas.mx',          'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW(), NOW() - INTERVAL '30 days', NOW()),
(9011, 'supervisor@transportesrojas.mx',  'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW(), NOW() - INTERVAL '30 days', NOW()),
(9012, 'jefeflotilla@transportesrojas.mx','AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW(), NOW() - INTERVAL '30 days', NOW()),
(9013, 'admin@transportesrojas.mx',        'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW(), NOW() - INTERVAL '30 days', NOW()),
(9014, 'sucursal@transportesrojas.mx',     'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW(), NOW() - INTERVAL '30 days', NOW()),
(9015, 'jefe@transportesrojas.mx',         'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW(), NOW() - INTERVAL '30 days', NOW());

INSERT INTO empleado (id, usuario_id, sucursal_id, nombre, apellido_paterno, apellido_materno, telefono, email, fecha_ingreso, activo, created_at, updated_at)
OVERRIDING SYSTEM VALUE VALUES
(9010, 9010, 1, 'Lorena',   'Gutiérrez', 'Mora',     '6677901010', 'rh@transportesrojas.mx',           CURRENT_DATE - 90, true, NOW(), NOW()),
(9011, 9011, 1, 'Carlos',   'Mendoza',   'Zepeda',   '6677901111', 'supervisor@transportesrojas.mx',   CURRENT_DATE - 90, true, NOW(), NOW()),
(9012, 9012, 1, 'Marco',    'Gaxiola',   'Leyva',    '6677901212', 'jefeflotilla@transportesrojas.mx', CURRENT_DATE - 90, true, NOW(), NOW()),
(9013, 9013, 1, 'Patricia', 'Quintero',  'Castro',   '6677901313', 'admin@transportesrojas.mx',         CURRENT_DATE - 90, true, NOW(), NOW()),
(9014, 9014, 1, 'Óscar',    'Miranda',   'Salas',    '6677901414', 'sucursal@transportesrojas.mx',      CURRENT_DATE - 90, true, NOW(), NOW()),
(9015, 9015, 1, 'Ricardo',  'Rojas',     'Medina',   '6677901515', 'jefe@transportesrojas.mx',          CURRENT_DATE - 120, true, NOW(), NOW());

INSERT INTO usuario_rol (usuario_id, rol_id) VALUES
(9010, (SELECT id FROM rol WHERE nombre = 'RH' LIMIT 1)),
(9011, (SELECT id FROM rol WHERE nombre = 'Supervisor' LIMIT 1)),
(9012, (SELECT id FROM rol WHERE nombre = 'Jefe de flotilla' LIMIT 1)),
(9013, (SELECT id FROM rol WHERE nombre = 'Personal administrativo' LIMIT 1)),
(9014, (SELECT id FROM rol WHERE nombre = 'Personal de sucursal' LIMIT 1)),
(9015, (SELECT id FROM rol WHERE nombre = 'Jefe' LIMIT 1));

INSERT INTO empleado_puesto_historial (empleado_id, puesto_id, fecha_inicio, motivo, created_at) VALUES
(9010, (SELECT id FROM puesto WHERE nombre = 'Recursos Humanos' LIMIT 1),     CURRENT_DATE - 90, 'Alta RH', NOW()),
(9011, (SELECT id FROM puesto WHERE nombre = 'Supervisor' LIMIT 1),           CURRENT_DATE - 90, 'Alta Supervisor', NOW()),
(9012, (SELECT id FROM puesto WHERE nombre = 'Jefe de flotilla' LIMIT 1),     CURRENT_DATE - 90, 'Alta Jefe Flotilla', NOW()),
(9013, (SELECT id FROM puesto WHERE nombre = 'Administrativo' LIMIT 1),       CURRENT_DATE - 90, 'Alta Administrativo', NOW()),
(9014, (SELECT id FROM puesto WHERE nombre = 'Personal de sucursal' LIMIT 1), CURRENT_DATE - 90, 'Alta Sucursal', NOW()),
(9015, (SELECT id FROM puesto WHERE nombre = 'Gerente General' LIMIT 1),      CURRENT_DATE - 120, 'Alta Gerencia', NOW());

INSERT INTO usuario_estado_historial (usuario_id, estado, motivo, fecha_inicio, fecha_fin, registrado_por) VALUES
(9010, 'activo', 'Alta cuenta RH', NOW(), NULL, NULL),
(9011, 'activo', 'Alta cuenta Supervisor', NOW(), NULL, NULL),
(9012, 'activo', 'Alta cuenta Jefe Flotilla', NOW(), NULL, NULL),
(9013, 'activo', 'Alta cuenta Administrativo', NOW(), NULL, NULL),
(9014, 'activo', 'Alta cuenta Sucursal', NOW(), NULL, NULL),
(9015, 'activo', 'Alta cuenta Gerencia', NOW(), NULL, NULL);


-- Usuarios y empleados de escenarios de prueba

INSERT INTO usuario (id, email, password_hash, tipo_usuario, activo, ultimo_acceso, created_at, updated_at)
OVERRIDING SYSTEM VALUE VALUES
-- Primer ingreso pendiente de cambio de clave
(9001, 'primer.ingreso@transportesrojas.mx',      'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true,  NULL, NOW(), NOW()),
-- Chofer en reparto
(9002, 'chofer.reparto@transportesrojas.mx',      'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true,  NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 days', NOW()),
-- Chofer con ruta planeada
(9003, 'chofer.conrutas@transportesrojas.mx',     'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true,  NOW() - INTERVAL '2 hours', NOW() - INTERVAL '20 days', NOW()),
-- Acceso suspendido
(9004, 'empleado.suspendido@transportesrojas.mx', 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true,  NOW() - INTERVAL '5 days', NOW() - INTERVAL '40 days', NOW()),
-- Baja definitiva
(9005, 'empleado.baja@transportesrojas.mx',        'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', false, NOW() - INTERVAL '30 days', NOW() - INTERVAL '60 days', NOW());

INSERT INTO empleado (id, usuario_id, sucursal_id, nombre, apellido_paterno, apellido_materno, telefono, email, fecha_ingreso, activo, created_at, updated_at)
OVERRIDING SYSTEM VALUE VALUES
(9001, 9001, 1, 'Ana Laura',     'Zazueta',   'Valenzuela', '6677900101', 'primer.ingreso@transportesrojas.mx',      CURRENT_DATE,     true,  NOW(), NOW()),
(9002, 9002, 1, 'Mateo',         'Carrillo',  'García',     '6677900202', 'chofer.reparto@transportesrojas.mx',      CURRENT_DATE - 30, true,  NOW(), NOW()),
(9003, 9003, 1, 'Esteban',       'López',     'Quinonez',   '6677900303', 'chofer.conrutas@transportesrojas.mx',     CURRENT_DATE - 20, true,  NOW(), NOW()),
(9004, 9004, 1, 'Héctor',        'Beltrán',   'Ochoa',      '6677900404', 'empleado.suspendido@transportesrojas.mx', CURRENT_DATE - 40, true,  NOW(), NOW()),
(9005, 9005, 1, 'Ramón',         'Navarro',   'Pérez',      '6677900505', 'empleado.baja@transportesrojas.mx',        CURRENT_DATE - 60, false, NOW(), NOW());

INSERT INTO usuario_rol (usuario_id, rol_id) VALUES
(9001, (SELECT id FROM rol WHERE nombre = 'Personal administrativo' LIMIT 1)),
(9002, (SELECT id FROM rol WHERE nombre = 'Chofer' LIMIT 1)),
(9003, (SELECT id FROM rol WHERE nombre = 'Chofer' LIMIT 1)),
(9004, (SELECT id FROM rol WHERE nombre = 'Personal de sucursal' LIMIT 1)),
(9005, (SELECT id FROM rol WHERE nombre = 'Chofer' LIMIT 1));

INSERT INTO empleado_puesto_historial (empleado_id, puesto_id, fecha_inicio, motivo, created_at) VALUES
(9001, (SELECT id FROM puesto WHERE nombre = 'Administrativo' LIMIT 1),       CURRENT_DATE,      'Contratación inicial', NOW()),
(9002, (SELECT id FROM puesto WHERE nombre = 'Chofer' LIMIT 1),               CURRENT_DATE - 30, 'Alta chofer reparto local', NOW()),
(9003, (SELECT id FROM puesto WHERE nombre = 'Chofer' LIMIT 1),               CURRENT_DATE - 20, 'Asignación ruta matutina', NOW()),
(9004, (SELECT id FROM puesto WHERE nombre = 'Personal de sucursal' LIMIT 1), CURRENT_DATE - 40, 'Recepción sucursal matriz', NOW()),
(9005, (SELECT id FROM puesto WHERE nombre = 'Chofer' LIMIT 1),               CURRENT_DATE - 60, 'Chofer foráneo', NOW());

INSERT INTO usuario_estado_historial (usuario_id, estado, motivo, fecha_inicio, fecha_fin, registrado_por) VALUES
(9001, 'activo',      'Alta inicial de cuenta', NOW(), NULL, NULL),
(9002, 'activo',      'Cuenta chofer activa',   NOW(), NULL, NULL),
(9003, 'activo',      'Cuenta chofer activa',   NOW(), NULL, NULL),
(9004, 'suspendido',  'Incapacidad médica temporal por 15 días (accidente no laboral)', NOW() - INTERVAL '3 days', NULL, NULL),
(9005, 'baja',        'Rescisión de contrato laboral por mutuo acuerdo', NOW() - INTERVAL '15 days', NULL, NULL);


-- Clientes de prueba

INSERT INTO usuario (id, email, password_hash, tipo_usuario, activo, ultimo_acceso, created_at, updated_at)
OVERRIDING SYSTEM VALUE VALUES
(9101, 'cliente.conenvios@empresa.com',     'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'cliente', true, NOW(), NOW() - INTERVAL '10 days', NOW()),
(9102, 'cliente.sinpendientes@empresa.com', 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'cliente', true, NOW(), NOW() - INTERVAL '20 days', NOW());

INSERT INTO cliente (id, usuario_id, nombre, apellido_paterno, apellido_materno, telefono, email, activo, created_at, updated_at)
OVERRIDING SYSTEM VALUE VALUES
(9101, 9101, 'Distribuidora del Pacífico', 'S.A.', 'C.V.', '6677910101', 'cliente.conenvios@empresa.com',     true, NOW() - INTERVAL '10 days', NOW()),
(9102, 9102, 'Agroquímicos de Sinaloa',    'S.A.', 'C.V.', '6677910202', 'cliente.sinpendientes@empresa.com', true, NOW() - INTERVAL '20 days', NOW());


-- Flotilla y unidades

INSERT INTO flotilla (id, sucursal_id, supervisor_id, nombre, codigo, activo, created_at, updated_at)
OVERRIDING SYSTEM VALUE VALUES
(9201, 1, 9011, 'Flotilla Express Culiacán Norte', 'FLOT-CUL-01', true, NOW(), NOW());

INSERT INTO unidad (
    id, flotilla_id, placas, tipo_vehiculo, marca, modelo, anio,
    capacidad_kg, km_odometro_inicial, km_odometro_actual, estado, activo, created_at, updated_at
)
OVERRIDING SYSTEM VALUE VALUES
(9202, 9201, 'SIN-9921-A', 'Camión 3.5 Toneladas', 'Isuzu', 'Forward 800', 2024, 3500.00, 0.00, 15420.00, 'disponible', true, NOW(), NOW()),
(9203, 9201, 'SIN-9922-B', 'Van de Reparto',      'Nissan', 'NV350 Urvan', 2023, 1400.00, 0.00, 32100.00, 'disponible', true, NOW(), NOW());

INSERT INTO asignacion_flotilla_chofer (flotilla_id, chofer_id, fecha_inicio, activo, created_at) VALUES
(9201, 9002, CURRENT_DATE, true, NOW()),
(9201, 9003, CURRENT_DATE, true, NOW());


-- Envíos de prueba

INSERT INTO envio (
    id, guia, remitente_id, destinatario_nombre, destinatario_telefono, destinatario_email,
    intento_reparto, requiere_recoleccion, sucursal_recepcion_id, sucursal_destino_id, direccion_destino_id,
    peso_kg, largo_cm, ancho_cm, alto_cm, descripcion, valor_declarado,
    codigo_validacion_hash, estado, creado_por_usuario_id, fecha_creacion, created_at, updated_at, metadata
)
OVERRIDING SYSTEM VALUE VALUES
-- En ruta (cliente activo)
(9101, 'TR-CLI-ACTIVO-01', 9101, 'Lic. Martha Gómez', '6677889901', 'martha.gomez@empresa.com',
 0, false, 1, 1, 1,
 5.50, 30, 25, 20, 'Documentación legal y contratos', 1500.00,
 NULL, 'en_ruta', 9013, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW(),
 '{"origen":"prueba_cu12"}'::jsonb),

-- Entregado
(9102, 'TR-CLI-ENTREGADO-02', 9102, 'Ing. Joaquín Soto', '6677889902', 'joaquin.soto@empresa.com',
 1, false, 1, 1, 1,
 12.00, 40, 30, 30, 'Insumos agrícolas certificados', 4500.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==', 'entregado', 9013, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days',
 '{"origen":"prueba_cu12_entregado"}'::jsonb),

-- Recibidos en sucursal para lote
(9201, 'TR-LOTE-001', 9102, 'Ferretería El Tornillo', '6677112233', 'contacto@eltornillo.mx',
 0, false, 1, 1, 1,
 14.20, 50, 40, 30, 'Caja con refacciones industriales', 3200.00,
 NULL, 'recibido_sucursal', 9013, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours', NOW(),
 '{"sector":"Centro"}'::jsonb),

(9202, 'TR-LOTE-002', 9102, 'Papelería Moderna', '6677223344', 'pedidos@papeleriamoderna.mx',
 0, false, 1, 1, 2,
 8.50, 35, 30, 20, 'Paquetes de hojas y suministros de oficina', 1800.00,
 NULL, 'recibido_sucursal', 9013, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours', NOW(),
 '{"sector":"Tres Ríos"}'::jsonb),

(9203, 'TR-LOTE-003', 9102, 'Taller Mecánico Especializado', '6677334455', 'taller@especializado.mx',
 0, false, 1, 1, 2,
 22.00, 60, 50, 40, 'Filtros y bandas automotrices', 5400.00,
 NULL, 'recibido_sucursal', 9013, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NOW(),
 '{"sector":"Humaya"}'::jsonb),

-- En reparto chofer
(9301, 'TR-CHOFER-001', 9102, 'Lic. María Elena Félix', '6671234567', 'maria.felix@bufete.mx',
 0, false, 1, 1, 1,
 4.80, 30, 20, 15, 'Muestra médica y reactivos en hielera', 2900.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==', 'en_ruta', 9013, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', NOW(),
 '{"intentosFallidosPin":0,"direccionDetalle":"Av. Álvaro Obregón 1234 Col. Centro"}'::jsonb),

(9302, 'TR-CHOFER-002', 9102, 'Ing. Carlos Beltrán', '6672345678', 'carlos.beltran@constructora.mx',
 0, false, 1, 1, 2,
 9.30, 40, 30, 25, 'Planos arquitectónicos y muestras de loseta', 1700.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==', 'en_ruta', 9013, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', NOW(),
 '{"intentosFallidosPin":0,"direccionDetalle":"Blvd. Pedro Infante 880 Col. Recursos"}'::jsonb),

(9303, 'TR-CHOFER-003', 9102, 'Dra. Sofía Morales', '6673456789', 'sofia.morales@hospital.mx',
 0, false, 1, 1, 1,
 3.10, 25, 20, 10, 'Instrumental odontológico estéril', 4100.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==', 'en_ruta', 9013, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', NOW(),
 '{"intentosFallidosPin":0,"direccionDetalle":"Paseo Niños Héroes 450 Col. Las Quintas"}'::jsonb),

-- Bajo custodia para devolución
(9401, 'TR-CUSTODIA-001', 9102, 'Farmacia San Jorge', '6674567890', 'pedidos@sanjorge.mx',
 0, false, 1, 1, 1,
 7.00, 35, 25, 20, 'Medicamentos de cuadro básico', 3800.00,
 NULL, 'recibido_sucursal', 9013, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours', NOW(),
 '{"custodia":"en_sucursal"}'::jsonb),

(9402, 'TR-CUSTODIA-002', 9102, 'Librería Universitaria', '6675678901', 'compras@libreriauni.mx',
 0, false, 1, 1, 2,
 11.50, 45, 35, 30, 'Lote de libros de texto especializados', 2600.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==', 'en_ruta', 9013, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NOW(),
 '{"custodia":"en_ruta"}'::jsonb);


-- Rutas operativas

-- Ruta en curso
INSERT INTO ruta (
    id, chofer_id, unidad_id, flotilla_id, fecha, estado, origen_sucursal_id,
    hora_inicio, km_inicial_odometro, distancia_estimada_km, tiempo_estimado_min, created_by, created_at, updated_at
)
OVERRIDING SYSTEM VALUE VALUES
(9301, 9002, 9202, 9201, CURRENT_DATE, 'en_curso', 1,
 NOW() - INTERVAL '1 hour', 15420.00, 18.50, 45, 9012, NOW() - INTERVAL '2 hours', NOW());

INSERT INTO ruta_envio (id, ruta_id, envio_id, orden_entrega, estado)
OVERRIDING SYSTEM VALUE VALUES
(9301, 9301, 9301, 1, 'pendiente'),
(9302, 9301, 9302, 2, 'pendiente'),
(9303, 9301, 9303, 3, 'pendiente');

-- Ruta planeada
INSERT INTO ruta (
    id, chofer_id, unidad_id, flotilla_id, fecha, estado, origen_sucursal_id,
    hora_inicio, km_inicial_odometro, distancia_estimada_km, tiempo_estimado_min, created_by, created_at, updated_at
)
OVERRIDING SYSTEM VALUE VALUES
(9302, 9003, 9203, 9201, CURRENT_DATE, 'planeada', 1,
 NULL, NULL, 22.00, 55, 9012, NOW() - INTERVAL '3 hours', NOW());

INSERT INTO ruta_envio (id, ruta_id, envio_id, orden_entrega, estado)
OVERRIDING SYSTEM VALUE VALUES
(9304, 9302, 9101, 1, 'pendiente');

-- Ajuste de secuencias
SELECT setval(pg_get_serial_sequence('direccion', 'id'), (SELECT COALESCE(MAX(id), 1) FROM direccion));
SELECT setval(pg_get_serial_sequence('sucursal', 'id'), (SELECT COALESCE(MAX(id), 1) FROM sucursal));
SELECT setval(pg_get_serial_sequence('usuario', 'id'), (SELECT COALESCE(MAX(id), 1) FROM usuario));
SELECT setval(pg_get_serial_sequence('empleado', 'id'), (SELECT COALESCE(MAX(id), 1) FROM empleado));
SELECT setval(pg_get_serial_sequence('cliente', 'id'), (SELECT COALESCE(MAX(id), 1) FROM cliente));
SELECT setval(pg_get_serial_sequence('flotilla', 'id'), (SELECT COALESCE(MAX(id), 1) FROM flotilla));
SELECT setval(pg_get_serial_sequence('unidad', 'id'), (SELECT COALESCE(MAX(id), 1) FROM unidad));
SELECT setval(pg_get_serial_sequence('envio', 'id'), (SELECT COALESCE(MAX(id), 1) FROM envio));
SELECT setval(pg_get_serial_sequence('ruta', 'id'), (SELECT COALESCE(MAX(id), 1) FROM ruta));
SELECT setval(pg_get_serial_sequence('ruta_envio', 'id'), (SELECT COALESCE(MAX(id), 1) FROM ruta_envio));

COMMIT;
