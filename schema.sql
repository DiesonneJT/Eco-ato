CREATE DATABASE IF NOT EXISTS econato
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE econato;


CREATE TABLE sectores (
  id_sector   TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(60)      NOT NULL,
  PRIMARY KEY (id_sector),
  UNIQUE KEY uq_sector_nombre (nombre)
) ENGINE=InnoDB;

INSERT INTO sectores (nombre) VALUES
  ('Tecnología'), ('Manufactura'), ('Comercio'),
  ('Salud'), ('Educación'), ('Otro');



CREATE TABLE empresas (
  id_empresa      INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(150)     NOT NULL,
  nit             VARCHAR(20)      NOT NULL,
  id_sector       TINYINT UNSIGNED NOT NULL,
  email           VARCHAR(150)     NOT NULL,
  pass_hash       VARCHAR(255)     NOT NULL,
  activo          TINYINT(1)       NOT NULL DEFAULT 1,
  creado_en       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_empresa),
  UNIQUE KEY uq_empresa_email (email),
  UNIQUE KEY uq_empresa_nit   (nit),
  CONSTRAINT fk_empresa_sector
    FOREIGN KEY (id_sector) REFERENCES sectores (id_sector)
) ENGINE=InnoDB;



CREATE TABLE sesiones (
  id_sesion     CHAR(64)         NOT NULL,
  id_empresa    INT UNSIGNED     NOT NULL,
  ip_origen     VARCHAR(45)      NULL,
  user_agent    VARCHAR(512)     NULL,
  creada_en     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en     DATETIME         NOT NULL,
  activa        TINYINT(1)       NOT NULL DEFAULT 1,
  PRIMARY KEY (id_sesion),
  KEY idx_sesion_empresa (id_empresa),
  CONSTRAINT fk_sesion_empresa
    FOREIGN KEY (id_empresa) REFERENCES empresas (id_empresa)
    ON DELETE CASCADE
) ENGINE=InnoDB;



CREATE TABLE tipos_equipo (
  id_tipo   TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre    VARCHAR(60)      NOT NULL,
  PRIMARY KEY (id_tipo),
  UNIQUE KEY uq_tipo_nombre (nombre)
) ENGINE=InnoDB;

INSERT INTO tipos_equipo (nombre) VALUES
  ('Laptop'), ('Desktop'), ('Monitor'), ('Smartphone'),
  ('Impresora'), ('Servidor'), ('Tablet'), ('Otro');



CREATE TABLE estados_equipo (
  id_estado   TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(40)      NOT NULL,
  descripcion VARCHAR(255)     NULL,
  PRIMARY KEY (id_estado),
  UNIQUE KEY uq_estado_nombre (nombre)
) ENGINE=InnoDB;

INSERT INTO estados_equipo (nombre, descripcion) VALUES
  ('Reciclable', 'El equipo debe enviarse a reciclaje especializado'),
  ('Reparable',  'El equipo puede ser reparado para extender su vida útil'),
  ('Donable',    'El equipo está en condiciones de ser donado'),
  ('Procesado',  'El equipo ya fue gestionado de manera responsable');



CREATE TABLE materiales (
  id_material   SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(60)       NOT NULL,
  es_peligroso  TINYINT(1)        NOT NULL DEFAULT 0,
  PRIMARY KEY (id_material),
  UNIQUE KEY uq_material_nombre (nombre)
) ENGINE=InnoDB;

INSERT INTO materiales (nombre, es_peligroso) VALUES
  ('Cobre',    0),
  ('Oro',      0),
  ('Plata',    0),
  ('Plástico', 0),
  ('Aluminio', 0),
  ('Plomo',    1),
  ('Mercurio', 1),
  ('Litio',    0);



