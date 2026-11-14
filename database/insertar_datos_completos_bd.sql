-- Poblado de datos operativos (clave DepR6670000000, PIN 123456)

BEGIN;

-- Limpieza de tablas operativas
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

-- Catálogos de roles, puestos y permisos
INSERT INTO rol (nombre, descripcion) VALUES
('RH',                      'Recursos Humanos'),
('Supervisor',              'Supervisor de operaciones'),
('Jefe de flotilla',        'Planificación de rutas y monitoreo'),
('Chofer',                  'Operador de unidad'),
('Personal administrativo', 'Registro y atención al cliente'),
('Personal de sucursal',    'Recepción de paquetes en sucursal'),
('Jefe',                    'Máxima autoridad corporativa, asigna roles y supervisa RH')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO puesto (nombre, descripcion) VALUES
('Chofer',               'Conductor de unidad de reparto'),
('Supervisor',           'Supervisión de operaciones'),
('Jefe de flotilla',     'Planeación y monitoreo de rutas'),
('Atención a clientes',  'Call center y soporte'),
('Recursos Humanos',     'Gestión de personal'),
('Administrativo',       'Registro de clientes y envíos'),
('Personal de sucursal', 'Recepción física de paquetes'),
('Gerente General',      'Dirección y máxima autoridad de la empresa')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO permiso (codigo, nombre, modulo, descripcion) VALUES
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
('empleado.suspender_acceso',    'Suspender acceso',                    'rh',            'Suspensión temporal de un acceso'),
('empleado.desactivar_acceso',   'Desactivar acceso',                   'rh',            'Baja definitiva de un acceso'),
('empleado.reactivar_acceso',    'Reactivar acceso',                    'rh',            'Reactivación de accesos suspendidos'),
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
('ruta.planificar',              'Planificar ruta',                     'rutas',         'Organización de itinerarios de entrega'),
('ruta.asignar_recursos',        'Asignar recursos a ruta',             'rutas',         'Asignar chofer y unidad a una ruta'),
('ruta.iniciar_recorrido',       'Iniciar recorrido',                   'rutas',         'Inicio de la ejecución de una ruta'),
('cambio_ruta.registrar',        'Notificar cambio de ruta',            'rutas',         'Registro manual de cambio de trayecto'),
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
('envio.cancelar',               'Cancelar envío',                      'envios',        'Cancelación de un envío'),
('envio.reprogramar',            'Reprogramar entrega',                 'envios',        'Nueva fecha de entrega tras incidencia'),
('envio.rastrear',               'Rastrear envío',                      'envios',        'Consulta de estado y ubicación'),
('envio.asignar_flotilla',       'Asignar envíos a flotilla',           'envios',        'Asignación de envíos recibidos a flotillas'),
('envio.validar_entrega',        'Validar entrega',                     'entregas',      'Cierre de entrega con código y evidencia'),
('envio.devolucion_registrar',   'Registrar devolución',                'devoluciones',  'Documentación del retorno de un paquete'),
('envio.devolucion_confirmar',   'Confirmar recepción de devolución',   'devoluciones',  'Recepción del paquete devuelto en sucursal'),
('incidencia.reportar',          'Reportar incidencia',                 'incidencias',   'Documentación de incidencias en campo'),
('queja.registrar',              'Registrar queja',                     'quejas',        'Alta de inconformidades'),
('queja.atender',                'Atender queja',                       'quejas',        'Seguimiento y cierre de quejas')
ON CONFLICT (codigo) DO NOTHING;

-- Tipos de mantenimiento base
DELETE FROM tipo_mantenimiento
WHERE nombre NOT IN (
    'Cambio de aceite',
    'Rotación de neumáticos',
    'Revisión de frenos',
    'Cambio de filtros',
    'Servicio mayor'
);

