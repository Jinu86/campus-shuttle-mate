import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bus, Train } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const trainSchedules = {
  "mugunghwa-3410": { name: "무궁화 3410", arrivalTime: "14:30", departureFromSeoul: "12:45" },
  "ktx-101": { name: "KTX 101", arrivalTime: "15:00", departureFromSeoul: "13:50" },
  "itx-203": { name: "ITX 203", arrivalTime: "16:30", departureFromSeoul: "15:10" },
};

const Index = () => {
  const navigate = useNavigate();
  const [shuttles, setShuttles] = useState<any[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<string>("mugunghwa-3410");
  const [tripType, setTripType] = useState<"board" | "alight">("alight");

  useEffect(() => {
    loadShuttles();
  }, []);

  const loadShuttles = async () => {
    try {
      const { data, error } = await supabase
        .from("shuttle_schedules")
        .select("*")
        .eq("day_type", "평일")
        .order("departure_time");

      if (error) throw error;
      setShuttles(data || []);
    } catch (error) {
      console.error("셔틀 로드 실패:", error);
    }
  };

  const getCalculatedTime = () => {
    const train = trainSchedules[selectedTrain as keyof typeof trainSchedules];
    
    if (tripType === "alight") {
      // 내릴때: 기차 도착 후 다음 셔틀 찾기
      const arrivalMinutes = parseInt(train.arrivalTime.split(":")[0]) * 60 + parseInt(train.arrivalTime.split(":")[1]);
      const nextShuttle = shuttles.find(s => {
        const shuttleTime = s.departure_time.split(":");
        const shuttleMinutes = parseInt(shuttleTime[0]) * 60 + parseInt(shuttleTime[1]);
        return shuttleMinutes > arrivalMinutes && s.destination === "학교";
      });
      
      if (nextShuttle) {
        const shuttleMinutes = parseInt(nextShuttle.departure_time.split(":")[0]) * 60 + parseInt(nextShuttle.departure_time.split(":")[1]);
        const waitTime = shuttleMinutes - arrivalMinutes;
        return {
          shuttleTime: nextShuttle.departure_time.substring(0, 5),
          waitTime,
          label: "조치원역에서 출발"
        };
      }
      return { shuttleTime: "없음", waitTime: 0, label: "조치원역에서 출발" };
    } else {
      // 탈 때: 기차 타기 위해 교내 출발 셔틀 찾기
      const departureMinutes = parseInt(train.departureFromSeoul.split(":")[0]) * 60 + parseInt(train.departureFromSeoul.split(":")[1]);
      // 기차 출발 1시간 전에 조치원역 도착해야 함
      const requiredArrivalMinutes = departureMinutes - 60;
      
      const requiredShuttle = shuttles.find(s => {
        const shuttleTime = s.departure_time.split(":");
        const shuttleMinutes = parseInt(shuttleTime[0]) * 60 + parseInt(shuttleTime[1]);
        const arrivalMinutes = shuttleMinutes + s.duration_minutes;
        return arrivalMinutes <= requiredArrivalMinutes && s.destination === "조치원역";
      });
      
      if (requiredShuttle) {
        return {
          shuttleTime: requiredShuttle.departure_time.substring(0, 5),
          trainDeparture: train.departureFromSeoul,
          label: "교내 셔틀 탑승 시간"
        };
      }
      return { shuttleTime: "없음", trainDeparture: train.departureFromSeoul, label: "교내 셔틀 탑승 시간" };
    }
  };

  const calculatedResult = getCalculatedTime();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto px-5 py-4">
          <h1 className="text-xl font-bold text-foreground">바로 셔틀</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-4">
        {/* 학교에서 출발 카드 */}
        <Card className="shadow-soft border-border bg-card">
          <CardContent className="p-5 flex items-center gap-2">
            <Bus className="w-8 h-8 text-primary flex-shrink-0" strokeWidth={2} />
            <div className="flex-1">
              <p className="text-base font-medium text-foreground mb-1">학교에서 출발</p>
              <p className="text-5xl font-black text-foreground">08:00</p>
            </div>
          </CardContent>
        </Card>

        {/* 조치원역에서 출발 카드 */}
        <Card className="shadow-soft border-border bg-card">
          <CardContent className="p-5 flex items-center gap-2">
            <Bus className="w-8 h-8 text-primary flex-shrink-0" strokeWidth={2} />
            <div className="flex-1">
              <p className="text-base font-medium text-foreground mb-1">조치원역에서 출발</p>
              <p className="text-5xl font-black text-foreground">08:10</p>
            </div>
          </CardContent>
        </Card>

        {/* 서울 시간 계산기 카드 */}
        <Card className="shadow-soft border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Train className="w-6 h-6 text-primary" strokeWidth={2} />
              <h3 className="text-lg font-bold text-foreground">셔틀 시간 계산기</h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base text-foreground">기차에</span>
              <Button
                variant={tripType === "board" ? "default" : "outline"}
                size="sm"
                onClick={() => setTripType("board")}
                className="text-sm"
              >
                탈 때
              </Button>
              <Button
                variant={tripType === "alight" ? "default" : "outline"}
                size="sm"
                onClick={() => setTripType("alight")}
                className="text-sm"
              >
                내릴때
              </Button>
            </div>

            <Select value={selectedTrain} onValueChange={setSelectedTrain}>
              <SelectTrigger className="w-full bg-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mugunghwa-3410">
                  {trainSchedules["mugunghwa-3410"].name} {trainSchedules["mugunghwa-3410"].arrivalTime} 조치원 도착
                </SelectItem>
                <SelectItem value="ktx-101">
                  {trainSchedules["ktx-101"].name} {trainSchedules["ktx-101"].arrivalTime} 조치원 도착
                </SelectItem>
                <SelectItem value="itx-203">
                  {trainSchedules["itx-203"].name} {trainSchedules["itx-203"].arrivalTime} 조치원 도착
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="border-t border-border pt-4 space-y-3">
              {tripType === "alight" ? (
                <>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">조치원역 도착</p>
                    <p className="text-2xl font-bold text-foreground">
                      {trainSchedules[selectedTrain as keyof typeof trainSchedules].arrivalTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bus className="w-5 h-5 text-primary" strokeWidth={2} />
                    <p className="text-sm font-medium text-foreground">{calculatedResult.label}</p>
                  </div>
                  <p className="text-3xl font-black text-foreground">
                    {calculatedResult.shuttleTime}{" "}
                    {'waitTime' in calculatedResult && calculatedResult.waitTime > 0 && (
                      <span className="text-lg text-muted-foreground">
                        ({calculatedResult.waitTime}분 대기)
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">조치원역 출발 (서울행)</p>
                    <p className="text-2xl font-bold text-foreground">
                      {'trainDeparture' in calculatedResult && calculatedResult.trainDeparture}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bus className="w-5 h-5 text-primary" strokeWidth={2} />
                    <p className="text-sm font-medium text-foreground">{calculatedResult.label}</p>
                  </div>
                  <p className="text-3xl font-black text-foreground">{calculatedResult.shuttleTime}</p>
                  <Button size="sm" className="w-full mt-2">
                    알람 설정
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 서툴시간표 이미지 배너 */}
        <div 
          className="bg-muted rounded-lg h-52 flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
          onClick={() => navigate("/shuttle")}
        >
          <p className="text-lg font-medium text-muted-foreground">서툴시간표 이미지</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
