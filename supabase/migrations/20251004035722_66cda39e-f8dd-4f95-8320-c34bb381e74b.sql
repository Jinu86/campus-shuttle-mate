BEGIN;

-- 1) Remove the old check constraint
ALTER TABLE public.shuttle_schedules DROP CONSTRAINT IF EXISTS shuttle_schedules_day_type_check;

-- 2) Delete all existing shuttle data (will be recreated with proper day_type values)
DELETE FROM public.shuttle_schedules;

-- 3) Add the new check constraint for day_type
ALTER TABLE public.shuttle_schedules
  ADD CONSTRAINT shuttle_schedules_day_type_check
  CHECK (day_type IN ('월~목', '금요일', '일요일'));

-- 4) Ensure arrival_time column exists
ALTER TABLE public.shuttle_schedules
  ADD COLUMN IF NOT EXISTS arrival_time time without time zone;

-- 5) Insert sample shuttle schedules for 월~목
INSERT INTO public.shuttle_schedules (day_type, destination, departure_time, duration_minutes, arrival_time) VALUES
('월~목', '조치원역', '08:00', 20, '08:20'),
('월~목', '학교', '08:30', 20, '08:50'),
('월~목', '조치원역', '09:00', 20, '09:20'),
('월~목', '학교', '10:00', 20, '10:20'),
('월~목', '조치원역', '11:00', 20, '11:20'),
('월~목', '학교', '12:00', 20, '12:20'),
('월~목', '조치원역', '14:00', 20, '14:20'),
('월~목', '학교', '15:00', 20, '15:20'),
('월~목', '조치원역', '16:00', 20, '16:20'),
('월~목', '학교', '17:00', 20, '17:20'),
('월~목', '조치원역', '18:00', 20, '18:20'),
('월~목', '학교', '19:00', 20, '19:20');

-- 6) Insert 금요일 schedules (same as 월~목)
INSERT INTO public.shuttle_schedules (day_type, destination, departure_time, duration_minutes, arrival_time)
SELECT '금요일', destination, departure_time, duration_minutes, arrival_time
FROM public.shuttle_schedules
WHERE day_type = '월~목';

-- 7) Insert 일요일 schedules (reduced service)
INSERT INTO public.shuttle_schedules (day_type, destination, departure_time, duration_minutes, arrival_time) VALUES
('일요일', '조치원역', '09:00', 20, '09:20'),
('일요일', '학교', '10:00', 20, '10:20'),
('일요일', '조치원역', '14:00', 20, '14:20'),
('일요일', '학교', '15:00', 20, '15:20'),
('일요일', '조치원역', '18:00', 20, '18:20'),
('일요일', '학교', '19:00', 20, '19:20');

COMMIT;