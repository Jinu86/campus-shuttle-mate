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
import { Train as TrainIcon, Clock, MapPin } from "lucide-react";

const Train = () => {
  const navigate = useNavigate();
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
          type: destination === "오송역" ? "기차환승" : "직행",
          totalTime: destination === "오송역" ? 50 : 35,
          shuttleInfo: {
            departureTime: "14:00",
            arrivalTime: destination === "오송역" ? "14:25" : "14:20",
          },
          transferInfo: destination === "오송역" ? {
            type: "KTX",
            departureTime: "14:35",
            duration: 10,
          } : null,
          trainInfo: {
            type: destination === "오송역" ? "KTX" : "ITX",
            departureTime: destination === "오송역" ? "14:45" : "14:30",
          },
        },
      ];

      if (destination === "오송역") {
        mockRoutes.push({
          type: "버스환승",
          totalTime: 55,
          shuttleInfo: {
            departureTime: "13:55",
            arrivalTime: "14:20",
          },
          transferInfo: {
            type: "시내버스",
            departureTime: "14:30",
            duration: 15,
          },
          trainInfo: {
            type: "KTX",
            departureTime: "14:50",
          },
        });
      }

      setRoutes(mockRoutes);
    } catch (error) {
      toast.error("경로 탐색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  };

  const registerRoute = async (route: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다.");
        navigate("/auth");
        return;
      }

      const { error } = await supabase.from("trips").insert({
        user_id: user.id,
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 pb-24">
      <div className="max-w-screen-lg mx-auto p-4 space-y-4">
        <div className="pt-8 pb-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TrainIcon className="w-8 h-8 text-primary" />
            기차 시간
          </h1>
          <p className="text-muted-foreground mt-2">셔틀과 연계된 경로를 찾아보세요</p>
        </div>

        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>경로 탐색</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dest">도착역</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger id="dest">
                  <SelectValue placeholder="도착역을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="조치원역">조치원역</SelectItem>
                  <SelectItem value="오송역">오송역</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">도착 시간</Label>
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
            <h2 className="text-xl font-bold">탐색 결과</h2>
            {routes.map((route, idx) => (
              <Card key={idx} className="shadow-soft hover:shadow-medium transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
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
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="font-semibold text-sm text-primary">셔틀버스</p>
                    <div className="flex justify-between text-sm">
                      <span>출발: {route.shuttleInfo.departureTime}</span>
                      <span>도착: {route.shuttleInfo.arrivalTime}</span>
                    </div>
                  </div>
                  
                  {route.transferInfo && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <p className="font-semibold text-sm text-accent">환승: {route.transferInfo.type}</p>
                      <div className="flex justify-between text-sm">
                        <span>출발: {route.transferInfo.departureTime}</span>
                        <span>소요: {route.transferInfo.duration}분</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="font-semibold text-sm text-foreground">기차: {route.trainInfo.type}</p>
                    <div className="text-sm">
                      <span>출발: {route.trainInfo.departureTime}</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => registerRoute(route)} 
                    className="w-full"
                    variant="outline"
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
