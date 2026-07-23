-- =====================================================================
-- BarFlow POS · Seed de datos de prueba
-- Ejecutar DESPUÉS de crear al menos un usuario en Supabase Auth
-- para el admin del negocio, y reemplazar el UUID marcado abajo.
-- =====================================================================

-- 1) Negocio demo
insert into negocios (id, nombre, slug, ciudad, pais, estado)
values ('11111111-1111-1111-1111-111111111111', 'La Terraza Bar', 'la-terraza', 'Villavicencio', 'CO', 'activo');

-- 2) Barras
insert into barras (id, negocio_id, nombre, orden) values
  ('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Barra Principal', 1),
  ('21111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Cantina', 2),
  ('21111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'VIP', 3);

-- 3) Mesas
insert into mesas (negocio_id, nombre, capacidad, zona, pos_x, pos_y) values
  ('11111111-1111-1111-1111-111111111111', 'Mesa 1', 4, 'Salón', 0, 0),
  ('11111111-1111-1111-1111-111111111111', 'Mesa 2', 4, 'Salón', 1, 0),
  ('11111111-1111-1111-1111-111111111111', 'Mesa 3', 6, 'Salón', 2, 0),
  ('11111111-1111-1111-1111-111111111111', 'Mesa VIP 1', 8, 'VIP', 0, 1),
  ('11111111-1111-1111-1111-111111111111', 'Barra 1', 2, 'Barra', 1, 1);

-- 4) Categorías
insert into categorias (id, negocio_id, nombre, orden) values
  ('31111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Cócteles', 1),
  ('31111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Cervezas', 2),
  ('31111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Snacks', 3);

-- 5) Insumos
insert into insumos (id, negocio_id, nombre, unidad, stock, stock_minimo, costo_unitario) values
  ('41111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Ron blanco', 'ml', 5000, 500, 25),
  ('41111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Limón', 'unidad', 100, 20, 300),
  ('41111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Hierbabuena', 'g', 500, 50, 10),
  ('41111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Azúcar', 'g', 2000, 200, 3),
  ('41111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', 'Hielo', 'g', 10000, 1000, 1);

-- 6) Productos
insert into productos (id, negocio_id, categoria_id, barra_id, nombre, precio, costo) values
  ('51111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', 'Mojito', 22000, 8000),
  ('51111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111112', '21111111-1111-1111-1111-111111111112', 'Cerveza Águila', 8000, 3500),
  ('51111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111113', '21111111-1111-1111-1111-111111111112', 'Papas fritas', 12000, 4000);

-- 7) Receta del Mojito
insert into producto_insumos (producto_id, insumo_id, cantidad) values
  ('51111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111111', 60),
  ('51111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111112', 1),
  ('51111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111113', 10),
  ('51111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111114', 15),
  ('51111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111115', 100);

-- 8) Cliente de ejemplo
insert into clientes (negocio_id, nombre, apellido, celular, correo, fecha_cumpleanos)
values ('11111111-1111-1111-1111-111111111111', 'Juan', 'Pérez', '3001234567', 'juan@example.com', '1990-05-15');

-- =====================================================================
-- NOTA IMPORTANTE SOBRE USUARIOS
-- =====================================================================
-- Los usuarios se crean en dos pasos:
--  1. Crear el usuario en Supabase Auth (dashboard, o supabase.auth.admin.createUser)
--  2. Insertar su perfil en la tabla `usuarios` con el mismo id:
--
-- insert into usuarios (id, negocio_id, rol, nombre, apellido, email)
-- values ('<uuid-del-auth-user>', '11111111-1111-1111-1111-111111111111', 'admin_negocio', 'Ana', 'Gómez', 'ana@laterraza.com');
--
-- El script backend/scripts/seedUsuarios.js automatiza esto.
