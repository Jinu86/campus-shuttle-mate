import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, MapPin } from "lucide-react";

const Train = () => {
  const navigate = useNavigate();
  const TEMP_USER_ID = "00000000-0000-0000-0000-000000000000";
  const [destination, setDestination] = useState<string>("");
  const [arrivalTime, setArrivalTime] = useState<string>("");
  const [routes, setRoutes] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const searchRoutes = async () => {
    if (!destination || !arrivalTime) {
      toast.error("도착역과 도착 시간을 모두 입력해주세요.");
      return;
    }

    setSearching(true);
    try {
      const mockRoutes = [
        {
          type: "직행",
          totalTime: 35,
          shuttleInfo: {
            departureTime: "14:00",
            arrivalTime: "14:20",
          },
          transferInfo: null,
          trainInfo: {
            type: "ITX",
            departureTime: "14:30",
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
    try {
      const { error } = await supabase.from("trips").insert({
        user_id: TEMP_USER_ID,
        destination_station: destination,
        arrival_time: arrivalTime,
        route_type: route.type,
      });

      if (error) throw error;

      toast.success("기차 시간이 등록되었습니다! 홈 화면에서 확인하세요.");
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
            <CardTitle className="text-lg font-bold text-foreground">경로 탐색</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dest" className="text-sm font-medium">도착역</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger id="dest">
                  <SelectValue placeholder="도착역을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="조치원역">조치원역</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm font-medium">도착 시간</Label>
              <Input
                id="time"
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
              />
            </div>
            <Button onClick={searchRoutes} className="w-full" disabled={searching}>
              {searching ? "검색중..." : "경로 탐색"}
            </Button>
          </CardContent>
        </Card>

        {routes.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">탐색 결과</h2>
            {routes.map((route, idx) => (
              <Card key={idx} className="shadow-soft hover:shadow-medium transition-smooth">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2 text-foreground">
                      <MapPin className="w-5 h-5 text-primary" />
                      {route.type}
                    </span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      총 {route.totalTime}분
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-secondary rounded-lg p-3 space-y-1.5">
                    <p className="font-semibold text-sm text-primary">셔틀버스</p>
                    <div className="flex justify-between text-sm text-foreground">
                      <span>출발: {route.shuttleInfo.departureTime}</span>
                      <span>도착: {route.shuttleInfo.arrivalTime}</span>
                    </div>
                  </div>
                  
                  {route.transferInfo && (
                    <div className="bg-secondary rounded-lg p-3 space-y-1.5">
                      <p className="font-semibold text-sm text-primary">환승: {route.transferInfo.type}</p>
                      <div className="flex justify-between text-sm text-foreground">
                        <span>출발: {route.transferInfo.departureTime}</span>
                        <span>소요: {route.transferInfo.duration}분</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-secondary rounded-lg p-3 space-y-1.5">
                    <p className="font-semibold text-sm text-foreground">기차: {route.trainInfo.type}</p>
                    <div className="text-sm text-foreground">
                      <span>출발: {route.trainInfo.departureTime}</span>
                    </div>
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
