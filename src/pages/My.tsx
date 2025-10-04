import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, ShieldCheck, Gift, Share2, Copy, Ticket } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const My = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [trip, setTrip] = useState<any>(null);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [adminCode, setAdminCode] = useState("");
  const [coupons, setCoupons] = useState<any[]>([]);
  const [userCoupons, setUserCoupons] = useState<any>(null);
  const [selectedCoupons, setSelectedCoupons] = useState<any[]>([]);
  const [referralCode, setReferralCode] = useState<string>("");

  useEffect(() => {
    loadCoupons();
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error("쿠폰 로드 실패:", error);
    }
  };

  const loadUserData = async () => {
    if (!user) return;

    // 개발 모드인 경우 가짜 데이터 설정
    const isDevMode = typeof window !== 'undefined' && localStorage.getItem('DEV_MODE') === 'true';
    if (isDevMode) {
      setTrip(null);
      setAlarms([]);
      setSettings({ menu_alarm_enabled: false });
      setUserCoupons({ available_count: 3, total_earned: 5 });
      setSelectedCoupons([]);
      setReferralCode('DEV123');
      return;
    }

    try {
      const [tripResult, alarmsResult, settingsResult, userCouponsResult, selectedCouponsResult, profileResult] = await Promise.all([
        supabase.from("trips").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("alarms").select("*").eq("user_id", user.id),
        supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_coupons").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_selected_coupons").select("*, coupons(*)").eq("user_id", user.id),
        supabase.from("profiles").select("referral_code").eq("id", user.id).maybeSingle(),
      ]);

      if (tripResult.data) setTrip(tripResult.data);
      if (alarmsResult.data) setAlarms(alarmsResult.data);
      if (settingsResult.data) setSettings(settingsResult.data);
      if (userCouponsResult.data) setUserCoupons(userCouponsResult.data);
      if (selectedCouponsResult.data) setSelectedCoupons(selectedCouponsResult.data);
      if (profileResult.data?.referral_code) setReferralCode(profileResult.data.referral_code);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    }
  };

  const deleteTrip = async () => {
    if (!trip) return;

    try {
      const { error } = await supabase.from("trips").delete().eq("id", trip.id);
      if (error) throw error;

      toast.success("기차 시간이 삭제되었습니다.");
      setTrip(null);
    } catch (error: any) {
      toast.error(error.message || "삭제에 실패했습니다.");
    }
  };

  const deleteAlarm = async (alarmId: string) => {
    try {
      const { error } = await supabase.from("alarms").delete().eq("id", alarmId);
      if (error) throw error;

      toast.success("알림이 취소되었습니다.");
      setAlarms(alarms.filter(a => a.id !== alarmId));
    } catch (error: any) {
      toast.error(error.message || "삭제에 실패했습니다.");
    }
  };

  const handleAdminVerification = async () => {
    if (!adminCode.trim()) {
      toast.error("관리자 코드를 입력해주세요.");
      return;
    }
    
    // TODO: 서버에서 관리자 코드 검증 로직 추가 예정
    toast.info("관리자 인증 기능은 준비중입니다.");
    setAdminCode("");
  };

  const handleCopyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      toast.success("추천인 코드가 복사되었습니다!");
    } catch (error) {
      toast.error("복사에 실패했습니다.");
    }
  };

  const handleShareReferralCode = () => {
    const message = `🎉 한양대 ERICA 캠퍼스 학생이라면 꼭 써보세요!\n\n셔틀버스, 학식, 기차 시간표를 한눈에!\n추천인 코드: ${referralCode}\n\n회원가입하고 쿠폰도 받으세요! 🎁`;
    
    // 카카오톡 공유 (웹 환경에서는 URL 공유)
    if (navigator.share) {
      navigator.share({
        title: 'ERICA 캠퍼스 앱 초대',
        text: message,
      }).catch(() => {
        // 공유 실패 시 클립보드 복사
        navigator.clipboard.writeText(message);
        toast.success("공유 메시지가 복사되었습니다!");
      });
    } else {
      // Web Share API를 지원하지 않는 경우 클립보드 복사
      navigator.clipboard.writeText(message);
      toast.success("공유 메시지가 복사되었습니다!");
    }
  };

  const handleKakaoLogin = async () => {
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto px-5 py-4">
          <h1 className="text-xl font-bold text-foreground">MY</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-6">
        {/* 쿠폰 사용처 (로그인 없이 확인 가능) */}
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Ticket className="w-5 h-5 text-primary" />
              이용 가능한 쿠폰
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coupons.length > 0 ? (
              <div className="space-y-3">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="bg-secondary rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-foreground">{coupon.store_name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{coupon.discount_description}</p>
                      </div>
                    </div>
                    {coupon.max_issuance && (
                      <p className="text-xs text-muted-foreground">
                        발급: {coupon.issued_count}/{coupon.max_issuance}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      유효기간: {new Date(coupon.valid_from).toLocaleDateString()} ~ {new Date(coupon.valid_until).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-6">
                현재 이용 가능한 쿠폰이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>

        {!user ? (
          /* 로그인 전 UI */
          <Card className="shadow-soft border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Gift className="w-12 h-12 text-primary mx-auto" />
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-2">
                    로그인하고 쿠폰 받기
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    회원가입 시 쿠폰 1장 지급!<br />
                    친구 추천 시 추가 쿠폰 지급!
                  </p>
                </div>
                <Button onClick={handleKakaoLogin} className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#000000] font-semibold">
                  카카오로 로그인하기
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* 로그인 후 UI */
          <>
            {/* 내 쿠폰 현황 */}
            <Card className="shadow-soft border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Gift className="w-5 h-5 text-primary" />
                  내 쿠폰
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">선택 가능한 쿠폰</p>
                  <p className="text-4xl font-bold text-primary">{userCoupons?.available_count || 0}</p>
                  <p className="text-xs text-muted-foreground mt-2">총 획득: {userCoupons?.total_earned || 0}장</p>
                </div>
                
                <Button 
                  onClick={() => navigate("/coupons")} 
                  className="w-full"
                  disabled={(userCoupons?.available_count || 0) === 0}
                >
                  쿠폰 선택하기
                </Button>

                {selectedCoupons.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">보유 중인 쿠폰</p>
                    {selectedCoupons.map((sc) => (
                      <div key={sc.id} className="bg-secondary rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-sm text-foreground">{sc.coupons?.store_name}</p>
                            <p className="text-xs text-muted-foreground">{sc.coupons?.discount_description}</p>
                          </div>
                          {sc.is_used ? (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">사용완료</span>
                          ) : (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">사용가능</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 추천인 코드 */}
            <Card className="shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Share2 className="w-4 h-4 text-primary" />
                  친구 초대하고 쿠폰 받기
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-secondary rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-2">내 추천인 코드</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background px-3 py-2 rounded text-lg font-bold text-primary">
                      {referralCode}
                    </code>
                    <Button size="sm" variant="outline" onClick={handleCopyReferralCode}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <Button onClick={handleShareReferralCode} variant="secondary" className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  친구에게 공유하기
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  친구가 이 코드로 가입하면 쿠폰 +1 🎁
                </p>
              </CardContent>
            </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Bell className="w-5 h-5 text-primary" />
              현재 등록된 기차 시간
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trip ? (
              <div className="space-y-3">
                <div className="bg-secondary rounded-lg p-4 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">도착역</span>
                    <span className="font-bold text-foreground">{trip.destination_station}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">도착 시간</span>
                    <span className="font-bold text-foreground">{trip.arrival_time}</span>
                  </div>
                  {trip.route_type && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">경로 유형</span>
                      <span className="font-bold text-foreground">{trip.route_type}</span>
                    </div>
                  )}
                </div>
                <Button onClick={deleteTrip} variant="destructive" className="w-full">
                  삭제
                </Button>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-6">
                등록된 기차 시간이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Bell className="w-5 h-5 text-primary" />
              알림 설정 관리
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings?.menu_alarm_enabled && (
              <div className="bg-secondary rounded-lg p-4 flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">학식 메뉴 알림</span>
                <span className="text-sm font-semibold text-primary">활성화됨</span>
              </div>
            )}
            
            {alarms.length > 0 ? (
              alarms.map((alarm) => (
                <div key={alarm.id} className="bg-secondary rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {alarm.alarm_type === "SHUTTLE" ? "셔틀 알림" : "학식 알림"}
                    </p>
                    {alarm.minutes_before && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {alarm.minutes_before}분 전
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => deleteAlarm(alarm.id)}
                    variant="outline"
                    size="sm"
                  >
                    취소
                  </Button>
                </div>
              ))
            ) : (
              !settings?.menu_alarm_enabled && (
                <p className="text-center text-sm text-muted-foreground py-6">
                  설정된 알림이 없습니다.
                </p>
              )
            )}
          </CardContent>
        </Card>

            {/* 관리자 인증 */}
            <Card className="shadow-soft border-muted">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="w-4 h-4" />
                  관리자 인증
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="관리자 코드 입력"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    className="text-sm"
                  />
                  <Button 
                    onClick={handleAdminVerification}
                    size="sm"
                    variant="outline"
                  >
                    인증
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* 로그인 없이도 표시되는 섹션들 */}
        {!user && (
          <>
            {/* 현재 등록된 기차 시간 - 로그인 필요 */}
            <Card className="shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Bell className="w-5 h-5 text-primary" />
                  현재 등록된 기차 시간
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    로그인이 필요한 서비스입니다
                  </p>
                  <Button onClick={handleKakaoLogin} size="sm">
                    로그인하기
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 알림 설정 관리 - 로그인 필요 */}
            <Card className="shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Bell className="w-5 h-5 text-primary" />
                  알림 설정 관리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    로그인이 필요한 서비스입니다
                  </p>
                  <Button onClick={handleKakaoLogin} size="sm">
                    로그인하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default My;
