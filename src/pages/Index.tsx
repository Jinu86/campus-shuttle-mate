import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bus, Train, ArrowLeftRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

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
  const [isSemesterActive, setIsSemesterActive] = useState(true);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [shuttleDirection, setShuttleDirection] = useState<"toStation" | "toSchool">("toStation");

  // Get current day
  const getCurrentDayName = () => {
    const day = new Date().getDay(); // 0=일요일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
    const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    return dayNames[day];
  };

  // Map day name to DB day_type
  const getDayTypeForDB = (dayName: string) => {
    if (dayName === "월요일" || dayName === "화요일" || dayName === "수요일" || dayName === "목요일") {
      return "월~목";
    }
    if (dayName === "토요일") return null;
    return dayName;
  };

  const currentDayName = getCurrentDayName();
  
  // All day types in order (월~일)
  const dayTypes = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];

  useEffect(() => {
    loadShuttles();
    // Set initial carousel index to current day
    const currentIndex = dayTypes.indexOf(currentDayName);
    if (currentIndex !== -1) {
      setCurrentDayIndex(currentIndex);
    }
  }, []);

  const loadShuttles = async () => {
    try {
      // Load shuttle schedules
      const { data: shuttleData, error: shuttleError } = await supabase
        .from("shuttle_schedules")
        .select("id, day_type, destination, departure_time, arrival_time, notes")
        .order("departure_time");

      if (shuttleError) throw shuttleError;
      setAllShuttles((shuttleData as any) || []);

      // Load semester status
      const { data: semesterData, error: semesterError } = await supabase
        .from("semester_status")
        .select("is_semester_active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (semesterError) throw semesterError;
      if (semesterData) {
        setIsSemesterActive(semesterData.is_semester_active);
      }
    } catch (error) {
      console.error("셔틀 로드 실패:", error);
    }
  };

  const getCalculatedTime = () => {
    const train = trainSchedules[selectedTrain as keyof typeof trainSchedules];
    const dbDayType = getDayTypeForDB(currentDayName);
    
    // 토요일이거나 운영하지 않는 날인 경우
    if (!dbDayType) {
      return { 
        shuttleTime: "--:--", 
        arrivalTime: "--:--", 
        waitTime: 0, 
        label: tripType === "alight" ? "조치원역에서 출발" : "학교앞 셔틀 탑승 시간",
        trainDeparture: tripType === "board" ? train.departureFromSeoul : undefined
      };
    }
    
    const shuttles = allShuttles.filter(s => s.day_type === dbDayType);
    
    if (tripType === "alight") {
      // 내릴때: 기차 도착 후 다음 셔틀 찾기 (조치원역→학교)
      const arrivalMinutes = parseInt(train.arrivalTime.split(":")[0]) * 60 + parseInt(train.arrivalTime.split(":")[1]);
      
      const nextShuttle = shuttles.find(s => {
        const shuttleTime = s.departure_time.split(":");
        const shuttleMinutes = parseInt(shuttleTime[0]) * 60 + parseInt(shuttleTime[1]);
        return shuttleMinutes > arrivalMinutes;
      });
      
      if (nextShuttle) {
        const shuttleMinutes = parseInt(nextShuttle.departure_time.split(":")[0]) * 60 + parseInt(nextShuttle.departure_time.split(":")[1]);
        const waitTime = shuttleMinutes - arrivalMinutes;
        return {
          shuttleTime: nextShuttle.departure_time.substring(0, 5),
          arrivalTime: nextShuttle.arrival_time?.substring(0, 5) || "",
          waitTime,
          label: "조치원역에서 출발"
        };
      }
      
      return { shuttleTime: "없음", arrivalTime: "", waitTime: 0, label: "조치원역에서 출발" };
    } else {
      // 탈 때: 기차 타기 위해 학교에서 출발하는 셔틀 찾기
      const departureMinutes = parseInt(train.departureFromSeoul.split(":")[0]) * 60 + parseInt(train.departureFromSeoul.split(":")[1]);
      // 기차 출발 30분 전에 조치원역 도착해야 함
      const requiredArrivalMinutes = departureMinutes - 30;
      
      // 역순으로 가장 늦은 시간 찾기
      const reversedShuttles = [...shuttles].reverse();
      
      const requiredShuttle = reversedShuttles.find(s => {
        if (!s.arrival_time) return false;
        const arrivalTime = s.arrival_time.split(":");
        const arrivalMins = parseInt(arrivalTime[0]) * 60 + parseInt(arrivalTime[1]);
        return arrivalMins <= requiredArrivalMinutes;
      });
      
      if (requiredShuttle) {
        return {
          shuttleTime: requiredShuttle.departure_time.substring(0, 5),
          arrivalTime: requiredShuttle.arrival_time?.substring(0, 5) || "",
          trainDeparture: train.departureFromSeoul,
          label: "학교앞 셔틀 탑승 시간"
        };
      }
      
      return { shuttleTime: "없음", arrivalTime: "", trainDeparture: train.departureFromSeoul, label: "학교앞 셔틀 탑승 시간" };
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
        {/* 운행 상태 알림 */}
        {!isSemesterActive && (
          <Card className="shadow-soft border-destructive bg-destructive/10">
            <CardContent className="p-4 text-center">
              <p className="text-base font-bold text-destructive">
                방학 기간 중으로 셔틀이 운휴합니다
              </p>
            </CardContent>
          </Card>
        )}

        {/* 다음 셔틀 시간 표시 */}
        {(() => {
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const dbDayType = getDayTypeForDB(currentDayName);
          const isSaturday = currentDayName === "토요일";
          const todayShuttles = isSaturday || !dbDayType ? [] : allShuttles.filter(s => s.day_type === dbDayType);

          const findNext = (dest: string) => todayShuttles.find(s => {
            if (s.destination !== dest) return false;
            const [h, m] = s.departure_time.split(":").map(Number);
            return h * 60 + m > currentMinutes;
          });

          const nextSchoolShuttle = findNext("조치원역");
          const nextStationShuttle = findNext("학교");

          return (
            <div className="grid grid-cols-2 gap-3">
              <Card className="shadow-soft border-border bg-card">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Bus className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={2} />
                    <p className="text-sm font-medium text-foreground">학교 출발</p>
                  </div>
                  <p className="text-3xl font-black text-foreground">
                    {isSaturday || !nextSchoolShuttle ? "--:--" : nextSchoolShuttle.departure_time.substring(0, 5)}
                  </p>
                  <div>
                    <p className="text-xs text-muted-foreground">도착</p>
                    <p className="text-lg font-bold text-foreground">
                      {isSaturday || !nextSchoolShuttle ? "--:--" : (nextSchoolShuttle.arrival_time?.substring(0, 5) || "-")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-soft border-border bg-card">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Bus className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={2} />
                    <p className="text-sm font-medium text-foreground">조치원역 출발</p>
                  </div>
                  <p className="text-3xl font-black text-foreground">
                    {isSaturday || !nextStationShuttle ? "--:--" : nextStationShuttle.departure_time.substring(0, 5)}
                  </p>
                  <div>
                    <p className="text-xs text-muted-foreground">도착</p>
                    <p className="text-lg font-bold text-foreground">
                      {isSaturday || !nextStationShuttle ? "--:--" : (nextStationShuttle.arrival_time?.substring(0, 5) || "-")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}

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
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Bus className="w-5 h-5 text-primary" strokeWidth={2} />
                      <p className="text-sm font-medium text-foreground">{calculatedResult.label}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">출발</p>
                        <p className="text-3xl font-black text-foreground">
                          {calculatedResult.shuttleTime}
                        </p>
                      </div>
                      {'arrivalTime' in calculatedResult && calculatedResult.arrivalTime && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">도착</p>
                          <p className="text-2xl font-bold text-foreground">
                            {calculatedResult.arrivalTime}
                          </p>
                        </div>
                      )}
                    </div>
                    {'waitTime' in calculatedResult && calculatedResult.waitTime > 0 && (
                      <p className="text-sm text-muted-foreground">
                        ({calculatedResult.waitTime}분 대기)
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">조치원역 출발 (서울행)</p>
                    <p className="text-2xl font-bold text-foreground">
                      {'trainDeparture' in calculatedResult && calculatedResult.trainDeparture}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Bus className="w-5 h-5 text-primary" strokeWidth={2} />
                      <p className="text-sm font-medium text-foreground">{calculatedResult.label}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">출발</p>
                        <p className="text-3xl font-black text-foreground">
                          {calculatedResult.shuttleTime}
                        </p>
                      </div>
                      {'arrivalTime' in calculatedResult && calculatedResult.arrivalTime && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">도착</p>
                          <p className="text-2xl font-bold text-foreground">
                            {calculatedResult.arrivalTime}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 셔틀 시간표 */}
        <Card className="shadow-soft border-border bg-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">셔틀 시간표</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {shuttleDirection === "toStation" ? "학교 출발" : "조치원역 출발"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShuttleDirection(shuttleDirection === "toStation" ? "toSchool" : "toStation")}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/shuttle")}
                className="text-xs"
              >
                전체보기
              </Button>
            </div>
            
            {!isSemesterActive ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">방학 중에는 셔틀이 운행하지 않습니다</p>
              </div>
            ) : (
              <Carousel className="w-full" opts={{ startIndex: currentDayIndex, loop: true }}>
                <CarouselContent>
                  {dayTypes.map((dayName) => {
                    const dbDayType = getDayTypeForDB(dayName);
                    const isToday = dayName === currentDayName;
                    const now = new Date();
                    const currentMinutes = now.getHours() * 60 + now.getMinutes();
                    
                    // 목적지에 따라 필터링
                    const destination = shuttleDirection === "toStation" ? "조치원역" : "학교";
                    let dayShuttles = dbDayType 
                      ? allShuttles.filter(s => s.day_type === dbDayType && s.destination === destination) 
                      : [];
                    
                    // 당일인 경우 현재 시간 이후의 셔틀만 표시
                    if (isToday && dayShuttles.length > 0) {
                      dayShuttles = dayShuttles.filter(shuttle => {
                        const [h, m] = shuttle.departure_time.split(":").map(Number);
                        return h * 60 + m > currentMinutes;
                      });
                    }
                    
                    return (
                      <CarouselItem key={dayName}>
                         <div className="space-y-3">
                          <div className="flex items-center justify-center gap-12">
                            <div className="w-6" />
                            <p className="text-sm font-bold text-primary">
                              {dayName}
                            </p>
                            <div className="w-6" />
                          </div>
                          {dayShuttles.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">
                                {dayName === "토요일" ? "토요일은 셔틀이 운휴합니다" : "운행 정보가 없습니다"}
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3 h-[106px] overflow-y-auto scrollbar-hide">
                              {dayShuttles.map((shuttle) => (
                                <div 
                                  key={shuttle.id}
                                  className="bg-secondary rounded-lg p-3 space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-xs text-muted-foreground">출발</p>
                                      <p className="text-2xl font-bold text-foreground">
                                        {shuttle.departure_time.substring(0, 5)}
                                      </p>
                                    </div>
                                    <div className="text-center px-2 flex items-center">
                                      <p className="text-xl text-muted-foreground">→</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-muted-foreground">도착</p>
                                      <p className="text-2xl font-bold text-foreground">
                                        {shuttle.arrival_time?.substring(0, 5) || "-"}
                                      </p>
                                    </div>
                                  </div>
                                   <p className="text-xs text-muted-foreground">
                                     {shuttleDirection === "toStation" ? "학교앞 → 조치원역" : "조치원역 → 학교앞"}
                                   </p>
                                  {shuttle.notes && (
                                    <p className="text-xs text-primary">{shuttle.notes}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
              </Carousel>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
