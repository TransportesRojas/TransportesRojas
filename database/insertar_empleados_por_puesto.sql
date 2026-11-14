-- Alta de empleados por puesto (clave DepR6670000000)

BEGIN;

-- Tabla temporal de carga
CREATE TEMP TABLE tmp_nuevos_empleados (
    email TEXT,
    puesto_nombre TEXT,
    rol_nombre TEXT,
    nombre TEXT,
    apellido_paterno TEXT,
    apellido_materno TEXT,
    telefono TEXT,
    fecha_ingreso DATE
) ON COMMIT DROP;

INSERT INTO tmp_nuevos_empleados (
    email, puesto_nombre, rol_nombre, nombre, apellido_paterno, apellido_materno, telefono, fecha_ingreso
) VALUES
-- Gerente General
('gerente.general1@transportesrojas.mx', 'Gerente General', 'Jefe', 'Ricardo', 'Rojas', 'Medina', '6672450918', '2020-03-01'),
('gerente.general2@transportesrojas.mx', 'Gerente General', 'Jefe', 'Patricia', 'Morales', 'Beltrán', '6671010101', '2021-06-15'),

-- Recursos Humanos
('rh1@transportesrojas.mx', 'Recursos Humanos', 'RH', 'Ana Lucía', 'López', 'García', '6677001002', '2022-06-15'),
('rh2@transportesrojas.mx', 'Recursos Humanos', 'RH', 'Marcela', 'Espinoza', 'Duarte', '6671040404', '2023-02-01'),

-- Supervisor
('supervisor1@transportesrojas.mx', 'Supervisor', 'Supervisor', 'Héctor', 'Valenzuela', 'Montoya', '6677001003', '2022-09-01'),
('supervisor2@transportesrojas.mx', 'Supervisor', 'Supervisor', 'Roberto Carlos', 'Beltrán', 'Castro', '6671050505', '2023-05-15'),

-- Jefe de flotilla
('jefe.flotilla1@transportesrojas.mx', 'Jefe de flotilla', 'Jefe de flotilla', 'Marco Antonio', 'Gaxiola', 'Leyva', '6677001004', '2023-01-15'),
('jefe.flotilla2@transportesrojas.mx', 'Jefe de flotilla', 'Jefe de flotilla', 'Iván Salvador', 'Coronel', 'Vega', '6671060606', '2023-11-10'),

-- Chofer
('chofer1@transportesrojas.mx', 'Chofer', 'Chofer', 'Carlos Alberto', 'Martínez', 'Pérez', '6677001007', '2023-05-20'),
('chofer2@transportesrojas.mx', 'Chofer', 'Chofer', 'Fernando', 'Sánchez', 'Ochoa', '6677001008', '2023-08-12'),

-- Administrativo
('admin1@transportesrojas.mx', 'Administrativo', 'Personal administrativo', 'Laura Elena', 'Cárdenas', 'Ibarra', '6677001005', '2023-04-10'),
('admin2@transportesrojas.mx', 'Administrativo', 'Personal administrativo', 'José Ramón', 'Medina', 'Félix', '6671070707', '2024-01-15'),

-- Atención a clientes
('atencion1@transportesrojas.mx', 'Atención a clientes', 'Personal administrativo', 'Paulina', 'Meza', 'Sepúlveda', '6677001010', '2024-03-01'),
('atencion2@transportesrojas.mx', 'Atención a clientes', 'Personal administrativo', 'Valeria Sofía', 'Quintero', 'Félix', '6671080808', '2024-04-20'),

-- Personal de sucursal
('sucursal1@transportesrojas.mx', 'Personal de sucursal', 'Personal de sucursal', 'Daniela Guadalupe', 'Osuna', 'Tirado', '6677001006', '2023-07-01'),
('sucursal2@transportesrojas.mx', 'Personal de sucursal', 'Personal de sucursal', 'Brenda Lizeth', 'Murillo', 'Uriarte', '6671090909', '2024-02-15');

-- Cuentas de usuario
INSERT INTO usuario (email, password_hash, tipo_usuario, activo)
SELECT 
    t.email,
    'AQAAAAEAAYagAAAAEBEiM0RVZneImaq7zN3u/wDoX76yeGT1WS/rd9U1GMRFvCY7R4u9ly6pswIBN2j8NQ==',
    'empleado',
    TRUE
FROM tmp_nuevos_empleados t
WHERE NOT EXISTS (
    SELECT 1 FROM usuario u WHERE u.email = t.email
);

-- Roles por usuario
INSERT INTO usuario_rol (usuario_id, rol_id)
SELECT u.id, r.id
FROM tmp_nuevos_empleados t
JOIN usuario u ON u.email = t.email
JOIN rol r ON r.nombre = t.rol_nombre
ON CONFLICT (usuario_id, rol_id) DO NOTHING;

-- Registro de empleados
INSERT INTO empleado (
    usuario_id, sucursal_id, nombre, apellido_paterno, apellido_materno,
    telefono, email, fecha_ingreso, activo, created_at, updated_at
)
SELECT 
    u.id,
    (SELECT id FROM sucursal ORDER BY id LIMIT 1),
    t.nombre,
    t.apellido_paterno,
    t.apellido_materno,
    t.telefono,
    t.email,
    t.fecha_ingreso,
    TRUE,
    NOW(),
    NOW()
FROM tmp_nuevos_empleados t
JOIN usuario u ON u.email = t.email
WHERE NOT EXISTS (
    SELECT 1 FROM empleado e WHERE e.usuario_id = u.id
);

-- Historial de puestos
INSERT INTO empleado_puesto_historial (
    empleado_id, puesto_id, fecha_inicio, motivo, created_at
)
SELECT 
    e.id,
    p.id,
    t.fecha_ingreso,
    'Alta y asignación oficial al puesto de ' || p.nombre,
    NOW()
FROM tmp_nuevos_empleados t
JOIN usuario u ON u.email = t.email
JOIN empleado e ON e.usuario_id = u.id
JOIN puesto p ON p.nombre = t.puesto_nombre
WHERE NOT EXISTS (
    SELECT 1 FROM empleado_puesto_historial eph 
    WHERE eph.empleado_id = e.id AND eph.puesto_id = p.id
);

COMMIT;

-- Verificación final
SELECT 
    e.id AS no_empleado,
    e.nombre || ' ' || e.apellido_paterno || COALESCE(' ' || e.apellido_materno, '') AS nombre_completo,
    p.nombre AS puesto,
    r.nombre AS rol_sistema,
    e.email,
    e.telefono,
    'DepR6670000000' AS contrasena
FROM empleado e
JOIN empleado_puesto_historial eph ON eph.empleado_id = e.id AND eph.fecha_fin IS NULL
JOIN puesto p ON p.id = eph.puesto_id
JOIN usuario u ON u.id = e.usuario_id
JOIN usuario_rol ur ON ur.usuario_id = u.id
JOIN rol r ON r.id = ur.rol_id
ORDER BY p.id, e.id;

