-- Habilita extensão de UUID caso não esteja habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Criação das Tabelas
CREATE TABLE t_profiles (
  id_profile UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_auth_user UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nm_profile VARCHAR(255) NOT NULL,
  ds_role VARCHAR(50) DEFAULT 'USER' CHECK (ds_role IN ('ADMIN', 'USER')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE t_rooms (
  id_room UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nm_room VARCHAR(255) NOT NULL,
  ds_color_theme VARCHAR(50)
);

CREATE TABLE t_user_room_access (
  id_access UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_profile UUID REFERENCES t_profiles(id_profile) ON DELETE CASCADE,
  id_room UUID REFERENCES t_rooms(id_room) ON DELETE CASCADE,
  UNIQUE(id_profile, id_room)
);

CREATE TABLE t_bookings (
  id_booking UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_room UUID REFERENCES t_rooms(id_room) ON DELETE CASCADE,
  id_profile UUID REFERENCES t_profiles(id_profile) ON DELETE CASCADE,
  dt_booking DATE NOT NULL,
  hr_time_slot VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Essa constraint garante a exclusividade de 1 reserva por slot por sala
  UNIQUE(id_room, dt_booking, hr_time_slot) 
);

CREATE TABLE t_booking_participants (
  id_participant UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_booking UUID REFERENCES t_bookings(id_booking) ON DELETE CASCADE,
  nm_participant VARCHAR(255) NOT NULL,
  ds_email VARCHAR(255),
  nu_phone VARCHAR(50)
);

-- 2. Inserção de Dados Iniciais (As 3 Salas)
INSERT INTO t_rooms (nm_room, ds_color_theme) VALUES 
('Sala Bora Brasil', 'green'),
('Sala Skala Brasil', 'orange'),
('Sala Lola', 'red');

-- 3. Trigger para criar perfil automaticamente ao cadastrar um usuário na aba Authentication
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.t_profiles (id_auth_user, nm_profile, ds_role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário Novo'), 'USER');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Habilitar RLS (Row Level Security) e Criar Políticas
ALTER TABLE t_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_user_room_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_booking_participants ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON t_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON t_profiles FOR UPDATE USING (auth.uid() = id_auth_user);

-- Políticas para Rooms
CREATE POLICY "Rooms are viewable by everyone." ON t_rooms FOR SELECT USING (true);

-- Políticas para Access
CREATE POLICY "Access is viewable by everyone." ON t_user_room_access FOR SELECT USING (true);
CREATE POLICY "Admins can insert access." ON t_user_room_access FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM t_profiles WHERE id_auth_user = auth.uid() AND ds_role = 'ADMIN')
);
CREATE POLICY "Admins can delete access." ON t_user_room_access FOR DELETE USING (
  EXISTS (SELECT 1 FROM t_profiles WHERE id_auth_user = auth.uid() AND ds_role = 'ADMIN')
);

-- Políticas para Bookings
-- Todos logados precisam ver as reservas para renderizar a grade (verde/cinza)
CREATE POLICY "Bookings viewable by everyone" ON t_bookings FOR SELECT USING (true);
-- Apenas insere se o usuário for o dono e tiver acesso à sala ou for ADMIN
CREATE POLICY "Users can insert bookings for their rooms" ON t_bookings FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id_auth_user FROM t_profiles WHERE id_profile = t_bookings.id_profile) AND
  (
    EXISTS (SELECT 1 FROM t_profiles WHERE id_auth_user = auth.uid() AND ds_role = 'ADMIN') OR
    EXISTS (SELECT 1 FROM t_user_room_access WHERE id_room = t_bookings.id_room AND id_profile = t_bookings.id_profile)
  )
);
-- Apenas apaga a própria reserva ou se for ADMIN
CREATE POLICY "Users can delete own bookings" ON t_bookings FOR DELETE USING (
  auth.uid() IN (SELECT id_auth_user FROM t_profiles WHERE id_profile = t_bookings.id_profile) OR
  EXISTS (SELECT 1 FROM t_profiles WHERE id_auth_user = auth.uid() AND ds_role = 'ADMIN')
);

-- Políticas para Participants
CREATE POLICY "Participants viewable by everyone" ON t_booking_participants FOR SELECT USING (true);
CREATE POLICY "Users can insert participants for their bookings" ON t_booking_participants FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM t_bookings b
    JOIN t_profiles p ON p.id_profile = b.id_profile
    WHERE b.id_booking = t_booking_participants.id_booking AND p.id_auth_user = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM t_profiles WHERE id_auth_user = auth.uid() AND ds_role = 'ADMIN')
);
