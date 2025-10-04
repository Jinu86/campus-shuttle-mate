import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Bus } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleKakaoLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "카카오 로그인에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <Card className="w-full max-w-md shadow-medium">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
            <Bus className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              바로 셔틀
            </CardTitle>
            <CardDescription className="text-base mt-2">
              기차 시간에 맞춰 셔틀을 찾아드려요
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleKakaoLogin}
            className="w-full h-14 text-lg font-semibold bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] shadow-medium"
            disabled={loading}
          >
            {loading ? (
              "카카오 연결중..."
            ) : (
              <div className="flex items-center justify-center gap-3">
                <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3C5.58172 3 2 5.85967 2 9.38462C2 11.6853 3.58333 13.6826 5.91667 14.7115L5.08333 17.6923C5.08333 17.6923 5.03333 17.9231 5.2 17.9231C5.31667 17.9231 9.01667 15.0288 9.01667 15.0288C9.34167 15.0577 9.66667 15.0769 10 15.0769C14.4183 15.0769 18 12.2173 18 8.69231C18 5.16731 14.4183 3 10 3Z" fill="currentColor"/>
                </svg>
                카카오로 3초 만에 시작하기
              </div>
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            로그인하면 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