CREATE TABLE equipos (
  id_equipo     INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  id_empresa    INT UNSIGNED      NOT NULL,
  id_tipo       TINYINT UNSIGNED  NOT NULL,
  id_estado     TINYINT UNSIGNED  NOT NULL,
  nombre        VARCHAR(200)      NOT NULL,
  marca         VARCHAR(80)       NOT NULL,
  anio          YEAR              NULL,
  notas         TEXT              NULL,
  registrado_en DATE              NOT NULL DEFAULT (CURRENT_DATE),
  procesado_en  DATE              NULL,
  PRIMARY KEY (id_equipo),
  KEY idx_equipo_empresa (id_empresa),
  KEY idx_equipo_estado  (id_estado),
  KEY idx_equipo_fecha   (registrado_en),
  CONSTRAINT fk_equipo_empresa
    FOREIGN KEY (id_empresa) REFERENCES empresas  (id_empresa) ON DELETE CASCADE,
  CONSTRAINT fk_equipo_tipo
    FOREIGN KEY (id_tipo)    REFERENCES tipos_equipo (id_tipo),
  CONSTRAINT fk_equipo_estado
    FOREIGN KEY (id_estado)  REFERENCES estados_equipo (id_estado)
) ENGINE=InnoDB;



CREATE TABLE equipo_materiales (
  id_equipo     INT UNSIGNED      NOT NULL,
  id_material   SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id_equipo, id_material),
  CONSTRAINT fk_em_equipo
    FOREIGN KEY (id_equipo)   REFERENCES equipos    (id_equipo)   ON DELETE CASCADE,
  CONSTRAINT fk_em_material
    FOREIGN KEY (id_material) REFERENCES materiales (id_material)
) ENGINE=InnoDB;



CREATE TABLE certificados (
  id_cert       INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  id_empresa    INT UNSIGNED  NOT NULL,
  folio         VARCHAR(30)   NOT NULL,
  emitido_en    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_equipos SMALLINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (id_cert),
  UNIQUE KEY uq_cert_folio (folio),
  KEY idx_cert_empresa (id_empresa),
  CONSTRAINT fk_cert_empresa
    FOREIGN KEY (id_empresa) REFERENCES empresas (id_empresa) ON DELETE CASCADE
) ENGINE=InnoDB;



CREATE TABLE certificado_equipos (
  id_cert       INT UNSIGNED NOT NULL,
  id_equipo     INT UNSIGNED NOT NULL,
  PRIMARY KEY (id_cert, id_equipo),
  CONSTRAINT fk_ce_cert
    FOREIGN KEY (id_cert)   REFERENCES certificados (id_cert)  ON DELETE CASCADE,
  CONSTRAINT fk_ce_equipo
    FOREIGN KEY (id_equipo) REFERENCES equipos      (id_equipo) ON DELETE CASCADE
) ENGINE=InnoDB;



CREATE TABLE reportes (
  id_reporte      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_empresa      INT UNSIGNED NOT NULL,
  tipo            ENUM('mensual','anual','certificado') NOT NULL,
  generado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_equipos   SMALLINT     NOT NULL DEFAULT 0,
  total_procesados SMALLINT    NOT NULL DEFAULT 0,
  kg_recuperados  DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  co2_evitado_kg  DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  contenido_json  JSON         NULL,                  -- snapshot completo
  PRIMARY KEY (id_reporte),
  KEY idx_reporte_empresa (id_empresa),
  KEY idx_reporte_tipo    (tipo),
  CONSTRAINT fk_reporte_empresa
    FOREIGN KEY (id_empresa) REFERENCES empresas (id_empresa) ON DELETE CASCADE
) ENGINE=InnoDB;



CREATE OR REPLACE VIEW v_inventario AS
SELECT
  e.id_equipo,
  e.id_empresa,
  emp.nombre          AS empresa,
  e.nombre            AS equipo,
  te.nombre           AS tipo,
  e.marca,
  e.anio,
  est.nombre          AS estado,
  est.id_estado,
  e.notas,
  e.registrado_en,
  e.procesado_en,
  GROUP_CONCAT(m.nombre ORDER BY m.nombre SEPARATOR ', ') AS materiales,
  MAX(m.es_peligroso) AS tiene_material_peligroso
