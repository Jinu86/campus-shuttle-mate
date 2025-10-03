-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  kakao_id TEXT,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create trips table (registered train times)
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  destination_station TEXT NOT NULL CHECK (destination_station IN ('조치원역', '오송역')),
  arrival_time TIME NOT NULL,
  route_type TEXT CHECK (route_type IN ('기차환승', '버스환승', '직행')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON public.trips FOR DELETE
  USING (auth.uid() = user_id);

-- Create shuttle_schedules table
CREATE TABLE public.shuttle_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_time TIME NOT NULL,
  destination TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  day_type TEXT NOT NULL CHECK (day_type IN ('평일', '주말')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.shuttle_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shuttle schedules"
  ON public.shuttle_schedules FOR SELECT
  USING (true);

-- Create cafeteria_menus table
CREATE TABLE public.cafeteria_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('아침', '점심', '저녁')),
  menu_items TEXT[] NOT NULL,
  price INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(date, meal_type)
);

ALTER TABLE public.cafeteria_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cafeteria menus"
  ON public.cafeteria_menus FOR SELECT
  USING (true);

-- Create alarms table
CREATE TABLE public.alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alarm_type TEXT NOT NULL CHECK (alarm_type IN ('SHUTTLE', 'MENU')),
  target_id UUID,
  minutes_before INTEGER,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alarms"
  ON public.alarms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alarms"
  ON public.alarms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alarms"
  ON public.alarms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alarms"
  ON public.alarms FOR DELETE
  USING (auth.uid() = user_id);

-- Create user_settings table
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  menu_alarm_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  
  INSERT INTO public.user_settings (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample shuttle schedules
INSERT INTO public.shuttle_schedules (departure_time, destination, duration_minutes, day_type, notes) VALUES
  ('08:00', '조치원역', 20, '평일', null),
  ('08:30', '오송역', 25, '평일', null),
  ('09:00', '조치원역', 20, '평일', null),
  ('10:00', '오송역', 25, '평일', null),
  ('11:00', '조치원역', 20, '평일', null),
  ('12:00', '오송역', 25, '평일', null),
  ('14:00', '조치원역', 20, '평일', null),
  ('15:00', '오송역', 25, '평일', null),
  ('16:00', '조치원역', 20, '평일', null),
  ('17:00', '오송역', 25, '평일', null),
  ('18:00', '조치원역', 20, '평일', null),
  ('19:00', '오송역', 25, '평일', null);

-- Insert sample cafeteria menu
INSERT INTO public.cafeteria_menus (date, meal_type, menu_items, price) VALUES
  (CURRENT_DATE, '아침', ARRAY['계란후라이', '토스트', '우유', '샐러드'], 3500),
  (CURRENT_DATE, '점심', ARRAY['김치찌개', '제육볶음', '밥', '김치', '나물'], 5000),
  (CURRENT_DATE, '저녁', ARRAY['된장찌개', '생선구이', '밥', '김치', '나물'], 5000);