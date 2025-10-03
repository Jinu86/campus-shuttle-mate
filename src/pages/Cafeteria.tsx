import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Utensils } from "lucide-react";

const Cafeteria = () => {
  const [menus, setMenus] = useState<any[]>([]);
  const [menuAlarm, setMenuAlarm] = useState(false);

  useEffect(() => {
    loadMenus();
    loadSettings();
  }, []);

  const loadMenus = async () => {
    try {
      const { data, error } = await supabase
        .from("cafeteria_menus")
        .select("*")
        .eq("date", new Date().toISOString().split('T')[0])
        .order("meal_type");

      if (error) throw error;
      setMenus(data || []);
    } catch (error) {
      toast.error("학식 정보를 불러올 수 없습니다.");
    }
  };

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("menu_alarm_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) setMenuAlarm(data.menu_alarm_enabled);
    } catch (error) {
      console.error("설정 로드 실패:", error);
    }
  };

  const toggleMenuAlarm = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      const { error } = await supabase
        .from("user_settings")
        .update({ menu_alarm_enabled: enabled })
        .eq("user_id", user.id);

      if (error) throw error;

      setMenuAlarm(enabled);
      toast.success(enabled ? "매일 아침 학식 알림을 받습니다." : "더 이상 알림을 받지 않습니다.");
    } catch (error: any) {
      toast.error(error.message || "설정 변경에 실패했습니다.");
    }
  };

  const mealTypeOrder = { "아침": 1, "점심": 2, "저녁": 3 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 pb-24">
      <div className="max-w-screen-lg mx-auto p-4 space-y-4">
        <div className="pt-8 pb-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Utensils className="w-8 h-8 text-accent" />
            학식
          </h1>
          <p className="text-muted-foreground mt-2">오늘의 학식 메뉴</p>
        </div>

        <Card className="shadow-medium">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="menu-alarm" className="text-base">
                ☀️ 매일 아침 메뉴 알림 받기
              </Label>
              <Switch
                id="menu-alarm"
                checked={menuAlarm}
                onCheckedChange={toggleMenuAlarm}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {menus
            .sort((a, b) => mealTypeOrder[a.meal_type as keyof typeof mealTypeOrder] - mealTypeOrder[b.meal_type as keyof typeof mealTypeOrder])
            .map((menu) => (
            <Card key={menu.id} className="shadow-soft hover:shadow-medium transition-all">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{menu.meal_type}</span>
                  <span className="text-lg text-primary font-bold">
                    {menu.price?.toLocaleString()}원
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {menu.menu_items.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Cafeteria;
