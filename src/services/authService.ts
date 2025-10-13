import { supabase } from '@/integrations/supabase/client';

export interface SignUpData {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  full_name: string;
  school_id: string;
  department: string;
  student_id: string;
  phone: string;
  id_number: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthError {
  message: string;
  field?: string;
}

/**
 * 회원가입 함수 (새로운 깔끔한 버전)
 */
export const signUp = async (data: SignUpData) => {
  try {
    console.log('=== 새로운 회원가입 시작 ===');
    console.log('입력 데이터:', { ...data, password: '***', confirmPassword: '***' });

    // 비밀번호 확인
    if (data.password !== data.confirmPassword) {
      throw new Error('비밀번호가 일치하지 않습니다.');
    }

    // 중복 검사 (간단하고 안전하게)
    console.log('중복 검사 중...');
    
    // 학번 중복 확인
    const { data: existingStudentId } = await supabase
      .from('profiles')
      .select('student_id')
      .eq('student_id', data.student_id)
      .maybeSingle();
    
    if (existingStudentId) {
      throw new Error('이미 등록된 학번입니다.');
    }

    // 전화번호 중복 확인
    const { data: existingPhone } = await supabase
      .from('profiles')
      .select('phone')
      .eq('phone', data.phone)
      .maybeSingle();
    
    if (existingPhone) {
      throw new Error('이미 등록된 전화번호입니다.');
    }

    console.log('중복 검사 통과!');

    // Supabase Auth를 통한 사용자 생성
    console.log('Supabase Auth로 사용자 생성 중...');
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username,
          full_name: data.full_name,
          school_id: data.school_id,
          department: data.department,
          student_id: data.student_id,
          phone: data.phone,
          id_number: data.id_number,
        },
      },
    });

    console.log('Auth 응답:', { authData, authError });

    if (authError) {
      console.error('Auth 오류:', authError);
      throw new Error(getAuthErrorMessage(authError.message));
    }

    console.log('✅ 회원가입 성공!');
    return {
      user: authData.user,
      session: authData.session,
    };
  } catch (error: any) {
    console.error('회원가입 오류:', error);
    throw error;
  }
};

/**
 * 로그인 함수 (이메일 기반)
 */
export const signIn = async (data: SignInData) => {
  try {
    console.log('=== 로그인 시작 ===');
    console.log('이메일:', data.email);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      console.error('로그인 오류:', authError);
      throw new Error(getAuthErrorMessage(authError.message));
    }

    console.log('✅ 로그인 성공!');
    return {
      user: authData.user,
      session: authData.session,
    };
  } catch (error: any) {
    console.error('로그인 오류:', error);
    throw error;
  }
};

/**
 * 로그아웃 함수
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(getAuthErrorMessage(error.message));
    }
  } catch (error) {
    console.error('로그아웃 오류:', error);
    throw error;
  }
};

/**
 * 현재 사용자 프로필 가져오기
 */
export const getCurrentUserProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('프로필 조회 오류:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    return null;
  }
};

/**
 * 사용자 프로필 업데이트
 */
export const updateUserProfile = async (updates: Partial<Omit<SignUpData, 'password' | 'confirmPassword'>>) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error('프로필 업데이트에 실패했습니다.');
    }

    return data;
  } catch (error) {
    console.error('프로필 업데이트 오류:', error);
    throw error;
  }
};

/**
 * 학번 중복 확인
 */
export const checkStudentIdAvailability = async (studentId: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('student_id')
      .eq('student_id', studentId)
      .maybeSingle();
    
    return !data; // 데이터가 없으면 사용 가능
  } catch (error) {
    console.error('학번 중복 확인 오류:', error);
    return false;
  }
};

/**
 * 전화번호 중복 확인
 */
export const checkPhoneAvailability = async (phone: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('phone')
      .eq('phone', phone)
      .maybeSingle();
    
    return !data; // 데이터가 없으면 사용 가능
  } catch (error) {
    console.error('전화번호 중복 확인 오류:', error);
    return false;
  }
};

/**
 * 에러 메시지 한국어 변환
 */
const getAuthErrorMessage = (errorMessage: string): string => {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'Email already registered': '이미 등록된 이메일입니다.',
    'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
    'User not found': '존재하지 않는 사용자입니다.',
    'Invalid email': '올바르지 않은 이메일 형식입니다.',
    'Signup requires a valid password': '유효한 비밀번호가 필요합니다.',
    'Email not confirmed': '이메일 인증이 필요합니다.',
    'Too many requests': '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
    'Invalid email or password': '이메일 또는 비밀번호가 올바르지 않습니다.',
  };

  return errorMap[errorMessage] || errorMessage;
};