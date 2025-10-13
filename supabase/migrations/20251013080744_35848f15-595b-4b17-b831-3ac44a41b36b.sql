-- Create schools table
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  station_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Anyone can view schools" ON public.schools;

-- RLS policies for schools (viewable by everyone)
CREATE POLICY "Anyone can view schools" 
  ON public.schools 
  FOR SELECT 
  USING (true);

-- Create school_requests table
CREATE TABLE IF NOT EXISTS public.school_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  campus_name TEXT,
  station_name TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  additional_info TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on school_requests
ALTER TABLE public.school_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if exist
DROP POLICY IF EXISTS "Admins can view all requests" ON public.school_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.school_requests;
DROP POLICY IF EXISTS "Anyone can insert requests" ON public.school_requests;

-- RLS policies for school_requests
CREATE POLICY "Admins can view all requests" 
  ON public.school_requests 
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update requests" 
  ON public.school_requests 
  FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert requests" 
  ON public.school_requests 
  FOR INSERT 
  WITH CHECK (true);

-- Add school_id to profiles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='school_id') THEN
    ALTER TABLE public.profiles ADD COLUMN school_id UUID REFERENCES public.schools(id);
  END IF;
END $$;

-- Add school_id to shuttle_schedules (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shuttle_schedules' AND column_name='school_id') THEN
    ALTER TABLE public.shuttle_schedules ADD COLUMN school_id UUID REFERENCES public.schools(id);
  END IF;
END $$;

-- Add school_id to cafeteria_menus (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cafeteria_menus' AND column_name='school_id') THEN
    ALTER TABLE public.cafeteria_menus ADD COLUMN school_id UUID REFERENCES public.schools(id);
  END IF;
END $$;

-- Add school_id to coupons (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='school_id') THEN
    ALTER TABLE public.coupons ADD COLUMN school_id UUID REFERENCES public.schools(id);
  END IF;
END $$;

-- Add school_id to semester_status (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='semester_status' AND column_name='school_id') THEN
    ALTER TABLE public.semester_status ADD COLUMN school_id UUID REFERENCES public.schools(id);
  END IF;
END $$;

-- Create indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_shuttle_schedules_school_id ON public.shuttle_schedules(school_id);
CREATE INDEX IF NOT EXISTS idx_cafeteria_menus_school_id ON public.cafeteria_menus(school_id);
CREATE INDEX IF NOT EXISTS idx_coupons_school_id ON public.coupons(school_id);
CREATE INDEX IF NOT EXISTS idx_semester_status_school_id ON public.semester_status(school_id);
CREATE INDEX IF NOT EXISTS idx_school_requests_status ON public.school_requests(status);

-- Insert 고려대학교 세종캠퍼스 data
INSERT INTO public.schools (name, display_name, station_name) VALUES
  ('korea-sejong', '고려대학교 세종캠퍼스', '조치원역')
ON CONFLICT (name) DO NOTHING;

-- Update existing data to use 고려대학교
UPDATE public.shuttle_schedules 
SET school_id = (SELECT id FROM public.schools WHERE name = 'korea-sejong' LIMIT 1)
WHERE school_id IS NULL;

UPDATE public.cafeteria_menus 
SET school_id = (SELECT id FROM public.schools WHERE name = 'korea-sejong' LIMIT 1)
WHERE school_id IS NULL;

UPDATE public.coupons 
SET school_id = (SELECT id FROM public.schools WHERE name = 'korea-sejong' LIMIT 1)
WHERE school_id IS NULL;

UPDATE public.semester_status 
SET school_id = (SELECT id FROM public.schools WHERE name = 'korea-sejong' LIMIT 1)
WHERE school_id IS NULL;

-- Update handle_new_user function to save school_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id UUID;
  new_referral_code TEXT;
BEGIN
  new_referral_code := public.generate_referral_code();
  
  INSERT INTO public.profiles (
    id, 
    referral_code, 
    referred_by,
    username,
    full_name,
    phone,
    school_id,
    department,
    student_id,
    id_number
  )
  VALUES (
    NEW.id, 
    new_referral_code,
    NEW.raw_user_meta_data->>'referred_by',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    (NEW.raw_user_meta_data->>'school_id')::UUID,
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'student_id',
    NEW.raw_user_meta_data->>'id_number'
  );
  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.user_coupons (user_id, available_count, total_earned)
  VALUES (NEW.id, 1, 1);
  
  IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
    SELECT id INTO referrer_user_id
    FROM public.profiles
    WHERE referral_code = NEW.raw_user_meta_data->>'referred_by'
    LIMIT 1;
    
    IF referrer_user_id IS NOT NULL THEN
      UPDATE public.user_coupons
      SET available_count = available_count + 1,
          total_earned = total_earned + 1,
          updated_at = now()
      WHERE user_id = referrer_user_id;
      
      INSERT INTO public.referral_history (referrer_id, referred_id, coupon_awarded)
      VALUES (referrer_user_id, NEW.id, true);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;