FROM equipos e
JOIN empresas      emp ON emp.id_empresa = e.id_empresa
JOIN tipos_equipo  te  ON te.id_tipo     = e.id_tipo
JOIN estados_equipo est ON est.id_estado = e.id_estado
LEFT JOIN equipo_materiales em ON em.id_equipo  = e.id_equipo
LEFT JOIN materiales        m  ON m.id_material = em.id_material
GROUP BY
  e.id_equipo, e.id_empresa, emp.nombre, e.nombre,
  te.nombre, e.marca, e.anio, est.nombre, est.id_estado,
  e.notas, e.registrado_en, e.procesado_en;



CREATE OR REPLACE VIEW v_kpi_empresa AS
SELECT
  id_empresa,
  COUNT(*)                                          AS total_equipos,
  SUM(id_estado = 1)                                AS reciclables,
  SUM(id_estado = 2)                                AS reparables,
  SUM(id_estado = 3)                                AS donables,
  SUM(id_estado = 4)                                AS procesados,
  COUNT(*) * 2.3                                    AS kg_estimados,
  COUNT(*) * 15                                     AS co2_estimado_kg,
  COUNT(*) * 120                                    AS litros_agua,
  COUNT(*) * 45                                     AS kwh_ahorrados
FROM equipos
GROUP BY id_empresa;



CREATE OR REPLACE VIEW v_materiales_peligrosos AS
SELECT
  e.id_empresa,
  emp.nombre AS empresa,
  m.nombre   AS material,
  COUNT(*)   AS cantidad_equipos
FROM equipo_materiales em
JOIN equipos   e   ON e.id_equipo    = em.id_equipo
JOIN empresas  emp ON emp.id_empresa = e.id_empresa
JOIN materiales m  ON m.id_material  = em.id_material
WHERE m.es_peligroso = 1
GROUP BY e.id_empresa, emp.nombre, m.nombre;



CREATE INDEX idx_equipos_registrado ON equipos (id_empresa, registrado_en);
CREATE INDEX idx_equipos_estado_emp ON equipos (id_empresa, id_estado);




INSERT INTO empresas (nombre, nit, id_sector, email, pass_hash) VALUES
  ('Empresa Demo S.A.S', '900.123.456-7', 1, 'demo@econato.co',
   '$2b$12$demoHashParaDesarrolloNoUsarEnProduccion1234567890ab');


INSERT INTO equipos (id_empresa, id_tipo, id_estado, nombre, marca, anio, notas, registrado_en) VALUES
  (1, 1, 1, 'Laptop HP EliteBook 840',        'HP',      2018, 'Pantalla rota, HDD funcional',        '2025-01-15'),
  (1, 3, 3, 'Monitor Dell 24"',               'Dell',    2016, 'En buen estado, sin cable',           '2025-01-20'),
  (1, 6, 1, 'Servidor Dell PowerEdge',        'Dell',    2015, 'Fuera de soporte',                    '2025-02-03'),
  (1, 4, 2, 'Smartphone Samsung Galaxy S8',   'Samsung', 2017, 'Batería dañada',                      '2025-02-10'),
  (1, 5, 4, 'Impresora HP LaserJet',          'HP',      2014, 'Reciclada correctamente',             '2025-02-18'),
  (1, 2, 1, 'Desktop Lenovo ThinkCentre',     'Lenovo',  2013, 'Contiene plomo - manejo especial',    '2025-03-01');


INSERT INTO equipo_materiales VALUES
  (1,1),(1,2),(1,4),(1,5),
  (2,1),(2,4),
  (3,1),(3,2),(3,3),(3,5),
  (4,1),(4,2),(4,8),
  (5,1),(5,4),
  (6,1),(6,4),(6,6);
