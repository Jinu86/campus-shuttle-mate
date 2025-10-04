import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gift, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Coupons = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [userCoupons, setUserCoupons] = useState<any>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCouponDetailDialog, setShowCouponDetailDialog] = useState(false);
  const [issuedCoupon, setIssuedCoupon] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    
    if (user) {
      loadData();
    }
  }, [user, loading]);

  const loadData = async () => {
    if (!user) return;

    // 개발 모드인 경우 user_coupons만 가짜 데이터 설정
    const isDevMode = typeof window !== 'undefined' && localStorage.getItem('DEV_MODE') === 'true';

    try {
      const couponsResult = await supabase
        .from("coupons")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (couponsResult.data) setCoupons(couponsResult.data);

      // 개발 모드에서는 user_coupons를 가짜 데이터로 설정
      if (isDevMode) {
        setUserCoupons({ available_count: 3, total_earned: 5 });
      } else {
        const userCouponsResult = await supabase
          .from("user_coupons")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (userCouponsResult.data) setUserCoupons(userCouponsResult.data);
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
      toast.error("데이터를 불러오는데 실패했습니다.");
    }
  };

  const handleSelectCoupon = (coupon: any) => {
    // 발급 가능 횟수 확인
    if (!userCoupons || userCoupons.available_count <= 0) {
      toast.error("선택 가능한 쿠폰 횟수가 부족합니다.");
      return;
    }

    // 발급 제한 확인
    if (coupon.max_issuance && coupon.issued_count >= coupon.max_issuance) {
      toast.error("이 쿠폰은 발급이 마감되었습니다.");
      return;
    }

    // 유효기간 확인
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = new Date(coupon.valid_until);
    
    if (now < validFrom || now > validUntil) {
      toast.error("이 쿠폰은 현재 사용할 수 없습니다.");
      return;
    }

    setSelectedCoupon(coupon);
    setShowConfirmDialog(true);
  };

  const confirmSelectCoupon = async () => {
    if (!user || !selectedCoupon) return;

    try {
      // 트랜잭션처럼 처리하기 위해 순차적으로 실행
      // 1. 쿠폰 선택 기록
      const { error: insertError } = await supabase
        .from("user_selected_coupons")
        .insert({
          user_id: user.id,
          coupon_id: selectedCoupon.id,
        });

      if (insertError) throw insertError;

      // 2. 사용자의 available_count 감소
      const { error: updateUserError } = await supabase
        .from("user_coupons")
        .update({
          available_count: userCoupons.available_count - 1,
        })
        .eq("user_id", user.id);

      if (updateUserError) throw updateUserError;

      // 3. 쿠폰의 issued_count 증가
      const { error: updateCouponError } = await supabase
        .from("coupons")
        .update({
          issued_count: selectedCoupon.issued_count + 1,
        })
        .eq("id", selectedCoupon.id);

      if (updateCouponError) throw updateCouponError;

      toast.success("쿠폰이 발급되었습니다!");
      setShowConfirmDialog(false);
      setIssuedCoupon(selectedCoupon);
      setShowCouponDetailDialog(true);
      loadData(); // 데이터 새로고침
    } catch (error: any) {
      console.error("쿠폰 선택 실패:", error);
      toast.error(error.message || "쿠폰 선택에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/my")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">쿠폰 선택하기</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-6">
        {/* 선택 가능 횟수 */}
        <Card className="shadow-soft border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <Gift className="w-10 h-10 text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-2">남은 선택 가능 횟수</p>
              <p className="text-3xl font-bold text-primary">
                {userCoupons?.available_count || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 쿠폰 목록 */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">이용 가능한 쿠폰</h2>
          {coupons.length > 0 ? (
            coupons.map((coupon) => {
              const isAvailable = 
                (!coupon.max_issuance || coupon.issued_count < coupon.max_issuance) &&
                new Date() >= new Date(coupon.valid_from) &&
                new Date() <= new Date(coupon.valid_until);

              return (
                <Card key={coupon.id} className="shadow-soft">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-foreground flex items-center justify-between">
                      {coupon.store_name}
                      {!isAvailable && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                          마감
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-primary/5 rounded-lg p-4">
                      <p className="font-medium text-foreground text-center">
                        {coupon.discount_description}
                      </p>
                    </div>
                    
                    {coupon.terms && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">사용조건:</span> {coupon.terms}
                      </p>
                    )}
                    
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>
                        {new Date(coupon.valid_from).toLocaleDateString()} ~ {new Date(coupon.valid_until).toLocaleDateString()}
                      </span>
                      {coupon.max_issuance && (
                        <span>
                          {coupon.issued_count}/{coupon.max_issuance}
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => handleSelectCoupon(coupon)}
                      disabled={!isAvailable || (userCoupons?.available_count || 0) <= 0}
                      className="w-full"
                    >
                      {isAvailable ? "이 쿠폰 사용하기" : "발급 마감"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="shadow-soft">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  현재 선택 가능한 쿠폰이 없습니다.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 확인 다이얼로그 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>쿠폰을 사용하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-medium text-foreground">
                {selectedCoupon?.store_name}
              </p>
              <p>{selectedCoupon?.discount_description}</p>
              <p className="text-xs text-muted-foreground mt-2">
                확인 후 바로 직원에게 화면을 보여주세요. 발급 후에는 취소할 수 없으며, 선택 가능 횟수가 1 차감됩니다.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSelectCoupon}>
              <Check className="w-4 h-4 mr-2" />
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 쿠폰 상세 다이얼로그 */}
      <AlertDialog open={showCouponDetailDialog} onOpenChange={setShowCouponDetailDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl">
              쿠폰이 발급되었습니다! 🎉
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-4">
                <Card className="border-primary/30">
                  <CardContent className="pt-6 space-y-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground mb-2">
                        {issuedCoupon?.store_name}
                      </p>
                      <div className="bg-primary/10 rounded-lg p-4 mb-3">
                        <p className="font-medium text-primary">
                          {issuedCoupon?.discount_description}
                        </p>
                      </div>
                    </div>
                    
                    {issuedCoupon?.terms && (
                      <div className="text-left">
                        <p className="text-xs font-medium text-foreground mb-1">사용 조건</p>
                        <p className="text-xs text-muted-foreground">
                          {issuedCoupon.terms}
                        </p>
                      </div>
                    )}
                    
                    <div className="text-left">
                      <p className="text-xs font-medium text-foreground mb-1">유효 기간</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(issuedCoupon?.valid_from).toLocaleDateString()} ~ {new Date(issuedCoupon?.valid_until).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-2">
                        매장에서 이 화면을 제시해주세요
                      </p>
                      <div className="bg-background rounded p-4 border-2 border-dashed border-border">
                        <Gift className="w-12 h-12 text-primary mx-auto" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <p className="text-xs text-center text-muted-foreground">
                  발급받은 쿠폰은 '마이페이지'에서 확인할 수 있습니다.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <AlertDialogAction onClick={() => {
              setShowCouponDetailDialog(false);
              setIssuedCoupon(null);
            }} className="w-full">
              확인
            </AlertDialogAction>
            <Button
              variant="outline"
              onClick={() => {
                setShowCouponDetailDialog(false);
                setIssuedCoupon(null);
                navigate("/my");
              }}
              className="w-full"
            >
              마이페이지로 이동
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Coupons;
