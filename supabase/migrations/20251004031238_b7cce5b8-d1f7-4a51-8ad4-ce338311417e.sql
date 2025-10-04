-- Add date and departure time columns to trips table
ALTER TABLE public.trips 
ADD COLUMN train_date DATE,
ADD COLUMN train_departure_time TIME;

-- Update the existing arrival_time column name for clarity (optional, keeping it for shuttle arrival)
-- The arrival_time will now represent when user arrives at Jochiwon station via shuttle

-- Add index for better query performance
CREATE INDEX idx_trips_train_date ON public.trips(train_date);
CREATE INDEX idx_trips_user_date ON public.trips(user_id, train_date);