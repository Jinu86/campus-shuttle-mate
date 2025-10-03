import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import TripRegistrationModal from "@/components/TripRegistrationModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, Bus, Utensils } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const TEMP_USER_ID = "00000000-0000-0000-0000-000000000000";
  const [trip, setTrip] = useState<any>(null);
  const [shuttles, setShuttles] = useState<any[]>([]);
  const [menu, setMenu] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tripResult, shuttleResult, menuResult] = await Promise.all([
        supabase.from("trips").select("*").eq("user_id", TEMP_USER_ID).maybeSingle(),
        supabase.from("shuttle_schedules").select("*").eq("day_type", "평일").order("departure_time"),
        supabase.from("cafeteria_menus").select("*").eq("date", new Date().toISOString().split('T')[0]).eq("meal_type", "점심").maybeSingle(),
      ]);

      if (tripResult.data) setTrip(tripResult.data);
      if (shuttleResult.data) setShuttles(shuttleResult.data);
      if (menuResult.data) setMenu(menuResult.data);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    }
  };

  useEffect(() => {
    if (!trip || !shuttles.length) return;

    const interval = setInterval(() => {
      const now = new Date();
      const [hours, minutes] = trip.arrival_time.split(':');
      const trainTime = new Date();
      trainTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const neededShuttle = shuttles.find(s => {
        const [sh, sm] = s.departure_time.split(':');
        const shuttleTime = new Date();
        shuttleTime.setHours(parseInt(sh), parseInt(sm), 0, 0);
        const arrivalAtStation = new Date(shuttleTime.getTime() + s.duration_minutes * 60000);
        return arrivalAtStation <= trainTime;
      });

      if (neededShuttle) {
        const [sh, sm] = neededShuttle.departure_time.split(':');
        const shuttleTime = new Date();
        shuttleTime.setHours(parseInt(sh), parseInt(sm), 0, 0);
        const diff = shuttleTime.getTime() - now.getTime();
        
        if (diff > 0) {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setCountdown(`${minutes}분 ${seconds}초`);
        } else {
          setCountdown("출발했습니다");
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [trip, shuttles]);

  const handleModalSuccess = () => {
    loadData();
  };

  const getMustTakeShuttle = () => {
    if (!trip || !shuttles.length) return null;
    
    const [hours, minutes] = trip.arrival_time.split(':');
    const trainTime = new Date();
    trainTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    return shuttles.find(s => {
      const [sh, sm] = s.departure_time.split(':');
      const shuttleTime = new Date();
      shuttleTime.setHours(parseInt(sh), parseInt(sm), 0, 0);
      const arrivalAtStation = new Date(shuttleTime.getTime() + s.duration_minutes * 60000);
      return arrivalAtStation <= trainTime;
    });
  };

  const mustTakeShuttle = getMustTakeShuttle();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto px-5 py-6 space-y-5">
        <div className="pt-2 pb-1">
          <h1 className="text-2xl font-bold text-foreground">
            오늘의 캠퍼스
          </h1>
        </div>

        {!trip ? (
          <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-border bg-card">
            <CardContent className="pt-8 pb-8 text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-7 h-7 text-primary" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-foreground leading-relaxed">예매하신 기차 시간에 맞춰</p>
                <p className="text-base font-medium text-foreground leading-relaxed">셔틀을 찾아드릴게요</p>
              </div>
              <Button 
                onClick={() => setModalOpen(true)} 
                className="h-12 px-8 bg-primary hover:bg-primary-dark text-primary-foreground font-semibold rounded-lg shadow-[0_2px_8px_rgba(74,144,226,0.3)] transition-all hover:shadow-[0_4px_12px_rgba(74,144,226,0.4)]"
              >
                + 기차 시간 등록하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <AlertCircle className="w-5 h-5 text-accent" strokeWidth={2} />
                이 셔틀에 꼭 타셔야 합니다!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mustTakeShuttle ? (
                <>
                  <div className="text-center py-2">
                    <p className="text-5xl font-black text-foreground mb-1">{countdown}</p>
                    <p className="text-sm text-muted-foreground font-medium">남은 시간</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">셔틀 출발</span>
                      <span className="text-base font-bold text-foreground">{mustTakeShuttle.departure_time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">목적지</span>
                      <span className="text-base font-bold text-foreground">{trip.destination_station}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">기차 도착</span>
                      <span className="text-base font-bold text-foreground">{trip.arrival_time}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-4">탑승 가능한 셔틀이 없습니다.</p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 grid-cols-2">
          <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all cursor-pointer border-border bg-card" onClick={() => navigate("/shuttle")}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Bus className="w-4 h-4 text-primary" strokeWidth={2} />
                다음 셔틀
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {shuttles.length > 0 ? (
                <>
                  <div className="text-center py-1">
                    <p className="text-4xl font-black text-foreground">{shuttles[0].departure_time}</p>
                  </div>
                  <p className="text-xs text-center text-muted-foreground font-medium">{shuttles[0].destination}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">셔틀 정보 없음</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all cursor-pointer border-border bg-card" onClick={() => navigate("/cafeteria")}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Utensils className="w-4 h-4 text-primary" strokeWidth={2} />
                오늘의 학식
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {menu ? (
                <>
                  <ul className="text-xs text-muted-foreground space-y-1.5 min-h-[60px]">
                    {menu.menu_items.slice(0, 3).map((item: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">• {item}</li>
                    ))}
                  </ul>
                  <p className="text-base font-bold text-accent pt-1">{menu.price?.toLocaleString()}원</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">학식 정보 없음</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TripRegistrationModal 
        open={modalOpen} 
        onOpenChange={setModalOpen}
        onSuccess={handleModalSuccess}
      />
      <BottomNav />
    </div>
  );
};

export default Index;
