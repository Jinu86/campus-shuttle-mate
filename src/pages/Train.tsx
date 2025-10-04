import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const Train = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trainDate, setTrainDate] = useState<Date>();
  const [selectedTrain, setSelectedTrain] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  // 조치원역 기차 시간표 (예시 데이터)
  const trainSchedule = [
    { type: "ITX-새마을", time: "06:30", destination: "용산", trainNumber: "ITX-새마을 1001" },
    { type: "무궁화호", time: "07:15", destination: "서울", trainNumber: "무궁화 1301" },
    { type: "ITX-마음", time: "08:00", destination: "용산", trainNumber: "ITX-마음 1106" },
    { type: "무궁화호", time: "08:45", destination: "청량리", trainNumber: "무궁화 1303" },
    { type: "ITX-새마을", time: "09:30", destination: "용산", trainNumber: "ITX-새마을 1003" },
    { type: "무궁화호", time: "10:15", destination: "서울", trainNumber: "무궁화 1305" },
    { type: "ITX-마음", time: "11:00", destination: "용산", trainNumber: "ITX-마음 1108" },
    { type: "무궁화호", time: "11:45", destination: "청량리", trainNumber: "무궁화 1307" },
    { type: "ITX-새마을", time: "12:30", destination: "용산", trainNumber: "ITX-새마을 1005" },
    { type: "무궁화호", time: "13:15", destination: "서울", trainNumber: "무궁화 1309" },
    { type: "ITX-마음", time: "14:00", destination: "용산", trainNumber: "ITX-마음 1110" },
    { type: "무궁화호", time: "14:45", destination: "청량리", trainNumber: "무궁화 1311" },
    { type: "ITX-새마을", time: "15:30", destination: "용산", trainNumber: "ITX-새마을 1007" },
    { type: "무궁화호", time: "16:15", destination: "서울", trainNumber: "무궁화 1313" },
    { type: "ITX-마음", time: "17:00", destination: "용산", trainNumber: "ITX-마음 1112" },
    { type: "무궁화호", time: "17:45", destination: "청량리", trainNumber: "무궁화 1315" },
    { type: "ITX-새마을", time: "18:30", destination: "용산", trainNumber: "ITX-새마을 1009" },
    { type: "무궁화호", time: "19:15", destination: "서울", trainNumber: "무궁화 1317" },
    { type: "ITX-마음", time: "20:00", destination: "용산", trainNumber: "ITX-마음 1114" },
    { type: "무궁화호", time: "20:45", destination: "청량리", trainNumber: "무궁화 1319" },
    { type: "ITX-새마을", time: "21:30", destination: "용산", trainNumber: "ITX-새마을 1011" },
  ];


  const searchRoutes = async (train: any) => {
    if (!trainDate) {
      toast.error("날짜를 선택해주세요.");
      return;
    }
    
    setSelectedTrain(train);

    setSearching(true);
    try {
      // Calculate when user needs to arrive at station (10 minutes before train)
      const [hours, minutes] = train.time.split(":").map(Number);
      const trainTime = new Date();
      trainTime.setHours(hours, minutes, 0);
      
      const requiredArrivalTime = new Date(trainTime.getTime() - 10 * 60000);
      const requiredArrivalTimeStr = `${String(requiredArrivalTime.getHours()).padStart(2, '0')}:${String(requiredArrivalTime.getMinutes()).padStart(2, '0')}`;

      // Fetch shuttle schedules for the selected date
      const dayOfWeek = trainDate.getDay();
      let dayType = "월~목";
      if (dayOfWeek === 5) dayType = "금요일";
      else if (dayOfWeek === 0) dayType = "일요일";
      else if (dayOfWeek === 6) {
        toast.error("토요일에는 셔틀이 운행하지 않습니다.");
        setSearching(false);
        return;
      }

      const { data: shuttles, error } = await supabase
        .from("shuttle_schedules")
        .select("*")
        .eq("day_type", dayType)
        .eq("destination", "조치원역")
        .order("departure_time");

      if (error) throw error;

      // Find suitable shuttle
      const suitableShuttle = shuttles?.find(shuttle => {
        const [shuttleArrHours, shuttleArrMinutes] = shuttle.departure_time.split(":").map(Number);
        const shuttleArrivalTime = new Date();
        shuttleArrivalTime.setHours(shuttleArrHours, shuttleArrMinutes + shuttle.duration_minutes, 0);
        
        return shuttleArrivalTime <= requiredArrivalTime;
      });

      if (!suitableShuttle) {
        toast.error("해당 시간에 맞는 셔틀을 찾을 수 없습니다.");
        setSearching(false);
        return;
      }

      const shuttleArrivalTime = new Date();
      const [depH, depM] = suitableShuttle.departure_time.split(":").map(Number);
      shuttleArrivalTime.setHours(depH, depM + suitableShuttle.duration_minutes, 0);

      const mockRoutes = [
        {
          totalTime: Math.round((trainTime.getTime() - new Date().setHours(depH, depM, 0)) / 60000),
          shuttleInfo: {
            id: suitableShuttle.id,
            departureTime: suitableShuttle.departure_time,
            arrivalTime: `${String(shuttleArrivalTime.getHours()).padStart(2, '0')}:${String(shuttleArrivalTime.getMinutes()).padStart(2, '0')}`,
            duration: suitableShuttle.duration_minutes,
          },
          trainInfo: {
            ...train,
            departureTime: train.time,
            requiredArrival: requiredArrivalTimeStr,
          },
        },
      ];

      setRoutes(mockRoutes);
    } catch (error) {
      toast.error("경로 탐색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  };

  const registerRoute = async (route: any) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }
    
    if (!trainDate) return;

    try {
      // Insert trip
      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          destination_station: "조치원역",
          arrival_time: route.trainInfo.requiredArrival,
          train_date: format(trainDate, "yyyy-MM-dd"),
          train_departure_time: selectedTrain?.time,
          route_type: "직행",
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Create alarm for shuttle (5 minutes before departure)
      const { error: alarmError } = await supabase.from("alarms").insert({
        user_id: user.id,
        alarm_type: "shuttle",
        target_id: tripData.id,
        minutes_before: 5,
        enabled: true,
      });

      if (alarmError) throw alarmError;

      toast.success("기차 시간과 셔틀 알람이 등록되었습니다!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "등록에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto px-5 py-4">
          <h1 className="text-xl font-bold text-foreground">기차</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-6">

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-foreground">조치원역 기차 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">날짜</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !trainDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {trainDate ? format(trainDate, "PPP", { locale: ko }) : "날짜를 선택하세요"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={trainDate}
                    onSelect={setTrainDate}
                    initialFocus
                    locale={ko}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {trainDate && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">기차 시간 선택</h2>
            {trainSchedule.map((train) => (
              <Card 
                key={train.trainNumber}
                className={cn(
                  "shadow-soft cursor-pointer transition-smooth hover:shadow-medium",
                  selectedTrain?.trainNumber === train.trainNumber && "ring-2 ring-primary"
                )}
                onClick={() => searchRoutes(train)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 px-3 py-1 rounded-md">
                        <span className="text-sm font-bold text-primary">{train.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-lg font-bold text-foreground">{train.time}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{train.destination}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{train.trainNumber}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {routes.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">추천 경로</h2>
            {routes.map((route, idx) => (
              <Card key={idx} className="shadow-soft hover:shadow-medium transition-smooth">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                    <MapPin className="w-5 h-5 text-primary" />
                    학교 → 조치원역 경로
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-secondary rounded-lg p-3 space-y-1.5">
                    <p className="font-semibold text-sm text-primary">셔틀버스 (학교 → 조치원역)</p>
                    <div className="flex justify-between text-sm text-foreground">
                      <span>출발: {route.shuttleInfo.departureTime}</span>
                      <span>도착: {route.shuttleInfo.arrivalTime}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      소요시간: {route.shuttleInfo.duration}분
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center py-2">
                    <div className="h-px bg-border flex-1" />
                    <span className="px-3 text-xs text-muted-foreground">환승 대기</span>
                    <div className="h-px bg-border flex-1" />
                  </div>
                  
                  <div className="bg-secondary rounded-lg p-3 space-y-2">
                    <p className="font-semibold text-sm text-primary">기차 (조치원역 출발)</p>
                    <div className="text-sm text-foreground space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">열차:</span>
                        <span className="font-semibold">{route.trainInfo.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">출발:</span>
                        <span className="font-semibold">{route.trainInfo.departureTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">도착역:</span>
                        <span className="font-semibold">{route.trainInfo.destination}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">열차번호:</span>
                        <span className="font-semibold text-xs">{route.trainInfo.trainNumber}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                        * {route.trainInfo.requiredArrival}까지 조치원역 도착 필요
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/10 rounded-lg p-3 text-sm">
                    <p className="font-semibold text-primary mb-1">🔔 알람 설정</p>
                    <p className="text-xs text-muted-foreground">
                      셔틀 출발 5분 전 ({route.shuttleInfo.departureTime})에 알람이 울립니다
                    </p>
                  </div>
                  
                  <Button 
                    onClick={() => registerRoute(route)} 
                    className="w-full"
                  >
                    이 경로로 등록하기
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Train;
