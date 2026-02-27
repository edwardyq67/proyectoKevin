
-- Insertar usuarios de ejemplo
INSERT INTO usuarios (uuid, dni, usuarios, password, activo) VALUES
-- Usuario 1: Administrador
(
    'usr_' || lower(hex(randomblob(16))), -- Genera un UUID único
    '75538408',
    'admin',
    '$2a$12$U/uPnKWS0i9VJlYH1FEQxeRXElwUv.8dJgAeBOnvYeq7ceYsgHMbS', -- ⚠️ Esto es solo para pruebas, en producción usa hash!
    1
),

-- Usuario 2: Usuario normal
(
    'usr_' || lower(hex(randomblob(16))), -- Genera un UUID único
    '12345678',
    'Ana García López',
    '$2a$12$bQAFDCQyBadcBTVxJMfwMu8Ry2JkPDvekniRto6DsWnOkqCfoBu/G', -- ⚠️ Esto es solo para pruebas, en producción usa hash!
    1
);