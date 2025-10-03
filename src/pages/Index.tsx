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
  const [user, setUser] = useState<any>(null);
  const [trip, setTrip] = useState<any>(null);
  const [shuttles, setShuttles] = useState<any[]>([]);
  const [menu, setMenu] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    loadData(user.id);
  };

  const loadData = async (userId: string) => {
    try {
      const [tripResult, shuttleResult, menuResult] = await Promise.all([
        supabase.from("trips").select("*").eq("user_id", userId).maybeSingle(),
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
    if (user) loadData(user.id);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 pb-24">
      <div className="max-w-screen-lg mx-auto p-4 space-y-4">
        <div className="pt-8 pb-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
            오늘의 캠퍼스
          </h1>
          <p className="text-muted-foreground mt-2">기차를 놓치지 마세요!</p>
        </div>

        {!trip ? (
          <Card className="shadow-medium border-2 border-primary/20 hover:border-primary/40 transition-all">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-lg font-medium mb-2">예매하신 기차 시간에 맞춰</p>
                <p className="text-lg font-medium mb-4">셔틀을 찾아드릴게요</p>
              </div>
              <Button onClick={() => setModalOpen(true)} size="lg" className="w-full max-w-xs">
                + 기차 시간 등록하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-medium border-2 border-accent bg-gradient-to-br from-accent/10 to-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-accent">
                <AlertCircle className="w-6 h-6" />
                이 셔틀에 꼭 타셔야 합니다!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mustTakeShuttle ? (
                <>
                  <div className="text-center">
                    <p className="text-5xl font-bold text-accent mb-2">{countdown}</p>
                    <p className="text-sm text-muted-foreground">남은 시간</p>
                  </div>
                  <div className="bg-card rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">셔틀 출발</span>
                      <span className="font-bold">{mustTakeShuttle.departure_time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">목적지</span>
                      <span className="font-bold">{trip.destination_station}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">기차 도착</span>
                      <span className="font-bold">{trip.arrival_time}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground">탑승 가능한 셔틀이 없습니다.</p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-soft hover:shadow-medium transition-all cursor-pointer" onClick={() => navigate("/shuttle")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bus className="w-5 h-5 text-primary" />
                다음 셔틀
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shuttles.length > 0 ? (
                <div className="space-y-2">
                  {shuttles.slice(0, 3).map((shuttle, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="font-medium">{shuttle.departure_time}</span>
                      <span className="text-sm text-muted-foreground">{shuttle.destination}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">셔틀 정보를 불러올 수 없습니다.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-medium transition-all cursor-pointer" onClick={() => navigate("/cafeteria")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-accent" />
                오늘의 학식
              </CardTitle>
            </CardHeader>
            <CardContent>
              {menu ? (
                <div className="space-y-2">
                  <p className="font-medium">{menu.meal_type} 메뉴</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {menu.menu_items.slice(0, 3).map((item: string, idx: number) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                  <p className="text-sm font-semibold text-primary mt-2">{menu.price?.toLocaleString()}원</p>
                </div>
              ) : (
                <p className="text-muted-foreground">학식 정보를 불러올 수 없습니다.</p>
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
