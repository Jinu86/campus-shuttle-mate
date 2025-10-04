-- 깔끔한 새로운 인증 시스템
-- 회원가입 필드: 이메일, 비밀번호, 학교, 학과, 학번, 전화번호

-- 1. 모든 기존 트리거와 함수 제거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_simple ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_final ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_clean ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_simple();
DROP FUNCTION IF EXISTS public.handle_new_user_final();
DROP FUNCTION IF EXISTS public.handle_new_user_clean();

-- 2. 기존 테스트 데이터 정리
DELETE FROM public.profiles;

-- 3. profiles 테이블 구조 정리
-- 불필요한 컬럼 제거
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS username,
DROP COLUMN IF EXISTS kakao_id,
DROP COLUMN IF EXISTS referral_code,
DROP COLUMN IF EXISTS referred_by,
DROP COLUMN IF EXISTS full_name,
DROP COLUMN IF EXISTS id_number;

-- 4. 새로운 필드 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS school TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS student_id TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 5. 기존 인덱스 제거 후 새로 생성
DROP INDEX IF EXISTS profiles_username_key;
DROP INDEX IF EXISTS profiles_username_unique;
DROP INDEX IF EXISTS idx_profiles_username;
DROP INDEX IF EXISTS idx_profiles_student_id;
DROP INDEX IF EXISTS idx_profiles_phone;

-- 새로운 유니크 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key ON public.profiles(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_student_id_key ON public.profiles(student_id) WHERE student_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_key ON public.profiles(phone) WHERE phone IS NOT NULL;

-- 6. 간단하고 안정적인 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 프로필 생성 (이메일은 Supabase Auth에서 자동 제공)
  INSERT INTO public.profiles (
    id, 
    email,
    school,
    department,
    student_id,
    phone
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'school',
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'student_id',
    NEW.raw_user_meta_data->>'phone'
  );
  
  RETURN NEW;
END;
$function$;

-- 7. 새로운 트리거 생성
CREATE TRIGGER on_auth_user_created_v2
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_v2();

-- 8. RLS 정책 정리 및 재설정
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can view referral codes" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for profiles" ON public.profiles;

-- 간단한 새 정책 생성
CREATE POLICY "Users can manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 9. 불필요한 테이블들 정리 (선택사항)
-- user_roles, user_coupons, referral_history 등은 필요시 나중에 추가
