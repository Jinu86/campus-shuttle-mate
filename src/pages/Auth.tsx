import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Bus, Mail, Lock, User, Phone, School, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const loginSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
});

const signupSchema = z.object({
  username: z.string().min(2, "아이디는 최소 2자 이상이어야 합니다"),
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  full_name: z.string().min(2, "이름을 입력해주세요"),
  phone: z.string().regex(/^01[0-9]-?[0-9]{4}-?[0-9]{4}$/, "올바른 전화번호를 입력해주세요"),
  school: z.string().min(2, "학교명을 입력해주세요"),
  department: z.string().min(2, "학과를 입력해주세요"),
  student_id: z.string().min(1, "학번을 입력해주세요"),
  id_number: z.string().regex(/^[0-9]{6}-?[0-9]{7}$/, "올바른 주민등록번호를 입력해주세요 (예: 000000-0000000)"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      full_name: "",
      phone: "",
      school: "",
      department: "",
      student_id: "",
      id_number: "",
    },
  });

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      
      if (error) throw error;
      toast.success("로그인 성공!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (values: z.infer<typeof signupSchema>) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: values.username,
            full_name: values.full_name,
            phone: values.phone,
            school: values.school,
            department: values.department,
            student_id: values.student_id,
            id_number: values.id_number,
          },
        },
      });
      
      if (error) throw error;
      toast.success("회원가입 성공! 로그인해주세요.");
    } catch (error: any) {
      toast.error(error.message || "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <Card className="w-full max-w-2xl shadow-medium">
        <CardHeader className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="absolute top-4 left-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>
          <div className="text-center pt-8">
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="signup">회원가입</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-4">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="example@email.com"
                      className="pl-10"
                      {...loginForm.register("email")}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••"
                      className="pl-10"
                      {...loginForm.register("password")}
                    />
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? "로그인 중..." : "로그인"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-4">
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">아이디</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-username"
                        placeholder="아이디"
                        className="pl-10"
                        {...signupForm.register("username")}
                      />
                    </div>
                    {signupForm.formState.errors.username && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.username.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-full-name">이름</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-full-name"
                        placeholder="홍길동"
                        className="pl-10"
                        {...signupForm.register("full_name")}
                      />
                    </div>
                    {signupForm.formState.errors.full_name && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.full_name.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="example@email.com"
                      className="pl-10"
                      {...signupForm.register("email")}
                    />
                  </div>
                  {signupForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="최소 6자 이상"
                      className="pl-10"
                      {...signupForm.register("password")}
                    />
                  </div>
                  {signupForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">전화번호</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-phone"
                      placeholder="010-0000-0000"
                      className="pl-10"
                      {...signupForm.register("phone")}
                    />
                  </div>
                  {signupForm.formState.errors.phone && (
                    <p className="text-xs text-destructive">{signupForm.formState.errors.phone.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-school">학교</Label>
                    <div className="relative">
                      <School className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-school"
                        placeholder="○○대학교"
                        className="pl-10"
                        {...signupForm.register("school")}
                      />
                    </div>
                    {signupForm.formState.errors.school && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.school.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-department">학과</Label>
                    <Input
                      id="signup-department"
                      placeholder="컴퓨터공학과"
                      {...signupForm.register("department")}
                    />
                    {signupForm.formState.errors.department && (
                      <p className="text-xs text-destructive">{signupForm.formState.errors.department.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-student-id">학번</Label>
                  <Input
                    id="signup-student-id"
                    placeholder="20240000"
                    {...signupForm.register("student_id")}
                  />
                  {signupForm.formState.errors.student_id && (
                    <p className="text-xs text-destructive">{signupForm.formState.errors.student_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-id-number">주민등록번호</Label>
                  <Input
                    id="signup-id-number"
                    placeholder="000000-0000000"
                    {...signupForm.register("id_number")}
                  />
                  {signupForm.formState.errors.id_number && (
                    <p className="text-xs text-destructive">{signupForm.formState.errors.id_number.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? "가입 중..." : "회원가입"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <p className="text-xs text-center text-muted-foreground mt-4">
            로그인하면 서비스 이용약관 및 개인정보처리방침에 동의하게 됩니다
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
