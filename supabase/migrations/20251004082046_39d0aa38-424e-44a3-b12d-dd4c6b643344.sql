-- Fix referral_history security vulnerability
-- Remove the overly permissive INSERT policy that allows users to insert records
DROP POLICY IF EXISTS "Authenticated users can insert referral history" ON public.referral_history;

-- Referral history should ONLY be created by the system during user signup
-- via the handle_new_user() SECURITY DEFINER trigger function.
-- Users should NOT be able to insert records directly to prevent fraud.

-- Keep the SELECT policy so users can view their own referral history
-- (this already exists and is correct)