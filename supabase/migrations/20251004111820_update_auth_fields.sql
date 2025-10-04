-- Update profiles table for comprehensive user registration
-- Add password field for custom authentication (optional, as Supabase handles auth)
-- Ensure all required fields exist

-- Add any missing columns (some may already exist from previous migrations)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS school TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS student_id TEXT,
ADD COLUMN IF NOT EXISTS id_number TEXT;

-- Add constraints for data integrity using DO blocks
DO $$
BEGIN
    -- Add unique constraint for username if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_username_unique'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
    END IF;

    -- Add phone check constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_phone_check'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_check CHECK (phone ~ '^[0-9-+().\s]+$');
    END IF;

    -- Add student_id check constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_student_id_check'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_student_id_check CHECK (student_id ~ '^[0-9]+$');
    END IF;
END
$$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON public.profiles(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL;

-- Update the handle_new_user function to ensure all fields are properly handled
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referrer_user_id UUID;
  new_referral_code TEXT;
BEGIN
  -- Generate unique referral code
  new_referral_code := public.generate_referral_code();
  
  -- Insert into profiles with all user metadata
  INSERT INTO public.profiles (
    id, 
    referral_code, 
    referred_by,
    username,
    full_name,
    phone,
    school,
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
    NEW.raw_user_meta_data->>'school',
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'student_id',
    NEW.raw_user_meta_data->>'id_number'
  );
  
  -- Insert into user_settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  -- Insert into user_coupons with initial available_count of 1
  INSERT INTO public.user_coupons (user_id, available_count, total_earned)
  VALUES (NEW.id, 1, 1);
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- If user was referred by someone, award coupon to referrer
  IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
    -- Find referrer's user_id by referral_code
    SELECT id INTO referrer_user_id
    FROM public.profiles
    WHERE referral_code = NEW.raw_user_meta_data->>'referred_by'
    LIMIT 1;
    
    IF referrer_user_id IS NOT NULL THEN
      -- Increment referrer's available_count and total_earned
      UPDATE public.user_coupons
      SET available_count = available_count + 1,
          total_earned = total_earned + 1,
          updated_at = now()
      WHERE user_id = referrer_user_id;
      
      -- Record referral history
      INSERT INTO public.referral_history (referrer_id, referred_id, coupon_awarded)
      VALUES (referrer_user_id, NEW.id, true);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Enable Row Level Security (RLS) for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles using DO blocks to handle existing policies
DO $$
BEGIN
    -- Drop existing policies if they exist and recreate them
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Public can view referral codes" ON public.profiles;

    -- Create new policies
    CREATE POLICY "Users can view their own profile" ON public.profiles
        FOR SELECT USING (auth.uid() = id);

    CREATE POLICY "Users can update their own profile" ON public.profiles
        FOR UPDATE USING (auth.uid() = id);

    CREATE POLICY "Users can insert their own profile" ON public.profiles
        FOR INSERT WITH CHECK (auth.uid() = id);

    -- Allow public read access to basic profile info (for referral system)
    CREATE POLICY "Public can view referral codes" ON public.profiles
        FOR SELECT USING (true);
END
$$;