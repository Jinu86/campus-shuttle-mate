import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Train, Bell } from "lucide-react";

const My = () => {
  const navigate = useNavigate();
  const TEMP_USER_ID = "00000000-0000-0000-0000-000000000000";
  const [trip, setTrip] = useState<any>(null);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const [tripResult, alarmsResult, settingsResult] = await Promise.all([
        supabase.from("trips").select("*").eq("user_id", TEMP_USER_ID).maybeSingle(),
        supabase.from("alarms").select("*").eq("user_id", TEMP_USER_ID),
        supabase.from("user_settings").select("*").eq("user_id", TEMP_USER_ID).maybeSingle(),
      ]);

      if (tripResult.data) setTrip(tripResult.data);
      if (alarmsResult.data) setAlarms(alarmsResult.data);
      if (settingsResult.data) setSettings(settingsResult.data);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    }
  };

  const deleteTrip = async () => {
    if (!trip) return;

    try {
      const { error } = await supabase.from("trips").delete().eq("id", trip.id);
      if (error) throw error;

      toast.success("기차 시간이 삭제되었습니다.");
      setTrip(null);
    } catch (error: any) {
      toast.error(error.message || "삭제에 실패했습니다.");
    }
  };

  const deleteAlarm = async (alarmId: string) => {
    try {
      const { error } = await supabase.from("alarms").delete().eq("id", alarmId);
      if (error) throw error;

      toast.success("알림이 취소되었습니다.");
      setAlarms(alarms.filter(a => a.id !== alarmId));
    } catch (error: any) {
      toast.error(error.message || "삭제에 실패했습니다.");
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 pb-24">
      <div className="max-w-screen-lg mx-auto p-4 space-y-4">
        <div className="pt-8 pb-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="w-8 h-8 text-primary" />
            MY
          </h1>
          <p className="text-muted-foreground mt-2">내 정보 관리</p>
        </div>


        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Train className="w-5 h-5 text-primary" />
              현재 등록된 기차 시간
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trip ? (
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">도착역</span>
                    <span className="font-bold">{trip.destination_station}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">도착 시간</span>
                    <span className="font-bold">{trip.arrival_time}</span>
                  </div>
                  {trip.route_type && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">경로 유형</span>
                      <span className="font-bold">{trip.route_type}</span>
                    </div>
                  )}
                </div>
                <Button onClick={deleteTrip} variant="destructive" className="w-full">
                  삭제
                </Button>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                등록된 기차 시간이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-accent" />
              알림 설정 관리
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings?.menu_alarm_enabled && (
              <div className="bg-muted/50 rounded-lg p-3 flex justify-between items-center">
                <span>학식 메뉴 알림</span>
                <span className="text-sm text-primary">활성화됨</span>
              </div>
            )}
            
            {alarms.length > 0 ? (
              alarms.map((alarm) => (
                <div key={alarm.id} className="bg-muted/50 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {alarm.alarm_type === "SHUTTLE" ? "셔틀 알림" : "학식 알림"}
                    </p>
                    {alarm.minutes_before && (
                      <p className="text-sm text-muted-foreground">
                        {alarm.minutes_before}분 전
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => deleteAlarm(alarm.id)}
                    variant="outline"
                    size="sm"
                  >
                    취소
                  </Button>
                </div>
              ))
            ) : (
              !settings?.menu_alarm_enabled && (
                <p className="text-center text-muted-foreground py-4">
                  설정된 알림이 없습니다.
                </p>
              )
            )}
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default My;
