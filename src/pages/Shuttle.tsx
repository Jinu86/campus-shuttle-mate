import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Shuttle = () => {
  const TEMP_USER_ID = "00000000-0000-0000-0000-000000000000";
  const [schoolShuttles, setSchoolShuttles] = useState<any[]>([]);
  const [stationShuttles, setStationShuttles] = useState<any[]>([]);
  const [selectedShuttle, setSelectedShuttle] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [minutesBefore, setMinutesBefore] = useState<string>("10");
  const [currentDayType, setCurrentDayType] = useState<string>("");

  const getCurrentDayType = () => {
    const day = new Date().getDay();
    if (day === 5) return "금요일";
    if (day === 0) return "일요일";
    if (day >= 1 && day <= 4) return "월~목";
    return "";
  };

  const filterPastShuttles = (shuttles: any[]) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    return shuttles.filter((shuttle) => {
      const [hours, minutes] = shuttle.departure_time.split(":").map(Number);
      const shuttleTime = hours * 60 + minutes;
      return shuttleTime > currentTime;
    });
  };

  useEffect(() => {
    const dayType = getCurrentDayType();
    setCurrentDayType(dayType);
    if (dayType) {
      loadShuttles(dayType);
    }
  }, []);

  const loadShuttles = async (dayType: string) => {
    try {
      const { data, error } = await supabase
        .from("shuttle_schedules")
        .select("*")
        .eq("day_type", dayType)
        .order("departure_time");

      if (error) throw error;

      const filteredData = filterPastShuttles(data || []);
      
      const schoolDepartures = filteredData.filter(s => s.destination === "조치원역");
      const stationDepartures = filteredData.filter(s => s.destination === "학교앞");
      
      setSchoolShuttles(schoolDepartures);
      setStationShuttles(stationDepartures);
    } catch (error) {
      toast.error("셔틀 정보를 불러올 수 없습니다.");
    }
  };

  const openAlarmModal = (shuttle: any) => {
    setSelectedShuttle(shuttle);
    setModalOpen(true);
  };

  const setAlarm = async () => {
    try {
      const { error } = await supabase.from("alarms").insert({
        user_id: TEMP_USER_ID,
        alarm_type: "SHUTTLE",
        target_id: selectedShuttle.id,
        minutes_before: parseInt(minutesBefore),
      });

      if (error) throw error;

      toast.success("알림이 설정되었습니다.");
      setModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "알림 설정에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto px-5 py-4">
          <h1 className="text-xl font-bold text-foreground">셔틀</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-6">
        {!currentDayType || currentDayType === "" ? (
          <Card className="shadow-soft">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">토요일은 셔틀이 운휴합니다.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="school" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="school">학교 출발</TabsTrigger>
              <TabsTrigger value="station">조치원역 출발</TabsTrigger>
            </TabsList>
            
            <TabsContent value="school" className="space-y-4 mt-4">
              {schoolShuttles.length === 0 ? (
                <Card className="shadow-soft">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">남은 셔틀이 없습니다.</p>
                  </CardContent>
                </Card>
              ) : (
                schoolShuttles.map((shuttle) => (
                  <Card key={shuttle.id} className="shadow-soft hover:shadow-medium transition-smooth">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-3xl font-extrabold text-foreground">{shuttle.departure_time}</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {shuttle.destination} • {shuttle.duration_minutes}분 소요
                          </p>
                          {shuttle.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{shuttle.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAlarmModal(shuttle)}
                          className="flex items-center gap-1.5 ml-3"
                        >
                          <Bell className="w-4 h-4" />
                          알림
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="station" className="space-y-4 mt-4">
              {stationShuttles.length === 0 ? (
                <Card className="shadow-soft">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">남은 셔틀이 없습니다.</p>
                  </CardContent>
                </Card>
              ) : (
                stationShuttles.map((shuttle) => (
                  <Card key={shuttle.id} className="shadow-soft hover:shadow-medium transition-smooth">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-3xl font-extrabold text-foreground">{shuttle.departure_time}</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {shuttle.destination} • {shuttle.duration_minutes}분 소요
                          </p>
                          {shuttle.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{shuttle.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAlarmModal(shuttle)}
                          className="flex items-center gap-1.5 ml-3"
                        >
                          <Bell className="w-4 h-4" />
                          알림
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>알림 설정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              {selectedShuttle?.departure_time} 셔틀 출발 전에 알림을 받으시겠습니까?
            </p>
            <div className="space-y-2">
              <Select value={minutesBefore} onValueChange={setMinutesBefore}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10분 전</SelectItem>
                  <SelectItem value="20">20분 전</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={setAlarm} className="w-full">
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Shuttle;
