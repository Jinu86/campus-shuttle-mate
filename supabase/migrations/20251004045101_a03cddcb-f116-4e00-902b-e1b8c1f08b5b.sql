-- Create coupons table (쿠폰 종류)
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name TEXT NOT NULL,
  discount_description TEXT NOT NULL,
  terms TEXT,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_issuance INTEGER, -- 최대 발급 횟수 (null이면 무제한)
  issued_count INTEGER NOT NULL DEFAULT 0, -- 현재 발급된 횟수
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can view active coupons
CREATE POLICY "Anyone can view coupons"
  ON public.coupons
  FOR SELECT
  USING (true);

-- Only admins can manage coupons
CREATE POLICY "Admins can insert coupons"
  ON public.coupons
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update coupons"
  ON public.coupons
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete coupons"
  ON public.coupons
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Create user_coupons table (사용자의 쿠폰 발급 가능 횟수)
CREATE TABLE public.user_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_count INTEGER NOT NULL DEFAULT 0, -- 발급 가능 횟수
  total_earned INTEGER NOT NULL DEFAULT 0, -- 총 획득한 횟수 (통계용)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;

-- Users can view their own coupon counts
CREATE POLICY "Users can view own coupon counts"
  ON public.user_coupons
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own coupon counts (for initial setup)
CREATE POLICY "Users can insert own coupon counts"
  ON public.user_coupons
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own coupon counts
CREATE POLICY "Users can update own coupon counts"
  ON public.user_coupons
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create user_selected_coupons table (사용자가 발급받은 쿠폰)
CREATE TABLE public.user_selected_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  selected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_selected_coupons ENABLE ROW LEVEL SECURITY;

-- Users can view their own selected coupons
CREATE POLICY "Users can view own selected coupons"
  ON public.user_selected_coupons
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own selected coupons
CREATE POLICY "Users can insert own selected coupons"
  ON public.user_selected_coupons
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own selected coupons (mark as used)
CREATE POLICY "Users can update own selected coupons"
  ON public.user_selected_coupons
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create referral_history table (추천 이력)
CREATE TABLE public.referral_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coupon_awarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own referral history
CREATE POLICY "Users can view own referral history"
  ON public.referral_history
  FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- System can insert referral history (through trigger)
CREATE POLICY "Authenticated users can insert referral history"
  ON public.referral_history
  FOR INSERT
  WITH CHECK (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Update handle_new_user function to include coupon system
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id UUID;
  new_referral_code TEXT;
BEGIN
  -- Generate unique referral code
  new_referral_code := public.generate_referral_code();
  
  -- Insert into profiles with referral code
  INSERT INTO public.profiles (id, referral_code, referred_by)
  VALUES (
    NEW.id, 
    new_referral_code,
    NEW.raw_user_meta_data->>'referred_by'
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
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add trigger for user_coupons updated_at
CREATE TRIGGER update_user_coupons_updated_at
BEFORE UPDATE ON public.user_coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();