INSERT INTO tipo_mantenimiento (nombre, descripcion, km_intervalo, activo) VALUES
('Cambio de aceite',       'Cambio de aceite y filtro',                 10000, TRUE),
('Rotación de neumáticos', 'Rotación e inspección de neumáticos',         8000, TRUE),
('Revisión de frenos',     'Inspección y ajuste del sistema de frenos', 20000, TRUE),
('Cambio de filtros',      'Cambio de filtro de aire y combustible',    15000, TRUE),
('Servicio mayor',         'Servicio mayor de mantenimiento',           50000, TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- Permisos por rol
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
WHERE r.nombre = 'RH'
  AND p.codigo IN (
    'cliente.registrar','cliente.consultar',
    'empleado.registrar','empleado.consultar','empleado.editar','empleado.desactivar','empleado.cambiar_rol','empleado.suspender_acceso','empleado.desactivar_acceso','empleado.reactivar_acceso',
    'puesto.administrar','puesto.consultar',
    'sesion.iniciar','rol.administrar','rol.consultar','permiso.consultar','usuario.consultar','usuario.editar',
    'sucursal.registrar','sucursal.consultar','sucursal.editar','sucursal.desactivar',
    'flotilla.consultar','unidad.consultar',
    'alerta.consultar_historial',
    'mantenimiento.registrar','mantenimiento.consultar','tipo_mantenimiento.administrar','tipo_mantenimiento.consultar',
    'cambio_ruta.consultar'
  )
ON CONFLICT DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
WHERE r.nombre = 'Supervisor'
  AND p.codigo IN (
    'sesion.iniciar','sucursal.consultar','puesto.consultar',
    'flotilla.registrar','flotilla.consultar','flotilla.editar','flotilla.desactivar','flotilla.asignar_chofer',
    'unidad.registrar','unidad.consultar','unidad.editar','unidad.desactivar','unidad.asignar_flotilla',
    'envio.rastrear','envio.asignar_flotilla',
    'tipo_mantenimiento.administrar','tipo_mantenimiento.consultar',
    'mantenimiento.registrar','mantenimiento.consultar',
    'cliente.consultar','empleado.consultar','cambio_ruta.consultar'
  )
ON CONFLICT DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
WHERE r.nombre = 'Jefe de flotilla'
  AND p.codigo IN (
    'sesion.iniciar','sucursal.consultar','flotilla.consultar','unidad.consultar',
    'envio.rastrear','ruta.planificar','ruta.asignar_recursos','cambio_ruta.consultar',
    'alerta.recibir','alerta.consultar_historial',
    'alerta.mantenimiento_recibir','mantenimiento.consultar','tipo_mantenimiento.consultar',
    'cliente.consultar','empleado.consultar'
  )
ON CONFLICT DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
WHERE r.nombre = 'Chofer'
  AND p.codigo IN (
    'sesion.iniciar','ruta.iniciar_recorrido','cambio_ruta.registrar',
    'envio.validar_entrega','envio.reprogramar','envio.devolucion_registrar',
    'incidencia.reportar','cliente.consultar','unidad.consultar'
  )
ON CONFLICT DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
WHERE r.nombre = 'Personal administrativo'
  AND p.codigo IN (
    'sesion.iniciar','sucursal.consultar',
    'cliente.registrar','cliente.consultar','cliente.editar','cliente.desactivar',
    'usuario.consultar','usuario.editar',
    'envio.registrar','envio.rastrear','envio.reprogramar','envio.cancelar',
    'queja.atender'
  )
ON CONFLICT DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
WHERE r.nombre = 'Personal de sucursal'
  AND p.codigo IN (
    'sesion.iniciar','sucursal.consultar','cliente.consultar',
    'envio.recepcion_sucursal','envio.rastrear','envio.devolucion_registrar','envio.devolucion_confirmar'
  )
ON CONFLICT DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r, permiso p
WHERE r.nombre = 'Jefe'
  AND p.codigo IN (
    'cliente.registrar','cliente.consultar','cliente.editar','cliente.desactivar',
    'empleado.registrar','empleado.consultar','empleado.editar','empleado.desactivar','empleado.cambiar_rol',
    'empleado.suspender_acceso','empleado.desactivar_acceso','empleado.reactivar_acceso',
    'puesto.administrar','puesto.consultar',
    'sesion.iniciar','rol.administrar','rol.consultar','permiso.consultar','usuario.consultar','usuario.editar',
    'sucursal.registrar','sucursal.consultar','sucursal.editar','sucursal.desactivar',
    'flotilla.consultar','unidad.consultar','alerta.consultar_historial','cambio_ruta.consultar',
    'envio.registrar','envio.rastrear','envio.cancelar','queja.atender',
    'mantenimiento.consultar','tipo_mantenimiento.consultar'
  )
ON CONFLICT DO NOTHING;

-- Direcciones
INSERT INTO direccion (
    id, estado_id, municipio_id, localidad_id, asentamiento_id,
    calle, numero_exterior, numero_interior, entre_calles,
    colonia, localidad, municipio, estado, pais, codigo_postal,
    referencias, latitud, longitud, metadata, activo, created_at, updated_at
)
OVERRIDING SYSTEM VALUE VALUES
-- Sucursales
(1,
 (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
 (SELECT id FROM cat_municipio WHERE cvegeo = '25006' LIMIT 1),
 (SELECT id FROM cat_localidad WHERE cvegeo = '250060001' LIMIT 1),
 (SELECT id FROM cat_asentamiento WHERE c_estado = '25' AND c_mnpio = '006' AND d_codigo = '80000' ORDER BY id LIMIT 1),
 'Av. Álvaro Obregón', '450', 'Local A', 'Entre Calle Ángel Flores y Calle Miguel Hidalgo',
 'Centro', 'Culiacán Rosales', 'Culiacán', 'Sinaloa', 'México', '80000',
 'Edificio corporativo Transportes Rojas, frente a plazuela',
 24.8049100, -107.3940100, '{"zona":"Centro","tipo_inmueble":"Centro de Distribución y Matriz"}'::jsonb, true, NOW() - INTERVAL '180 days', NOW()),

(2,
 (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
 (SELECT id FROM cat_municipio WHERE cvegeo = '25006' LIMIT 1),
 (SELECT id FROM cat_localidad WHERE cvegeo = '250060001' LIMIT 1),
 (SELECT id FROM cat_asentamiento WHERE c_estado = '25' AND c_mnpio = '006' AND d_codigo = '80100' ORDER BY id LIMIT 1),
 'Blvd. Emiliano Zapata', '2150', 'Bodega 4', 'Entre Av. Aztlán y Calzada Aeropuerto',
 'Industrial El Palmito', 'Culiacán Rosales', 'Culiacán', 'Sinaloa', 'México', '80100',
 'Patio de maniobras con andén de carga para unidades de 3.5 y 8 toneladas',
 24.7824500, -107.4281500, '{"zona":"Poniente-Industrial","andenes":6}'::jsonb, true, NOW() - INTERVAL '170 days', NOW()),

(3,
 (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
 (SELECT id FROM cat_municipio WHERE cvegeo = '25012' LIMIT 1),
 (SELECT id FROM cat_localidad WHERE cvegeo = '250120001' LIMIT 1),
 (SELECT id FROM cat_asentamiento WHERE c_estado = '25' AND c_mnpio = '012' AND d_codigo = '82000' ORDER BY id LIMIT 1),
 'Av. Ejército Mexicano', '1200', NULL, 'Entre Calle Aquiles Serdán y Av. Gutiérrez Nájera',
 'Centro', 'Mazatlán', 'Mazatlán', 'Sinaloa', 'México', '82000',
 'Sucursal regional sur con bodega de consolidación',
 23.2165200, -106.4163200, '{"zona":"Sur","andenes":4}'::jsonb, true, NOW() - INTERVAL '160 days', NOW()),

(4,
 (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
 (SELECT id FROM cat_municipio WHERE cvegeo = '25001' LIMIT 1),
 (SELECT id FROM cat_localidad WHERE cvegeo = '250010001' LIMIT 1),
 (SELECT id FROM cat_asentamiento WHERE c_estado = '25' AND c_mnpio = '001' AND d_codigo = '81200' ORDER BY id LIMIT 1),
 'Blvd. Rosendo G. Castro', '845', 'Planta Baja', 'Entre Calle Guillermo Prieto y Calle Ignacio Zaragoza',
 'Centro', 'Los Mochis', 'Ahome', 'Sinaloa', 'México', '81200',
 'Sucursal regional norte a media cuadra del cruce principal',
 25.7904600, -108.9930500, '{"zona":"Norte","andenes":3}'::jsonb, true, NOW() - INTERVAL '150 days', NOW()),

-- Clientes y destinos
(5,
 (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
 (SELECT id FROM cat_municipio WHERE cvegeo = '25006' LIMIT 1),
 (SELECT id FROM cat_localidad WHERE cvegeo = '250060001' LIMIT 1),
 (SELECT id FROM cat_asentamiento WHERE c_estado = '25' AND c_mnpio = '006' AND d_codigo = '80020' ORDER BY id LIMIT 1),
 'Blvd. Pedro Infante', '2850', 'Piso 2', 'Entre Blvd. Alfonso Zaragoza Maytorena y Av. Teófilo Noris',
 'Desarrollo Urbano Tres Ríos', 'Culiacán Rosales', 'Culiacán', 'Sinaloa', 'México', '80020',
 'Torre Empresarial Tres Ríos, recepción planta baja',
 24.8129000, -107.4085000, '{"horario_recepcion":"08:00-18:00"}'::jsonb, true, NOW() - INTERVAL '90 days', NOW()),

(6,
 (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
 (SELECT id FROM cat_municipio WHERE cvegeo = '25006' LIMIT 1),
 (SELECT id FROM cat_localidad WHERE cvegeo = '250060001' LIMIT 1),
 (SELECT id FROM cat_asentamiento WHERE c_estado = '25' AND c_mnpio = '006' AND d_codigo = '80030' ORDER BY id LIMIT 1),
 'Av. Nicolás Bravo', '640', NULL, 'Entre Calle Juan José Ríos y Calle Epitacio Osuna',
 'Jorge Almada', 'Culiacán Rosales', 'Culiacán', 'Sinaloa', 'México', '80030',
 'Comercializadora de insumos médicos, portón gris',
 24.7941000, -107.3992000, '{"horario_recepcion":"09:00-17:00"}'::jsonb, true, NOW() - INTERVAL '85 days', NOW()),

(7,
 (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
 (SELECT id FROM cat_municipio WHERE cvegeo = '25006' LIMIT 1),
 (SELECT id FROM cat_localidad WHERE cvegeo = '250060001' LIMIT 1),
 (SELECT id FROM cat_asentamiento WHERE c_estado = '25' AND c_mnpio = '006' AND d_codigo = '80040' ORDER BY id LIMIT 1),
 'Av. Universitarios', '1120', 'Depto 3B', 'Entre Av. de las Américas y Calle Josefa Ortiz',
 'Universitaria', 'Culiacán Rosales', 'Culiacán', 'Sinaloa', 'México', '80040',
 'Edificio color arena frente a Ciudad Universitaria',
 24.8245000, -107.3812000, '{"residencial":true}'::jsonb, true, NOW() - INTERVAL '80 days', NOW()),

(8,
 (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
 (SELECT id FROM cat_municipio WHERE cvegeo = '25006' LIMIT 1),
 (SELECT id FROM cat_localidad WHERE cvegeo = '250060001' LIMIT 1),
 (SELECT id FROM cat_asentamiento WHERE c_estado = '25' AND c_mnpio = '006' AND d_codigo = '80050' ORDER BY id LIMIT 1),
 'Calle Presa Valsequillo', '915', NULL, 'Entre Blvd. Dr. Mora y Blvd. Sinaloa',
 'Las Quintas', 'Culiacán Rosales', 'Culiacán', 'Sinaloa', 'México', '80050',
 'Casa de dos pisos con reja negra y jardín frontal',
 24.8087000, -107.3724000, '{"residencial":true}'::jsonb, true, NOW() - INTERVAL '75 days', NOW()),

(9,
 (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
 (SELECT id FROM cat_municipio WHERE cvegeo = '25006' LIMIT 1),
 (SELECT id FROM cat_localidad WHERE cvegeo = '250060001' LIMIT 1),
 (SELECT id FROM cat_asentamiento WHERE c_estado = '25' AND c_mnpio = '006' AND d_codigo = '80060' ORDER BY id LIMIT 1),
 'Av. Pascual Orozco', '1425', 'Local 2', 'Entre Av. Guadalupe Victoria y Av. Nicolás Bravo',
 'Nuevo Culiacán', 'Culiacán Rosales', 'Culiacán', 'Sinaloa', 'México', '80060',
 'Ferretería y Distribuidora del Pacífico',
 24.7892000, -107.3865000, '{"comercio":true}'::jsonb, true, NOW() - INTERVAL '70 days', NOW()),

(10,
 (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
 (SELECT id FROM cat_municipio WHERE cvegeo = '25006' LIMIT 1),
 (SELECT id FROM cat_localidad WHERE cvegeo = '250060001' LIMIT 1),
 (SELECT id FROM cat_asentamiento WHERE c_estado = '25' AND c_mnpio = '006' AND d_codigo = '80120' ORDER BY id LIMIT 1),
 'Blvd. Jesús Kumate', '4300', 'Nave 12', 'Salir por Libramiento Sur',
 'Parque Industrial Canaco', 'Culiacán Rosales', 'Culiacán', 'Sinaloa', 'México', '80120',
 'Agroindustrias del Valle, caseta de vigilancia #2',
 24.7568000, -107.4410000, '{"industrial":true}'::jsonb, true, NOW() - INTERVAL '65 days', NOW()),

(11,
 (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
 (SELECT id FROM cat_municipio WHERE cvegeo = '25006' LIMIT 1),
 (SELECT id FROM cat_localidad WHERE cvegeo = '250060001' LIMIT 1),
 (SELECT id FROM cat_asentamiento WHERE c_estado = '25' AND c_mnpio = '006' AND d_codigo = '80058' ORDER BY id LIMIT 1),
 'Blvd. Enrique Sánchez Alonso', '1980', 'Local 15', 'Entre Av. Álvaro Obregón y Calle Gral. Juan Carrasco',
 'Chapultepec', 'Culiacán Rosales', 'Culiacán', 'Sinaloa', 'México', '80058',
 'Plaza comercial junto a cafetería',
 24.8195000, -107.3921000, '{"comercio":true}'::jsonb, true, NOW() - INTERVAL '60 days', NOW()),

(12,
 (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
 (SELECT id FROM cat_municipio WHERE cvegeo = '25006' LIMIT 1),
 (SELECT id FROM cat_localidad WHERE cvegeo = '250060001' LIMIT 1),
 (SELECT id FROM cat_asentamiento WHERE c_estado = '25' AND c_mnpio = '006' AND d_codigo = '80010' ORDER BY id LIMIT 1),
 'Calzada Heroico Colegio Militar', '3100', NULL, 'Entre Calle Plan de Ayala y Av. Revolución',
 'Sinaloa', 'Culiacán Rosales', 'Culiacán', 'Sinaloa', 'México', '80010',
 'Bodega de refacciones automotrices del Noroeste',
 24.7782000, -107.3698000, '{"comercio":true}'::jsonb, true, NOW() - INTERVAL '55 days', NOW()),

(13,
 (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
 (SELECT id FROM cat_municipio WHERE cvegeo = '25012' LIMIT 1),
 (SELECT id FROM cat_localidad WHERE cvegeo = '250120001' LIMIT 1),
 (SELECT id FROM cat_asentamiento WHERE c_estado = '25' AND c_mnpio = '012' AND d_codigo = '82110' ORDER BY id LIMIT 1),
 'Av. Camarón Sábalo', '2040', 'Suite 104', 'Frente a zona hotelera',
 'Zona Dorada', 'Mazatlán', 'Mazatlán', 'Sinaloa', 'México', '82110',
 'Distribuidora Marítima y Hotelera del Pacífico',
 23.2491000, -106.4539000, '{"comercio":true}'::jsonb, true, NOW() - INTERVAL '50 days', NOW()),

(14,
 (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
 (SELECT id FROM cat_municipio WHERE cvegeo = '25001' LIMIT 1),
 (SELECT id FROM cat_localidad WHERE cvegeo = '250010001' LIMIT 1),
 (SELECT id FROM cat_asentamiento WHERE c_estado = '25' AND c_mnpio = '001' AND d_codigo = '81240' ORDER BY id LIMIT 1),
 'Blvd. Antonio Rosales', '1560', NULL, 'Entre Av. Heriberto Valdez y Calle Juárez',
 'Scally', 'Los Mochis', 'Ahome', 'Sinaloa', 'México', '81240',
 'Proveedora Agrícola del Valle del Fuerte',
 25.7982000, -108.9985000, '{"comercio":true}'::jsonb, true, NOW() - INTERVAL '45 days', NOW());

-- Sucursales, horarios y cobertura
INSERT INTO sucursal (
    id, nombre, nombre_corto, codigo, direccion_id, responsable_id,
    telefono, email, cobertura, activo, created_at, updated_at
)
OVERRIDING SYSTEM VALUE VALUES
(1, 'Sucursal Matriz Culiacán Centro',    'Culiacán Centro',   'SUC-CUL-01', 1, NULL, '6677123400', 'matriz.culiacan@transportesrojas.mx',   'Culiacán Centro, Tres Ríos, Las Quintas, Chapultepec, Universitaria y zona norte', true, NOW() - INTERVAL '180 days', NOW()),
(2, 'Centro Operativo Culiacán Poniente', 'Culiacán Poniente', 'SUC-CUL-02', 2, NULL, '6677158890', 'poniente.culiacan@transportesrojas.mx', 'Zona Industrial El Palmito, Aeropuerto, Humaya, Barrancos y corredor sur',         true, NOW() - INTERVAL '170 days', NOW()),
(3, 'Sucursal Regional Mazatlán',         'Mazatlán',          'SUC-MAZ-01', 3, NULL, '6699814420', 'mazatlan@transportesrojas.mx',          'Mazatlán Centro, Zona Dorada, Marina, Parque Industrial y Concordia',             true, NOW() - INTERVAL '160 days', NOW()),
(4, 'Sucursal Regional Los Mochis',       'Los Mochis',        'SUC-LMM-01', 4, NULL, '6688129910', 'losmochis@transportesrojas.mx',         'Los Mochis, Topolobampo, El Fuerte y corredor agrícola norte de Sinaloa',         true, NOW() - INTERVAL '150 days', NOW());

INSERT INTO horario_sucursal (id, sucursal_id, dia_semana, hora_apertura, hora_cierre, es_dia_descanso, created_at)
OVERRIDING SYSTEM VALUE VALUES
-- Sucursal 1 (Culiacán Centro)
(1,  1, 1, '08:00:00', '19:00:00', false, NOW()),
(2,  1, 2, '08:00:00', '19:00:00', false, NOW()),
(3,  1, 3, '08:00:00', '19:00:00', false, NOW()),
(4,  1, 4, '08:00:00', '19:00:00', false, NOW()),
(5,  1, 5, '08:00:00', '19:00:00', false, NOW()),
(6,  1, 6, '09:00:00', '14:00:00', false, NOW()),
(7,  1, 7, NULL,       NULL,       true,  NOW()),
-- Sucursal 2 (Culiacán Poniente)
(8,  2, 1, '07:30:00', '18:30:00', false, NOW()),
(9,  2, 2, '07:30:00', '18:30:00', false, NOW()),
(10, 2, 3, '07:30:00', '18:30:00', false, NOW()),
(11, 2, 4, '07:30:00', '18:30:00', false, NOW()),
(12, 2, 5, '07:30:00', '18:30:00', false, NOW()),
(13, 2, 6, '08:00:00', '14:00:00', false, NOW()),
(14, 2, 7, NULL,       NULL,       true,  NOW()),
-- Sucursal 3 (Mazatlán)
(15, 3, 1, '08:30:00', '18:30:00', false, NOW()),
(16, 3, 2, '08:30:00', '18:30:00', false, NOW()),
(17, 3, 3, '08:30:00', '18:30:00', false, NOW()),
(18, 3, 4, '08:30:00', '18:30:00', false, NOW()),
(19, 3, 5, '08:30:00', '18:30:00', false, NOW()),
(20, 3, 6, '09:00:00', '14:00:00', false, NOW()),
(21, 3, 7, NULL,       NULL,       true,  NOW()),
-- Sucursal 4 (Los Mochis)
(22, 4, 1, '08:30:00', '18:30:00', false, NOW()),
(23, 4, 2, '08:30:00', '18:30:00', false, NOW()),
(24, 4, 3, '08:30:00', '18:30:00', false, NOW()),
(25, 4, 4, '08:30:00', '18:30:00', false, NOW()),
(26, 4, 5, '08:30:00', '18:30:00', false, NOW()),
(27, 4, 6, '09:00:00', '14:00:00', false, NOW()),
(28, 4, 7, NULL,       NULL,       true,  NOW());

-- Cobertura por sucursal
INSERT INTO sucursal_cobertura (
    id, sucursal_id, estado_id, municipio_id, codigo_postal,
    aplica_recoleccion, aplica_entrega, es_zona_extendida, dias_estimados, activo, created_at
)
OVERRIDING SYSTEM VALUE
SELECT
    v.id,
    v.sucursal_id,
    (SELECT id FROM cat_estado WHERE cve_ent = '25' LIMIT 1),
    (SELECT id FROM cat_municipio WHERE cvegeo = v.cvegeo_mun LIMIT 1),
    v.cp, v.rec, v.ent, v.ext, v.dias, true, NOW()
FROM (VALUES
    (1,  1, '25006', '80000', true, true, false, 1::smallint),
    (2,  1, '25006', '80020', true, true, false, 1::smallint),
    (3,  1, '25006', '80030', true, true, false, 1::smallint),
    (4,  1, '25006', '80040', true, true, false, 1::smallint),
    (5,  1, '25006', '80050', true, true, false, 1::smallint),
    (6,  1, '25006', '80058', true, true, false, 1::smallint),
    (7,  1, '25006', '80060', true, true, false, 1::smallint),
    (8,  2, '25006', '80010', true, true, false, 1::smallint),
    (9,  2, '25006', '80100', true, true, false, 1::smallint),
    (10, 2, '25006', '80120', true, true, false, 1::smallint),
    (11, 3, '25012', '82000', true, true, false, 2::smallint),
    (12, 3, '25012', '82110', true, true, false, 2::smallint),
    (13, 4, '25001', '81200', true, true, false, 2::smallint),
    (14, 4, '25001', '81240', true, true, false, 2::smallint)
) AS v(id, sucursal_id, cvegeo_mun, cp, rec, ent, ext, dias)
WHERE EXISTS (SELECT 1 FROM cat_estado WHERE cve_ent = '25');

-- Usuarios y roles (clave DepR6670000000)
INSERT INTO usuario (id, email, password_hash, tipo_usuario, activo, ultimo_acceso, created_at, updated_at)
OVERRIDING SYSTEM VALUE VALUES
-- Empleados
(1,  'ricardo.rojas@transportesrojas.com', 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW() - INTERVAL '1 hour',  NOW() - INTERVAL '180 days', NOW()),
(3,  'rh@transportesrojas.mx',             'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '175 days', NOW()),
(4,  'supervisor@transportesrojas.mx',     'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW() - INTERVAL '1 hour',  NOW() - INTERVAL '170 days', NOW()),
(5,  'flotilla@transportesrojas.mx',       'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW() - INTERVAL '25 mins', NOW() - INTERVAL '165 days', NOW()),
(6,  'admin.envios@transportesrojas.mx',   'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '160 days', NOW()),
(7,  'sucursal.cul@transportesrojas.mx',   'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '155 days', NOW()),
(8,  'chofer1@transportesrojas.mx',        'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW() - INTERVAL '20 mins', NOW() - INTERVAL '150 days', NOW()),
(9,  'chofer2@transportesrojas.mx',        'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW() - INTERVAL '45 mins', NOW() - INTERVAL '145 days', NOW()),
(10, 'chofer3@transportesrojas.mx',        'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW() - INTERVAL '1 day',   NOW() - INTERVAL '140 days', NOW()),
(11, 'chofer.maz@transportesrojas.mx',     'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW() - INTERVAL '2 days',  NOW() - INTERVAL '135 days', NOW()),
(12, 'atencion@transportesrojas.mx',       'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'empleado', true, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '130 days', NOW()),

-- Clientes
(14, 'carlos.mendoza@agrovalle.mx',        'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'cliente',  true, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '90 days',  NOW()),
(15, 'sofia.ramirez@medipacifico.com',     'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'cliente',  true, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '85 days',  NOW()),
(16, 'jorge.beltran@ferrepacifico.mx',     'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'cliente',  true, NOW() - INTERVAL '1 day',   NOW() - INTERVAL '80 days',  NOW()),
(17, 'mariana.castro@gmail.com',           'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'cliente',  true, NOW() - INTERVAL '3 days',  NOW() - INTERVAL '75 days',  NOW()),
(18, 'ricardo.lizarraga@maritimamaz.mx',   'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'cliente',  true, NOW() - INTERVAL '2 days',  NOW() - INTERVAL '60 days',  NOW()),
(19, 'elena.valenzuela@refaccionesnw.mx',  'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==', 'cliente',  true, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '50 days',  NOW());

-- Asignación de roles
INSERT INTO usuario_rol (usuario_id, rol_id)
SELECT v.usuario_id, r.id
FROM (VALUES
    (1,  'Jefe'),
    (3,  'RH'),
    (4,  'Supervisor'),
    (5,  'Jefe de flotilla'),
    (6,  'Personal administrativo'),
    (7,  'Personal de sucursal'),
    (8,  'Chofer'),
    (9,  'Chofer'),
    (10, 'Chofer'),
    (11, 'Chofer'),
    (12, 'Personal de sucursal')
) AS v(usuario_id, rol_nombre)
JOIN rol r ON r.nombre = v.rol_nombre;

-- Empleados y puestos
INSERT INTO empleado (
    id, usuario_id, sucursal_id, nombre, apellido_paterno, apellido_materno,
    telefono, email, fecha_ingreso, activo, created_at, updated_at
)
OVERRIDING SYSTEM VALUE VALUES
(1,  1,  1, 'Ricardo',       'Rojas',      'Medina',     '6672450918', 'ricardo.rojas@transportesrojas.com', '2020-03-01', true, NOW() - INTERVAL '180 days', NOW()),
(3,  3,  1, 'Ana',           'López',      'García',     '6677001002', 'rh@transportesrojas.mx',             '2022-06-15', true, NOW() - INTERVAL '175 days', NOW()),
(4,  4,  1, 'Héctor',        'Valenzuela', 'Montoya',    '6677001003', 'supervisor@transportesrojas.mx',     '2022-09-01', true, NOW() - INTERVAL '170 days', NOW()),
(5,  5,  1, 'Marco',         'Gaxiola',    'Leyva',      '6677001004', 'flotilla@transportesrojas.mx',       '2023-01-15', true, NOW() - INTERVAL '165 days', NOW()),
(6,  6,  1, 'Laura',         'Cárdenas',   'Ibarra',     '6677001005', 'admin.envios@transportesrojas.mx',   '2023-04-10', true, NOW() - INTERVAL '160 days', NOW()),
(7,  7,  1, 'Daniela',       'Osuna',      'Tirado',     '6677001006', 'sucursal.cul@transportesrojas.mx',   '2023-07-01', true, NOW() - INTERVAL '155 days', NOW()),
(8,  8,  1, 'Carlos',        'Martínez',   'Pérez',      '6677001007', 'chofer1@transportesrojas.mx',        '2023-05-20', true, NOW() - INTERVAL '150 days', NOW()),
(9,  9,  1, 'Fernando',      'Sánchez',    'Ochoa',      '6677001008', 'chofer2@transportesrojas.mx',        '2023-08-12', true, NOW() - INTERVAL '145 days', NOW()),
(10, 10, 2, 'Luis',          'Bojórquez',  'Castro',     '6677001009', 'chofer3@transportesrojas.mx',        '2024-01-08', true, NOW() - INTERVAL '140 days', NOW()),
(11, 11, 3, 'Jesús',         'Lizárraga',  'Quintero',   '6699002001', 'chofer.maz@transportesrojas.mx',     '2024-02-15', true, NOW() - INTERVAL '135 days', NOW()),
(12, 12, 2, 'Paulina',       'Meza',       'Sepúlveda',  '6677001010', 'atencion@transportesrojas.mx',       '2024-03-01', true, NOW() - INTERVAL '130 days', NOW());

-- Responsables de sucursal
UPDATE sucursal SET responsable_id = 4  WHERE id = 1;
UPDATE sucursal SET responsable_id = 5  WHERE id = 2;
UPDATE sucursal SET responsable_id = 11 WHERE id = 3;
UPDATE sucursal SET responsable_id = 1  WHERE id = 4;

-- Historial de puestos
INSERT INTO empleado_puesto_historial (
    id, empleado_id, puesto_id, puesto_anterior_id,
    fecha_inicio, fecha_fin, motivo, registrado_por, created_at
)
OVERRIDING SYSTEM VALUE
SELECT
    v.id,
    v.empleado_id,
    p_act.id,
    p_ant.id,
    v.fecha_inicio::date,
    v.fecha_fin::date,
    v.motivo,
    v.registrado_por,
    NOW() - INTERVAL '120 days'
FROM (VALUES
    (1,  1,  'Gerente General',      NULL,                   '2020-03-01', NULL,         'Dirección General de Transportes Rojas S.A. de C.V.', 1),
    (3,  3,  'Recursos Humanos',     NULL,                   '2022-06-15', NULL,         'Titular del área de Recursos Humanos y Gestión de Personal', 1),
    (4,  4,  'Jefe de flotilla',     NULL,                   '2022-09-01', '2023-12-31', 'Ingreso como Jefe de Flotilla de Reparto Local', 3),
    (5,  4,  'Supervisor',           'Jefe de flotilla',     '2024-01-01', NULL,         'Promoción a Supervisor General de Operaciones de Última Milla', 3),
    (6,  5,  'Personal de sucursal', NULL,                   '2023-01-15', '2023-12-31', 'Ingreso en recepción de paquetes y coordinación de andén', 3),
    (7,  5,  'Jefe de flotilla',     'Personal de sucursal', '2024-01-01', NULL,         'Promoción a Jefe de Flotilla y Planificación de Rutas', 3),
    (8,  6,  'Administrativo',       NULL,                   '2023-04-10', NULL,         'Asignación a gestión administrativa de envíos y clientes', 3),
    (9,  7,  'Personal de sucursal', NULL,                   '2023-07-01', NULL,         'Encargada de recepción física de paquetes en Sucursal Matriz Culiacán', 3),
    (10, 8,  'Chofer',               NULL,                   '2023-05-20', NULL,         'Alta como Chofer de reparto de última milla Zona Norte-Centro', 3),
    (11, 9,  'Chofer',               NULL,                   '2023-08-12', NULL,         'Alta como Chofer de reparto de última milla Zona Tres Ríos-Sur', 3),
    (12, 10, 'Chofer',               NULL,                   '2024-01-08', NULL,         'Alta como Chofer de unidad pesada Rabón y recolecciones industriales', 3),
    (13, 11, 'Chofer',               NULL,                   '2024-02-15', NULL,         'Alta como Chofer de reparto regional en Sucursal Mazatlán', 3),
    (14, 12, 'Atención a clientes',  NULL,                   '2024-03-01', NULL,         'Ejecutiva de Atención a Clientes, seguimiento de incidencias y quejas', 3)
) AS v(id, empleado_id, puesto_nombre, puesto_ant_nombre, fecha_inicio, fecha_fin, motivo, registrado_por)
JOIN puesto p_act ON p_act.nombre = v.puesto_nombre
LEFT JOIN puesto p_ant ON p_ant.nombre = v.puesto_ant_nombre;

-- Historial de estados
INSERT INTO usuario_estado_historial (id, usuario_id, estado, motivo, fecha_inicio, fecha_fin, registrado_por)
OVERRIDING SYSTEM VALUE
SELECT id, id, 'activo', 'Alta inicial de cuenta activa en Transportes Rojas', created_at, NULL, 3
FROM usuario;

-- Clientes y direcciones
INSERT INTO cliente (
    id, usuario_id, nombre, apellido_paterno, apellido_materno,
    telefono, email, activo, created_at, updated_at
)
OVERRIDING SYSTEM VALUE VALUES
(1, 14, 'Carlos',        'Mendoza',    'Beltrán',   '6677112233', 'carlos.mendoza@agrovalle.mx',        true, NOW() - INTERVAL '90 days', NOW()),
(2, 15, 'Sofía',         'Ramírez',    'Duarte',    '6677223344', 'sofia.ramirez@medipacifico.com',     true, NOW() - INTERVAL '85 days', NOW()),
(3, 16, 'Jorge',         'Beltrán',    'Félix',     '6677334455', 'jorge.beltran@ferrepacifico.mx',     true, NOW() - INTERVAL '80 days', NOW()),
(4, 17, 'Mariana',       'Castro',     'Verdugo',   '6677445566', 'mariana.castro@gmail.com',           true, NOW() - INTERVAL '75 days', NOW()),
(5, 18, 'Ricardo',       'Lizárraga',  'Sánchez',   '6699112233', 'ricardo.lizarraga@maritimamaz.mx',   true, NOW() - INTERVAL '60 days', NOW()),
(6, 19, 'Elena',         'Valenzuela', 'Quiñónez',  '6677556677', 'elena.valenzuela@refaccionesnw.mx',  true, NOW() - INTERVAL '50 days', NOW());

INSERT INTO cliente_direccion (id, cliente_id, direccion_id, tipo, predeterminada, created_at)
OVERRIDING SYSTEM VALUE VALUES
(1,  1, 5,  'origen',  true,  NOW() - INTERVAL '90 days'),
(2,  1, 10, 'entrega', false, NOW() - INTERVAL '85 days'),
(3,  2, 6,  'origen',  true,  NOW() - INTERVAL '85 days'),
(4,  2, 11, 'entrega', false, NOW() - INTERVAL '80 days'),
(5,  3, 9,  'origen',  true,  NOW() - INTERVAL '80 days'),
(6,  3, 8,  'entrega', false, NOW() - INTERVAL '75 days'),
(7,  4, 7,  'origen',  true,  NOW() - INTERVAL '75 days'),
(8,  5, 13, 'origen',  true,  NOW() - INTERVAL '60 days'),
(9,  6, 12, 'origen',  true,  NOW() - INTERVAL '50 days'),
(10, 6, 14, 'entrega', false, NOW() - INTERVAL '45 days');

-- Flotillas, unidades y choferes
INSERT INTO flotilla (id, sucursal_id, supervisor_id, nombre, codigo, activo, created_at, updated_at)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 5, 'Flotilla Última Milla Culiacán Norte-Centro', 'FL-CUL-01', true, NOW() - INTERVAL '160 days', NOW()),
(2, 2, 5, 'Flotilla Carga Consolidada Culiacán Sur',     'FL-CUL-02', true, NOW() - INTERVAL '150 days', NOW()),
(3, 3, 4, 'Flotilla Regional Mazatlán Pacífico',         'FL-MAZ-01', true, NOW() - INTERVAL '140 days', NOW());

INSERT INTO unidad (
    id, flotilla_id, placas, tipo_vehiculo, marca, modelo, anio,
    capacidad_kg, km_odometro_inicial, km_odometro_actual, estado, activo, created_at, updated_at
)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 'SIN-1024-A', 'Van de Reparto', 'Mercedes-Benz', 'Sprinter 315 CDI',  2023, 1800.00, 1200.00,  24680.50, 'asignada',      true, NOW() - INTERVAL '155 days', NOW()),
(2, 1, 'SIN-2048-B', 'Camioneta 3.5',  'Ford',          'F-350 Super Duty',  2022, 3500.00, 5000.00,  44820.00, 'disponible',    true, NOW() - INTERVAL '150 days', NOW()),
(3, 2, 'SIN-3090-C', 'Rabón',          'Freightliner',  'M2 106',            2021, 8000.00, 10000.00, 68450.00, 'disponible',    true, NOW() - INTERVAL '145 days', NOW()),
(4, 2, 'SIN-4112-D', 'Van de Reparto', 'Nissan',        'NV350 Urvan Cargo', 2024, 1450.00, 100.00,   14920.00, 'mantenimiento', true, NOW() - INTERVAL '120 days', NOW()),
(5, 3, 'SIN-5220-E', 'Camioneta 3.5',  'Chevrolet',     'Silverado 3500 HD', 2023, 3500.00, 2500.00,  31200.00, 'disponible',    true, NOW() - INTERVAL '110 days', NOW());

INSERT INTO asignacion_flotilla_chofer (id, flotilla_id, chofer_id, fecha_inicio, fecha_fin, activo, created_at)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 8,  '2023-06-01', NULL, true, NOW() - INTERVAL '150 days'),
(2, 1, 9,  '2023-08-15', NULL, true, NOW() - INTERVAL '145 days'),
(3, 2, 10, '2024-01-10', NULL, true, NOW() - INTERVAL '140 days'),
(4, 3, 11, '2024-02-20', NULL, true, NOW() - INTERVAL '135 days');

-- Mantenimiento
INSERT INTO alerta_mantenimiento (
    id, unidad_id, tipo_mantenimiento_id, km_al_momento, km_umbral,
    km_ultimo_mantenimiento, descripcion, estado, atendida_por, fecha_alerta, fecha_atencion
)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, COALESCE((SELECT id FROM tipo_mantenimiento WHERE nombre = 'Cambio de aceite' LIMIT 1), (SELECT id FROM tipo_mantenimiento ORDER BY id LIMIT 1)),
 20110.00, 20000.00, 10000.00,
 'La unidad SIN-1024-A alcanzó el umbral de 20,000 km para Cambio de aceite.',
 'cerrada', 4, NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days'),

(2, 4, COALESCE((SELECT id FROM tipo_mantenimiento WHERE nombre = 'Cambio de filtros' LIMIT 1), (SELECT id FROM tipo_mantenimiento ORDER BY id LIMIT 1)),
 14920.00, 15000.00, 100.00,
 'La unidad SIN-4112-D ingresó a taller preventivo para Cambio de filtros (15,000 km).',
 'atendida', 4, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),

(3, 2, COALESCE((SELECT id FROM tipo_mantenimiento WHERE nombre = 'Revisión de frenos' LIMIT 1), (SELECT id FROM tipo_mantenimiento ORDER BY id LIMIT 1)),
 44820.00, 45000.00, 25000.00,
 'Alerta preventiva: Unidad SIN-2048-B próxima a Revisión de frenos (intervalo 20,000 km).',
 'nueva', NULL, NOW() - INTERVAL '4 hours', NULL);

INSERT INTO mantenimiento (
    id, unidad_id, tipo_mantenimiento_id, alerta_id, fecha_realizado,
    km_al_momento, costo, taller, descripcion, evidencia_url, realizado_por, created_at
)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, COALESCE((SELECT id FROM tipo_mantenimiento WHERE nombre = 'Cambio de aceite' LIMIT 1), (SELECT id FROM tipo_mantenimiento ORDER BY id LIMIT 1)),
 1, NOW() - INTERVAL '28 days', 20110.00, 4850.00,
 'Taller Diésel Autorizado Culiacán',
 'Cambio de aceite sintético y filtro original completado sin contratiempos.',
 'https://evidencias.transportesrojas.mx/mant/sprinter-20k.pdf', 4, NOW() - INTERVAL '28 days'),

(2, 4, COALESCE((SELECT id FROM tipo_mantenimiento WHERE nombre = 'Cambio de filtros' LIMIT 1), (SELECT id FROM tipo_mantenimiento ORDER BY id LIMIT 1)),
 2, NOW() - INTERVAL '1 day', 14920.00, 3620.00,
 'Centro de Servicio Automotriz del Humaya',
 'Reemplazo de filtro de aire y filtro de combustible diésel.',
 'https://evidencias.transportesrojas.mx/mant/urvan-filtros.pdf', 4, NOW() - INTERVAL '1 day');

-- Envíos (PIN 123456)
INSERT INTO envio (
    id, guia, remitente_id, destinatario_cliente_id, destinatario_nombre, destinatario_telefono, destinatario_email,
    intento_reparto, requiere_recoleccion, sucursal_recepcion_id, sucursal_destino_id, direccion_destino_id,
    direccion_origen_snapshot, direccion_destino_snapshot,
    peso_kg, largo_cm, ancho_cm, alto_cm, descripcion, valor_declarado,
    codigo_validacion_hash, estado, creado_por_usuario_id,
    fecha_creacion, fecha_entrega_estimada, metadata, created_at, updated_at
)
OVERRIDING SYSTEM VALUE VALUES
(1, 'TR-2026-000101', 1, 2, 'Dra. Sofía Ramírez Duarte', '6677223344', 'sofia.ramirez@medipacifico.com',
 1, false, 1, 1, 6,
 '{"calle":"Blvd. Pedro Infante","numero_exterior":"2850","colonia":"Desarrollo Urbano Tres Ríos","codigo_postal":"80020","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 '{"calle":"Av. Nicolás Bravo","numero_exterior":"640","colonia":"Jorge Almada","codigo_postal":"80030","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 14.50, 45.00, 35.00, 30.00, 'Cajas con sensores de humedad y refacciones electrónicas para laboratorio', 8500.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==',
 'entregado', 6, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', '{"prioridad":"alta","fragil":true}'::jsonb, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
(2, 'TR-2026-000102', 3, 4, 'Mariana Castro Verdugo', '6677445566', 'mariana.castro@gmail.com',
 1, false, 1, 1, 7,
 '{"calle":"Av. Pascual Orozco","numero_exterior":"1425","colonia":"Nuevo Culiacán","codigo_postal":"80060","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 '{"calle":"Av. Universitarios","numero_exterior":"1120","colonia":"Universitaria","codigo_postal":"80040","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 6.20, 35.00, 25.00, 20.00, 'Kit de herramientas eléctricas inalámbricas y accesorios de precisión', 3200.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==',
 'entregado', 7, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', '{"prioridad":"normal"}'::jsonb, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
(3, 'TR-2026-000103', 2, 1, 'Ing. Carlos Mendoza Beltrán', '6677112233', 'carlos.mendoza@agrovalle.mx',
 1, false, 1, 1, 5,
 '{"calle":"Av. Nicolás Bravo","numero_exterior":"640","colonia":"Jorge Almada","codigo_postal":"80030","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 '{"calle":"Blvd. Pedro Infante","numero_exterior":"2850","colonia":"Desarrollo Urbano Tres Ríos","codigo_postal":"80020","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 18.00, 50.00, 40.00, 35.00, 'Equipo de diagnóstico portátil y reactivos sellados', 12400.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==',
 'en_ruta', 6, NOW() - INTERVAL '1 day', NOW() + INTERVAL '4 hours', '{"prioridad":"alta","pin_demo":"123456"}'::jsonb, NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours'),
(4, 'TR-2026-000104', 6, 3, 'Jorge Beltrán Félix', '6677334455', 'jorge.beltran@ferrepacifico.mx',
 1, false, 1, 1, 9,
 '{"calle":"Calzada Heroico Colegio Militar","numero_exterior":"3100","colonia":"Sinaloa","codigo_postal":"80010","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 '{"calle":"Av. Pascual Orozco","numero_exterior":"1425","colonia":"Nuevo Culiacán","codigo_postal":"80060","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 28.50, 60.00, 45.00, 40.00, 'Compresor hidráulico compacto y mangueras de alta presión', 9800.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==',
 'en_ruta', 7, NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 hours', '{"prioridad":"normal","pin_demo":"123456"}'::jsonb, NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours'),
(5, 'TR-2026-000105', 1, NULL, 'Arq. Roberto Castañeda', '6677889900', 'roberto.castaneda@constructora.mx',
 0, false, 1, 1, 8,
 '{"calle":"Blvd. Pedro Infante","numero_exterior":"2850","colonia":"Desarrollo Urbano Tres Ríos","codigo_postal":"80020","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 '{"calle":"Calle Presa Valsequillo","numero_exterior":"915","colonia":"Las Quintas","codigo_postal":"80050","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 12.00, 40.00, 30.00, 25.00, 'Planos arquitectónicos certificados y maqueta de proyecto residencial', 5600.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==',
 'recibido_sucursal', 7, NOW() - INTERVAL '6 hours', NOW() + INTERVAL '1 day', '{"listo_para_ruta":true}'::jsonb, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '4 hours'),
(6, 'TR-2026-000106', 2, NULL, 'Clínica San José Chapultepec', '6677991122', 'compras@clinicasanjose.mx',
 0, false, 1, 1, 11,
 '{"calle":"Av. Nicolás Bravo","numero_exterior":"640","colonia":"Jorge Almada","codigo_postal":"80030","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 '{"calle":"Blvd. Enrique Sánchez Alonso","numero_exterior":"1980","colonia":"Chapultepec","codigo_postal":"80058","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 19.40, 55.00, 40.00, 35.00, 'Suministros médicos esterilizados y monitores de signos vitales', 15200.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==',
 'recibido_sucursal', 7, NOW() - INTERVAL '5 hours', NOW() + INTERVAL '1 day', '{"listo_para_ruta":true,"fragil":true}'::jsonb, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '3 hours'),
(7, 'TR-2026-000107', 6, 1, 'Agroindustrias del Valle Planta Sur', '6677112233', 'planta@agrovalle.mx',
 0, true, 2, 2, 10,
 '{"calle":"Calzada Heroico Colegio Militar","numero_exterior":"3100","colonia":"Sinaloa","codigo_postal":"80010","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 '{"calle":"Blvd. Jesús Kumate","numero_exterior":"4300","colonia":"Parque Industrial Canaco","codigo_postal":"80120","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 42.00, 80.00, 60.00, 50.00, 'Refacciones agrícolas para tractores y bombas de riego', 18900.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==',
 'recoleccion_realizada', 6, NOW() - INTERVAL '4 hours', NOW() + INTERVAL '1 day', '{"requiere_montacargas":false}'::jsonb, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '1 hour'),
(8, 'TR-2026-000108', 1, 5, 'Ricardo Lizárraga Sánchez', '6699112233', 'ricardo.lizarraga@maritimamaz.mx',
 0, true, 1, 3, 13,
 '{"calle":"Blvd. Pedro Infante","numero_exterior":"2850","colonia":"Desarrollo Urbano Tres Ríos","codigo_postal":"80020","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 '{"calle":"Av. Camarón Sábalo","numero_exterior":"2040","colonia":"Zona Dorada","codigo_postal":"82110","municipio":"Mazatlán","estado":"Sinaloa"}'::jsonb,
 22.00, 50.00, 40.00, 40.00, 'Refacciones de acero inoxidable para embarcaciones y válvulas', 11000.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==',
 'recoleccion_programada', 6, NOW() - INTERVAL '3 hours', NOW() + INTERVAL '2 days', '{"foraneo_sinaloa":true}'::jsonb, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours'),
(9, 'TR-2026-000109', 3, 4, 'Mariana Castro Verdugo', '6677445566', 'mariana.castro@gmail.com',
 1, false, 1, 1, 7,
 '{"calle":"Av. Pascual Orozco","numero_exterior":"1425","colonia":"Nuevo Culiacán","codigo_postal":"80060","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 '{"calle":"Av. Universitarios","numero_exterior":"1120","colonia":"Universitaria","codigo_postal":"80040","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 8.50, 40.00, 30.00, 20.00, 'Luminarias LED arquitectónicas para interior', 4100.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==',
 'reprogramado', 6, NOW() - INTERVAL '3 days', NOW() + INTERVAL '1 day', '{"motivo_reprogramacion":"Cliente ausente en primer intento"}'::jsonb, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
(10, 'TR-2026-000110', 6, NULL, 'Talleres del Norte Los Mochis', '6688223344', 'contacto@talleresnorte.mx',
 2, false, 2, 4, 14,
 '{"calle":"Calzada Heroico Colegio Militar","numero_exterior":"3100","colonia":"Sinaloa","codigo_postal":"80010","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 '{"calle":"Blvd. Antonio Rosales","numero_exterior":"1560","colonia":"Scally","codigo_postal":"81240","municipio":"Ahome","estado":"Sinaloa"}'::jsonb,
 31.00, 65.00, 45.00, 40.00, 'Alternadores industriales y bandas de distribución', 14500.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==',
 'en_devolucion', 6, NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days', '{"devolucion_activa":true}'::jsonb, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
(11, 'TR-2026-000111', 4, 2, 'Dra. Sofía Ramírez Duarte', '6677223344', 'sofia.ramirez@medipacifico.com',
 0, false, 1, 1, 6,
 '{"calle":"Av. Universitarios","numero_exterior":"1120","colonia":"Universitaria","codigo_postal":"80040","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 '{"calle":"Av. Nicolás Bravo","numero_exterior":"640","colonia":"Jorge Almada","codigo_postal":"80030","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 3.00, 25.00, 20.00, 15.00, 'Documentación técnica y muestras de empaque', 1200.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==',
 'cancelado', 17, NOW() - INTERVAL '4 days', NULL, '{"cancelado_por_remitente":true}'::jsonb, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),
(12, 'TR-2026-000112', 1, 6, 'Elena Valenzuela Quiñónez', '6677556677', 'elena.valenzuela@refaccionesnw.mx',
 0, false, 1, 2, 12,
 '{"calle":"Blvd. Pedro Infante","numero_exterior":"2850","colonia":"Desarrollo Urbano Tres Ríos","codigo_postal":"80020","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 '{"calle":"Calzada Heroico Colegio Militar","numero_exterior":"3100","colonia":"Sinaloa","codigo_postal":"80010","municipio":"Culiacán","estado":"Sinaloa"}'::jsonb,
 9.80, 40.00, 30.00, 25.00, 'Módulos de control electrónico para maquinaria agrícola', 6400.00,
 'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wB/Jpk+JfHwv8SqHKaPKb/2FKw8fkkH1ONQ0WjFrPas3w==',
 'registrado', 14, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '1 day', '{"origen_registro":"portal_clientes"}'::jsonb, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour');

-- Recepción, citas, SMS y eventos
INSERT INTO recepcion_paquete (
    id, envio_id, recibido_por, fecha_recepcion,
    peso_verificado_kg, largo_verificado_cm, ancho_verificado_cm, alto_verificado_cm,
    evidencia_foto_url, observaciones, created_at
)
OVERRIDING SYSTEM VALUE VALUES
(1, 1,  7,  NOW() - INTERVAL '2 days',  14.50, 45.00, 35.00, 30.00, 'https://evidencias.transportesrojas.mx/recep/envio-101.jpg', 'Embalaje verificado con sello de seguridad intacto.',     NOW() - INTERVAL '2 days'),
(2, 2,  7,  NOW() - INTERVAL '2 days',   6.20, 35.00, 25.00, 20.00, 'https://evidencias.transportesrojas.mx/recep/envio-102.jpg', 'Caja rígida en buen estado físico.',                      NOW() - INTERVAL '2 days'),
(3, 3,  7,  NOW() - INTERVAL '1 day',   18.00, 50.00, 40.00, 35.00, 'https://evidencias.transportesrojas.mx/recep/envio-103.jpg', 'Paquete etiquetado como frágil, verificado en báscula.',  NOW() - INTERVAL '1 day'),
(4, 4,  7,  NOW() - INTERVAL '1 day',   28.50, 60.00, 45.00, 40.00, 'https://evidencias.transportesrojas.mx/recep/envio-104.jpg', 'Empaque industrial reforzado con fleje plástico.',        NOW() - INTERVAL '1 day'),
(5, 5,  7,  NOW() - INTERVAL '5 hours', 12.00, 40.00, 30.00, 25.00, 'https://evidencias.transportesrojas.mx/recep/envio-105.jpg', 'Recibido en mostrador Matriz Culiacán, listo para ruta.', NOW() - INTERVAL '5 hours'),
(6, 6,  7,  NOW() - INTERVAL '4 hours', 19.40, 55.00, 40.00, 35.00, 'https://evidencias.transportesrojas.mx/recep/envio-106.jpg', 'Recibido en mostrador Matriz Culiacán, listo para ruta.', NOW() - INTERVAL '4 hours'),
(7, 9,  7,  NOW() - INTERVAL '3 days',   8.50, 40.00, 30.00, 20.00, 'https://evidencias.transportesrojas.mx/recep/envio-109.jpg', 'Verificado sin daños en recepción inicial.',              NOW() - INTERVAL '3 days'),
(8, 10, 12, NOW() - INTERVAL '5 days',  31.00, 65.00, 45.00, 40.00, 'https://evidencias.transportesrojas.mx/recep/envio-110.jpg', 'Recibido en Centro Operativo Poniente.',                  NOW() - INTERVAL '5 days');

INSERT INTO cita_recoleccion (
    id, envio_id, direccion_recoleccion_id, fecha_hora_solicitada, fecha_hora_confirmada,
    estado, motivo, observaciones, created_at, updated_at
)
OVERRIDING SYSTEM VALUE VALUES
(1, 7, 12, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours',
 'atendida', 'Recolección industrial programada', 'Atendida en Andén 2 de Almacén Calzada Heroico Colegio Militar', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '1 hour'),
(2, 8, 5,  NOW() + INTERVAL '1 day',   NOW() + INTERVAL '1 day',
 'confirmada', 'Recolección en corporativo Tres Ríos', 'Confirmada con recepción de Planta Baja Torre Tres Ríos', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours');

INSERT INTO aviso_sms (
    id, envio_id, intento_reparto, telefono_destino, mensaje,
    estado, id_proveedor, intentos_reintento, fecha_solicitud, fecha_confirmacion
)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 1, '6677223344', 'Transportes Rojas: Su envío TR-2026-000101 está en ruta de entrega. PIN de recepción: 123456', 'aceptado_proveedor', 'TWILIO-MSG-00101', 0, NOW() - INTERVAL '1 day',   NOW() - INTERVAL '1 day'),
(2, 2, 1, '6677445566', 'Transportes Rojas: Su envío TR-2026-000102 está en ruta de entrega. PIN de recepción: 123456', 'aceptado_proveedor', 'TWILIO-MSG-00102', 0, NOW() - INTERVAL '1 day',   NOW() - INTERVAL '1 day'),
(3, 3, 1, '6677112233', 'Transportes Rojas: Su envío TR-2026-000103 va en camino con nuestro chofer. PIN: 123456',      'aceptado_proveedor', 'TWILIO-MSG-00103', 0, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
(4, 4, 1, '6677334455', 'Transportes Rojas: Su envío TR-2026-000104 va en camino con nuestro chofer. PIN: 123456',      'aceptado_proveedor', 'TWILIO-MSG-00104', 0, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours');

INSERT INTO evento_envio (
    id, envio_id, estado, descripcion, latitud, longitud, usuario_id, fecha_evento
)
OVERRIDING SYSTEM VALUE VALUES
(1,  1,  'registrado',             'Envío registrado en sistema con guía TR-2026-000101',                      24.8049100, -107.3940100, 6,  NOW() - INTERVAL '2 days'),
(2,  1,  'recibido_sucursal',      'Paquete recibido y verificado físicamente en Sucursal Matriz Culiacán',    24.8049100, -107.3940100, 7,  NOW() - INTERVAL '44 hours'),
(3,  1,  'en_ruta',                'En ruta de reparto de última milla — Unidad SIN-1024-A',                   24.8049100, -107.3940100, 5,  NOW() - INTERVAL '28 hours'),
(4,  1,  'entregado',              'Entrega exitosa validada con código PIN por destinatario',                 24.7941000, -107.3992000, 8,  NOW() - INTERVAL '25 hours'),
(5,  2,  'registrado',             'Envío registrado en sistema con guía TR-2026-000102',                      24.8049100, -107.3940100, 7,  NOW() - INTERVAL '2 days'),
(6,  2,  'entregado',              'Entrega exitosa validada con código PIN en Col. Universitaria',            24.8245000, -107.3812000, 8,  NOW() - INTERVAL '24 hours'),
(7,  3,  'registrado',             'Envío registrado en sistema con guía TR-2026-000103',                      24.8049100, -107.3940100, 6,  NOW() - INTERVAL '1 day'),
(8,  3,  'recibido_sucursal',      'Paquete verificado en báscula y asignado a zona Tres Ríos',                24.8049100, -107.3940100, 7,  NOW() - INTERVAL '18 hours'),
(9,  3,  'en_ruta',                'Ruta optimizada iniciada por Chofer Carlos Martínez (Unidad SIN-1024-A)', 24.8049100, -107.3940100, 5,  NOW() - INTERVAL '2 hours'),
(10, 4,  'registrado',             'Envío registrado en sistema con guía TR-2026-000104',                      24.8049100, -107.3940100, 7,  NOW() - INTERVAL '1 day'),
(11, 4,  'en_ruta',                'En ruta de entrega optimizada — Parada #2 en Nuevo Culiacán',              24.8049100, -107.3940100, 5,  NOW() - INTERVAL '2 hours'),
(12, 5,  'recibido_sucursal',      'Paquete recibido en Sucursal Matriz Culiacán, disponible para ruta',       24.8049100, -107.3940100, 7,  NOW() - INTERVAL '5 hours'),
(13, 6,  'recibido_sucursal',      'Paquete recibido en Sucursal Matriz Culiacán, disponible para ruta',       24.8049100, -107.3940100, 7,  NOW() - INTERVAL '4 hours'),
(14, 7,  'recoleccion_realizada',  'Recolección completada en domicilio del remitente por Chofer',             24.7782000, -107.3698000, 10, NOW() - INTERVAL '1 hour'),
(15, 8,  'recoleccion_programada', 'Cita de recolección confirmada para mañana en horario matutino',           24.8129000, -107.4085000, 6,  NOW() - INTERVAL '2 hours'),
(16, 9,  'reprogramado',           'Entrega reprogramada tras primer intento con destinatario ausente',        24.8245000, -107.3812000, 4,  NOW() - INTERVAL '1 day'),
(17, 10, 'en_devolucion',          'Proceso de devolución a sucursal de origen iniciado por rechazo',          25.7982000, -108.9985000, 4,  NOW() - INTERVAL '1 day'),
(18, 11, 'cancelado',              'Guía cancelada a solicitud del cliente remitente antes de despacho',       24.8049100, -107.3940100, 17, NOW() - INTERVAL '3 days'),
(19, 12, 'registrado',             'Guía generada desde el Portal de Clientes',                                24.8129000, -107.4085000, 14, NOW() - INTERVAL '1 hour');

-- Rutas, paradas, entregas y desvíos
INSERT INTO ruta (
    id, chofer_id, unidad_id, flotilla_id, fecha, estado, origen_sucursal_id,
    hora_inicio, hora_fin, km_inicial_odometro, km_final_odometro,
    distancia_estimada_km, tiempo_estimado_min, created_by, created_at, updated_at
)
OVERRIDING SYSTEM VALUE VALUES
(1, 8, 1, 1, CURRENT_DATE - 1, 'finalizada', 1,
 NOW() - INTERVAL '1 day 9 hours', NOW() - INTERVAL '1 day 2 hours',
 24642.00, 24680.50,
 36.40, 95, 5, NOW() - INTERVAL '1 day 10 hours', NOW() - INTERVAL '1 day 2 hours'),
(2, 8, 1, 1, CURRENT_DATE, 'en_curso', 1,
 NOW() - INTERVAL '2 hours', NULL,
 24680.50, NULL,
 24.80, 68, 5, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours');

INSERT INTO ruta_envio (id, ruta_id, envio_id, orden_entrega, estado)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 1, 1, 'entregado'),
(2, 1, 2, 2, 'entregado'),
(3, 1, 9, 3, 'reprogramado'),
(4, 2, 3, 1, 'pendiente'),
(5, 2, 4, 2, 'pendiente');

INSERT INTO entrega (
    id, envio_id, intento_reparto, chofer_id, ruta_id, fecha_hora,
    codigo_ingresado, validado, evidencia_foto_url, firma_url,
    latitud, longitud, estado, observaciones, created_at
)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 1, 8, 1, NOW() - INTERVAL '25 hours', '123456', true,
 'https://evidencias.transportesrojas.mx/entregas/tr-101-foto.jpg',
 'https://evidencias.transportesrojas.mx/entregas/tr-101-firma.png',
 24.7941000, -107.3992000, 'exitosa', 'Entregado en recepción de almacén médico previa validación de PIN.', NOW() - INTERVAL '25 hours'),
(2, 2, 1, 8, 1, NOW() - INTERVAL '24 hours', '123456', true,
 'https://evidencias.transportesrojas.mx/entregas/tr-102-foto.jpg',
 'https://evidencias.transportesrojas.mx/entregas/tr-102-firma.png',
 24.8245000, -107.3812000, 'exitosa', 'Entregado en domicilio del destinatario sin contratiempos.', NOW() - INTERVAL '24 hours'),
(3, 9, 1, 8, 1, NOW() - INTERVAL '23 hours', NULL,     false,
 'https://evidencias.transportesrojas.mx/entregas/tr-109-fachada.jpg',
 NULL,
 24.8245000, -107.3812000, 'fallida', 'No se encontró al destinatario en el domicilio tras dos llamadas telefónicas.', NOW() - INTERVAL '23 hours');

INSERT INTO cambio_ruta (
    id, folio, ruta_id, chofer_id, unidad_id, motivo,
    referencia_lugar, descripcion_trayecto, fecha_evento, afecta_entrega, estado_aviso, fecha_registro
)
OVERRIDING SYSTEM VALUE VALUES
(1, 'CR-2026-0001', 2, 8, 1,
 'Cierre vial temporal por obras en acceso a Puente Negro',
 'Crucero Blvd. Pedro Infante y Pte. Miguel Hidalgo',
 'Se tomó vía alterna por Blvd. Alfonso Zaragoza Maytorena hacia Desarrollo Urbano Tres Ríos, ahorrando 9 minutos.',
 NOW() - INTERVAL '1 hour', false, 'enviado', NOW() - INTERVAL '1 hour');

-- Incidencias, devoluciones y cancelaciones
INSERT INTO incidencia (
    id, envio_id, ruta_id, tipo, descripcion, evidencia_url,
    estado, fecha_reporte, fecha_cierre
)
OVERRIDING SYSTEM VALUE VALUES
(1, 9, 1, 'cliente_ausente',
 'Se acudió al domicilio en Col. Universitaria a las 14:20 hrs; nadie atendió el interfón ni llamadas.',
 'https://evidencias.transportesrojas.mx/incidencias/inc-109.jpg',
 'resuelta', NOW() - INTERVAL '23 hours', NOW() - INTERVAL '20 hours'),
(2, 3, 2, 'vial',
 'Tráfico denso por mantenimiento de semáforos en crucero de Tres Ríos, retraso estimado de 10 minutos.',
 NULL,
 'en_revision', NOW() - INTERVAL '1 hour', NULL);

INSERT INTO reprogramacion (
    id, envio_id, incidencia_id, nueva_fecha_hora, motivo, estado, created_at
)
OVERRIDING SYSTEM VALUE VALUES
(1, 9, 1, NOW() + INTERVAL '1 day',
 'El destinatario confirmó vía telefónica disponibilidad a partir de las 10:00 AM de mañana.',
 'confirmada', NOW() - INTERVAL '20 hours');

INSERT INTO devolucion (
    id, envio_id, motivo, origen_solicitud, estado, evidencia_url,
    sucursal_destino_id, fecha_inicio, fecha_recepcion, fecha_cierre,
    aceptada_por_remitente, observaciones
)
OVERRIDING SYSTEM VALUE VALUES
(1, 10,
 'El destinatario indicó que el número de parte del alternador solicitado requería especificación de 24V.',
 'rechazo_destinatario', 'en_transito',
 'https://evidencias.transportesrojas.mx/devoluciones/dev-110.jpg',
 2, NOW() - INTERVAL '1 day', NULL, NULL, true,
 'Paquete retornando a Centro Operativo Culiacán Poniente para entrega al remitente.');

INSERT INTO reclamacion (
    id, devolucion_id, envio_id, motivo, estado, evidencia_url, fecha_apertura, fecha_cierre
)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 10,
 'Solicitud de condonación parcial de guía de retorno por discrepancia en orden de compra del destinatario.',
 'en_revision', 'https://evidencias.transportesrojas.mx/reclamaciones/rec-110.pdf',
 NOW() - INTERVAL '18 hours', NULL);

INSERT INTO cancelacion (
    id, envio_id, motivo, actor_tipo, actor_usuario_id, estado, fecha_solicitud, fecha_aplicacion
)
OVERRIDING SYSTEM VALUE VALUES
(1, 11,
 'El cliente solicitó cancelar el envío antes de su ingreso a ruta porque enviará la documentación de forma digital.',
 'remitente', 17, 'aplicada', NOW() - INTERVAL '3 days 2 hours', NOW() - INTERVAL '3 days');

-- Telemetría GPS, alertas y quejas
INSERT INTO telemetria_unidad (id, unidad_id, ruta_id, latitud, longitud, fecha_hora)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 2, 24.8049100, -107.3940100, NOW() - INTERVAL '110 minutes'),
(2, 1, 2, 24.8085000, -107.4012000, NOW() - INTERVAL '80 minutes'),
(3, 1, 2, 24.8129000, -107.4085000, NOW() - INTERVAL '45 minutes'),
(4, 1, 2, 24.7985000, -107.3920000, NOW() - INTERVAL '15 minutes');

INSERT INTO alerta (
    id, tipo, flotilla_id, unidad_id, chofer_id, envio_id, ruta_id,
    descripcion, latitud, longitud, estado, atendida_por, fecha_alerta, fecha_atencion
)
OVERRIDING SYSTEM VALUE VALUES
(1, 'desvio_ruta', 1, 1, 8, 3, 2,
 'Ajuste de trayecto autorizado en Ruta #2 por cierre vial en puente.',
 24.8085000, -107.4012000, 'atendida', 5, NOW() - INTERVAL '60 minutes', NOW() - INTERVAL '45 minutes');

INSERT INTO evaluacion (id, envio_id, puntuacion, comentarios, fecha_evaluacion)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 5, 'Excelente servicio de Transportes Rojas, el paquete médico llegó a tiempo y el chofer validó el PIN con mucha amabilidad.', NOW() - INTERVAL '22 hours'),
(2, 2, 5, 'Entrega rápida y seguimiento claro desde la sucursal hasta mi domicilio.', NOW() - INTERVAL '20 hours');

INSERT INTO queja (
    id, folio, envio_id, motivo, descripcion, estado,
    fecha_reporte, fecha_cierre, resolucion, atendida_por
)
OVERRIDING SYSTEM VALUE VALUES
(1, 'QJ-2026-0001', 9,
 'Solicitud de ventana horaria matutina en segundo intento de entrega',
 'La clienta solicita que la reprogramación del envío TR-2026-000109 se realice antes de las 13:00 hrs.',
 'resuelta', NOW() - INTERVAL '21 hours', NOW() - INTERVAL '19 hours',
 'Se coordinó con el Jefe de Flotilla priorizar la parada #1 en la ruta matutina y se confirmó con la clienta.', 12);

INSERT INTO queja_seguimiento (
    id, queja_id, empleado_id, accion, estado_anterior, estado_nuevo, fecha
)
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 12, 'Recepción de solicitud telefónica y asignación de prioridad matutina.', 'abierta',     'en_atencion', NOW() - INTERVAL '20 hours'),
(2, 1, 4,  'Confirmación de reprogramación autorizada por Supervisión de Operaciones.', 'en_atencion', 'resuelta',    NOW() - INTERVAL '19 hours');

-- Sincronización de secuencias
SELECT setval(pg_get_serial_sequence('direccion', 'id'),                  COALESCE((SELECT MAX(id) FROM direccion), 1), true);
SELECT setval(pg_get_serial_sequence('sucursal', 'id'),                   COALESCE((SELECT MAX(id) FROM sucursal), 1), true);
SELECT setval(pg_get_serial_sequence('horario_sucursal', 'id'),           COALESCE((SELECT MAX(id) FROM horario_sucursal), 1), true);
SELECT setval(pg_get_serial_sequence('sucursal_cobertura', 'id'),         COALESCE((SELECT MAX(id) FROM sucursal_cobertura), 1), true);
SELECT setval(pg_get_serial_sequence('usuario', 'id'),                    COALESCE((SELECT MAX(id) FROM usuario), 1), true);
SELECT setval(pg_get_serial_sequence('usuario_estado_historial', 'id'),   COALESCE((SELECT MAX(id) FROM usuario_estado_historial), 1), true);
SELECT setval(pg_get_serial_sequence('empleado', 'id'),                   COALESCE((SELECT MAX(id) FROM empleado), 1), true);
SELECT setval(pg_get_serial_sequence('empleado_puesto_historial', 'id'),  COALESCE((SELECT MAX(id) FROM empleado_puesto_historial), 1), true);
SELECT setval(pg_get_serial_sequence('cliente', 'id'),                    COALESCE((SELECT MAX(id) FROM cliente), 1), true);
SELECT setval(pg_get_serial_sequence('cliente_direccion', 'id'),          COALESCE((SELECT MAX(id) FROM cliente_direccion), 1), true);
SELECT setval(pg_get_serial_sequence('flotilla', 'id'),                   COALESCE((SELECT MAX(id) FROM flotilla), 1), true);
SELECT setval(pg_get_serial_sequence('unidad', 'id'),                     COALESCE((SELECT MAX(id) FROM unidad), 1), true);
SELECT setval(pg_get_serial_sequence('asignacion_flotilla_chofer', 'id'), COALESCE((SELECT MAX(id) FROM asignacion_flotilla_chofer), 1), true);
SELECT setval(pg_get_serial_sequence('alerta_mantenimiento', 'id'),       COALESCE((SELECT MAX(id) FROM alerta_mantenimiento), 1), true);
SELECT setval(pg_get_serial_sequence('mantenimiento', 'id'),              COALESCE((SELECT MAX(id) FROM mantenimiento), 1), true);
SELECT setval(pg_get_serial_sequence('envio', 'id'),                      COALESCE((SELECT MAX(id) FROM envio), 1), true);
SELECT setval(pg_get_serial_sequence('recepcion_paquete', 'id'),          COALESCE((SELECT MAX(id) FROM recepcion_paquete), 1), true);
SELECT setval(pg_get_serial_sequence('cita_recoleccion', 'id'),           COALESCE((SELECT MAX(id) FROM cita_recoleccion), 1), true);
SELECT setval(pg_get_serial_sequence('aviso_sms', 'id'),                  COALESCE((SELECT MAX(id) FROM aviso_sms), 1), true);
SELECT setval(pg_get_serial_sequence('evento_envio', 'id'),               COALESCE((SELECT MAX(id) FROM evento_envio), 1), true);
SELECT setval(pg_get_serial_sequence('ruta', 'id'),                       COALESCE((SELECT MAX(id) FROM ruta), 1), true);
SELECT setval(pg_get_serial_sequence('ruta_envio', 'id'),                 COALESCE((SELECT MAX(id) FROM ruta_envio), 1), true);
SELECT setval(pg_get_serial_sequence('entrega', 'id'),                    COALESCE((SELECT MAX(id) FROM entrega), 1), true);
SELECT setval(pg_get_serial_sequence('cambio_ruta', 'id'),                COALESCE((SELECT MAX(id) FROM cambio_ruta), 1), true);
SELECT setval(pg_get_serial_sequence('incidencia', 'id'),                 COALESCE((SELECT MAX(id) FROM incidencia), 1), true);
SELECT setval(pg_get_serial_sequence('reprogramacion', 'id'),             COALESCE((SELECT MAX(id) FROM reprogramacion), 1), true);
SELECT setval(pg_get_serial_sequence('devolucion', 'id'),                 COALESCE((SELECT MAX(id) FROM devolucion), 1), true);
SELECT setval(pg_get_serial_sequence('reclamacion', 'id'),                COALESCE((SELECT MAX(id) FROM reclamacion), 1), true);
SELECT setval(pg_get_serial_sequence('cancelacion', 'id'),                COALESCE((SELECT MAX(id) FROM cancelacion), 1), true);
SELECT setval(pg_get_serial_sequence('telemetria_unidad', 'id'),          COALESCE((SELECT MAX(id) FROM telemetria_unidad), 1), true);
SELECT setval(pg_get_serial_sequence('alerta', 'id'),                     COALESCE((SELECT MAX(id) FROM alerta), 1), true);
SELECT setval(pg_get_serial_sequence('evaluacion', 'id'),                 COALESCE((SELECT MAX(id) FROM evaluacion), 1), true);
SELECT setval(pg_get_serial_sequence('queja', 'id'),                      COALESCE((SELECT MAX(id) FROM queja), 1), true);
SELECT setval(pg_get_serial_sequence('queja_seguimiento', 'id'),          COALESCE((SELECT MAX(id) FROM queja_seguimiento), 1), true);

COMMIT;
