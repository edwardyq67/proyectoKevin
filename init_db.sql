-- Tabla Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    dni TEXT NOT NULL UNIQUE,
    usuarios TEXT NOT NULL,
    password TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1
);

-- Tabla Categoria
CREATE TABLE IF NOT EXISTS categoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1
);

-- Tabla Productos
CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    rs TEXT NOT NULL, -- Registro Sanitario
    descripcion TEXT NOT NULL,
    principioActivo TEXT NOT NULL,
    presentacion TEXT NOT NULL,
    laboratorio TEXT NOT NULL,
    productControlado INTEGER NOT NULL DEFAULT 0, -- 0 para false, 1 para true
    carrusel INTEGER NOT NULL DEFAULT 0, -- 0 para false (no en carrusel), 1 para true (en carrusel)
    imagen TEXT,
    categoria_uuid INTEGER,
    activo INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (categoria_uuid) REFERENCES categoria(uuid)
);
