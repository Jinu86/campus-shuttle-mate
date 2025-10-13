import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const requestSchema = z.object({
  school_name: z.string().min(2, "학교명을 입력해주세요"),
  campus_name: z.string().optional(),
  additional_info: z.string().optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface SchoolRequestFormProps {
  onClose: () => void;
}

export default function SchoolRequestForm({ onClose }: SchoolRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
  });

  useEffect(() => {
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        description: "학교 추가 요청은 로그인 후 이용 가능합니다.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const handleSubmit = async (values: RequestFormData) => {
    if (!user || !profile) {
      toast({
        title: "로그인이 필요합니다",
        description: "학교 추가 요청은 로그인 후 이용 가능합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("school_requests" as any)
        .insert({
          school_name: values.school_name,
          campus_name: values.campus_name || null,
          station_name: "조치원역", // 기본값
          requester_name: profile.full_name || "미입력",
          requester_email: user.email || "미입력",
          requester_phone: profile.phone || "미입력",
          additional_info: values.additional_info || null,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "요청이 접수되었습니다",
        description: "빠른 시일 내에 검토 후 연락드리겠습니다.",
      });
      
      onClose();
    } catch (error) {
      console.error("Failed to submit request:", error);
      toast({
        title: "요청 실패",
        description: "요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">대학 추가 요청</h2>
          <p className="text-sm text-muted-foreground mt-1">
            서비스 제공을 원하시는 대학 정보를 입력해주세요
          </p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            학교 추가 요청은 로그인 후 이용 가능합니다.
          </AlertDescription>
        </Alert>

        <Button variant="outline" onClick={onClose} className="w-full">
          닫기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">대학 추가 요청</h2>
        <p className="text-sm text-muted-foreground mt-1">
          서비스 제공을 원하시는 대학 정보를 입력해주세요
        </p>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="school_name">학교명 *</Label>
          <Input
            id="school_name"
            placeholder="예: 한국대학교"
            {...form.register("school_name")}
          />
          {form.formState.errors.school_name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.school_name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="campus_name">캠퍼스명 (선택)</Label>
          <Input
            id="campus_name"
            placeholder="예: 세종캠퍼스"
            {...form.register("campus_name")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="additional_info">추가 정보 (선택)</Label>
          <Textarea
            id="additional_info"
            placeholder="서비스 제공이 필요한 이유나 추가 정보를 입력해주세요"
            {...form.register("additional_info")}
            rows={4}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "제출 중..." : "요청하기"}
          </Button>
        </div>
      </form>
    </div>
  );
}
