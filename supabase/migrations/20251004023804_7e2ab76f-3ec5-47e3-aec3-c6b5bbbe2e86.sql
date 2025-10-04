-- Update shuttle schedule notes text
UPDATE public.shuttle_schedules
SET notes = '조치원역 출발'
WHERE notes = '조치원역터만 출발';