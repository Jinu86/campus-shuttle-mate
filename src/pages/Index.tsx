import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bus, Train } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const trainSchedules = {
  "mugunghwa-3410": { name: "무궁화 3410", arrivalTime: "14:30", departureFromSeoul: "12:45" },
  "ktx-101": { name: "KTX 101", arrivalTime: "15:00", departureFromSeoul: "13:50" },
  "itx-203": { name: "ITX 203", arrivalTime: "16:30", departureFromSeoul: "15:10" },
};

const Index = () => {
  const navigate = useNavigate();
  const [allShuttles, setAllShuttles] = useState<any[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<string>("mugunghwa-3410");
  const [tripType, setTripType] = useState<"board" | "alight">("alight");

  const dayTypes = ["평일", "주말", "방학"];

  useEffect(() => {
    loadShuttles();
  }, []);

  const loadShuttles = async () => {
    try {
      const { data, error } = await supabase
        .from("shuttle_schedules")
        .select("*")
        .order("departure_time");

      if (error) throw error;
      setAllShuttles(data || []);
    } catch (error) {
      console.error("셔틀 로드 실패:", error);
    }
  };

  const getCalculatedTime = () => {
    const train = trainSchedules[selectedTrain as keyof typeof trainSchedules];
    const shuttles = allShuttles.filter(s => s.day_type === "평일");
    
    if (tripType === "alight") {
      // 내릴때: 기차 도착 후 다음 셔틀 찾기
      const arrivalMinutes = parseInt(train.arrivalTime.split(":")[0]) * 60 + parseInt(train.arrivalTime.split(":")[1]);
      
      // 학교행 셔틀 찾기
      const schoolShuttles = shuttles.filter(s => s.destination === "학교");
      const nextShuttle = schoolShuttles.find(s => {
        const shuttleTime = s.departure_time.split(":");
        const shuttleMinutes = parseInt(shuttleTime[0]) * 60 + parseInt(shuttleTime[1]);
        return shuttleMinutes > arrivalMinutes;
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
      
      // 막차 시간 확인
      const lastShuttle = schoolShuttles[schoolShuttles.length - 1];
      if (lastShuttle) {
        const lastShuttleTime = lastShuttle.departure_time.split(":");
        const lastShuttleMinutes = parseInt(lastShuttleTime[0]) * 60 + parseInt(lastShuttleTime[1]);
        if (arrivalMinutes > lastShuttleMinutes) {
          return { shuttleTime: "없음", waitTime: 0, label: "조치원역에서 출발" };
        }
      }
      
      return { shuttleTime: "없음", waitTime: 0, label: "조치원역에서 출발" };
    } else {
      // 탈 때: 기차 타기 위해 교내 출발 셔틀 찾기
      const departureMinutes = parseInt(train.departureFromSeoul.split(":")[0]) * 60 + parseInt(train.departureFromSeoul.split(":")[1]);
      // 기차 출발 1시간 전에 조치원역 도착해야 함
      const requiredArrivalMinutes = departureMinutes - 60;
      
      // 조치원역행 셔틀 찾기 (역순으로 가장 늦은 시간 찾기)
      const stationShuttles = shuttles
        .filter(s => s.destination === "조치원역")
        .reverse();
      
      const requiredShuttle = stationShuttles.find(s => {
        const shuttleTime = s.departure_time.split(":");
        const shuttleMinutes = parseInt(shuttleTime[0]) * 60 + parseInt(shuttleTime[1]);
        const arrivalMinutes = shuttleMinutes + s.duration_minutes;
        return arrivalMinutes <= requiredArrivalMinutes;
      });
      
      if (requiredShuttle) {
        return {
          shuttleTime: requiredShuttle.departure_time.substring(0, 5),
          trainDeparture: train.departureFromSeoul,
          label: "교내 셔틀 탑승 시간"
        };
      }
      
      // 막차 시간 확인
      const firstShuttle = shuttles.find(s => s.destination === "조치원역");
      if (firstShuttle) {
        const firstShuttleTime = firstShuttle.departure_time.split(":");
        const firstShuttleMinutes = parseInt(firstShuttleTime[0]) * 60 + parseInt(firstShuttleTime[1]);
        const firstArrivalMinutes = firstShuttleMinutes + firstShuttle.duration_minutes;
        
        if (requiredArrivalMinutes < firstArrivalMinutes) {
          return { shuttleTime: "없음", trainDeparture: train.departureFromSeoul, label: "교내 셔틀 탑승 시간" };
        }
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
                  {trainSchedules["mugunghwa-3410"].name}{" "}
                  {tripType === "alight" 
                    ? `${trainSchedules["mugunghwa-3410"].arrivalTime} 조치원 도착`
                    : `${trainSchedules["mugunghwa-3410"].departureFromSeoul} 조치원 출발`
                  }
                </SelectItem>
                <SelectItem value="ktx-101">
                  {trainSchedules["ktx-101"].name}{" "}
                  {tripType === "alight"
                    ? `${trainSchedules["ktx-101"].arrivalTime} 조치원 도착`
                    : `${trainSchedules["ktx-101"].departureFromSeoul} 조치원 출발`
                  }
                </SelectItem>
                <SelectItem value="itx-203">
                  {trainSchedules["itx-203"].name}{" "}
                  {tripType === "alight"
                    ? `${trainSchedules["itx-203"].arrivalTime} 조치원 도착`
                    : `${trainSchedules["itx-203"].departureFromSeoul} 조치원 출발`
                  }
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

        {/* 셔틀 시간표 */}
        <Card className="shadow-soft border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">셔틀 시간표</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/shuttle")}
                className="text-xs"
              >
                전체보기
              </Button>
            </div>
            
            <Carousel className="w-full">
              <CarouselContent>
                {dayTypes.map((dayType) => {
                  const dayShuttles = allShuttles.filter(s => s.day_type === dayType);
                  return (
                    <CarouselItem key={dayType}>
                      <div className="space-y-3">
                        <p className="text-center text-sm font-bold text-primary">{dayType}</p>
                        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                          {dayShuttles.map((shuttle) => (
                            <div 
                              key={shuttle.id}
                              className="bg-secondary rounded-lg p-3 space-y-1"
                            >
                              <p className="text-lg font-bold text-foreground">
                                {shuttle.departure_time.substring(0, 5)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {shuttle.destination}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {shuttle.duration_minutes}분
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
