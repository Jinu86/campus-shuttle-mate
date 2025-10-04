#!/usr/bin/env node

// Supabase MCP 자동 설정 스크립트
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function setupSupabase() {
  console.log('🚀 Supabase MCP 자동 설정을 시작합니다...');
  
  // 1. 환경변수 파일 생성
  const envContent = `# Supabase 설정
VITE_SUPABASE_URL=https://lqcgywiiunyrrsqwlwhn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxY2d5d2lpdW55cnJzcXdsd2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0ODM0NzAsImV4cCI6MjA3NTA1OTQ3MH0.SbwjwyBNjq3-2fLbFgSLy_fF0X8zYz8Y6436kv765KM

# 카카오 로그인 (선택사항)
VITE_KAKAO_CLIENT_ID=your_kakao_rest_api_key
`;

  try {
    fs.writeFileSync('.env.local', envContent);
    console.log('✅ .env.local 파일이 생성되었습니다.');
  } catch (error) {
    console.error('❌ 환경변수 파일 생성 실패:', error.message);
  }

  // 2. Supabase 연결 테스트
  const supabaseUrl = 'https://lqcgywiiunyrrsqwlwhn.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxY2d5d2lpdW55cnJzcXdsd2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0ODM0NzAsImV4cCI6MjA3NTA1OTQ3MH0.SbwjwyBNjq3-2fLbFgSLy_fF0X8zYz8Y6436kv765KM';
  
  console.log('🔍 Supabase 연결을 테스트합니다...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('⚠️  데이터베이스 테이블이 아직 생성되지 않았습니다.');
      console.log('📋 다음 SQL을 Supabase 대시보드에서 실행하세요:');
      console.log('   https://supabase.com/dashboard → SQL Editor');
    } else if (error) {
      console.error('❌ Supabase 연결 실패:', error.message);
      console.log('🔧 프로젝트 URL을 다시 확인해주세요.');
    } else {
      console.log('✅ Supabase 연결 성공!');
    }
  } catch (err) {
    console.error('❌ 네트워크 오류:', err.message);
    console.log('🌐 인터넷 연결과 프로젝트 URL을 확인해주세요.');
  }

  console.log('\n📝 다음 단계:');
  console.log('1. Supabase 대시보드에서 프로젝트 URL 재확인');
  console.log('2. SQL Editor에서 데이터베이스 스키마 적용');
  console.log('3. 카카오 개발자 콘솔에서 Redirect URI 설정');
  console.log('4. npm run dev로 앱 재시작');
}

setupSupabase().catch(console.error);
