import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bus, Bell } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Shuttle = () => {
  const TEMP_USER_ID = "00000000-0000-0000-0000-000000000000";
  const [shuttles, setShuttles] = useState<any[]>([]);
  const [selectedShuttle, setSelectedShuttle] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [minutesBefore, setMinutesBefore] = useState<string>("10");

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
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto p-6 space-y-6">
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bus className="w-6 h-6 text-primary" />
            셔틀버스
          </h1>
          <p className="text-sm text-muted-foreground mt-1">오늘의 셔틀 시간표</p>
        </div>

        <div className="space-y-4">
          {shuttles.map((shuttle) => (
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
          ))}
        </div>
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
