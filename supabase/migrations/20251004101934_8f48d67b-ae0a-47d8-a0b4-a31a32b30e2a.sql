-- Add additional profile fields for user registration
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS school TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS student_id TEXT,
ADD COLUMN IF NOT EXISTS id_number TEXT;

-- Add unique constraint for username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles(username) WHERE username IS NOT NULL;

-- Update trigger to handle new user fields
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