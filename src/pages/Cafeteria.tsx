import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Cafeteria = () => {
  const TEMP_USER_ID = "00000000-0000-0000-0000-000000000000";
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
      const { data, error } = await supabase
        .from("user_settings")
        .select("menu_alarm_enabled")
        .eq("user_id", TEMP_USER_ID)
        .maybeSingle();

      if (error) throw error;
      if (data) setMenuAlarm(data.menu_alarm_enabled);
    } catch (error) {
      console.error("설정 로드 실패:", error);
    }
  };

  const toggleMenuAlarm = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert({ 
          user_id: TEMP_USER_ID,
          menu_alarm_enabled: enabled 
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setMenuAlarm(enabled);
      toast.success(enabled ? "매일 아침 학식 알림을 받습니다." : "더 이상 알림을 받지 않습니다.");
    } catch (error: any) {
      toast.error(error.message || "설정 변경에 실패했습니다.");
    }
  };

  const breakfastMenu = menus.find(m => m.meal_type === "아침");
  const lunchMenus = menus.filter(m => m.meal_type.startsWith("점심"));
  const dinnerMenu = menus.find(m => m.meal_type === "저녁");

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto px-5 py-4">
          <h1 className="text-xl font-bold text-foreground">학식</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-6 space-y-6">

        <Card className="shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <Label htmlFor="menu-alarm" className="text-sm font-medium">
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

        <Card className="shadow-soft">
          <CardContent className="p-5">
            <Tabs defaultValue="조식" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="조식">조식</TabsTrigger>
                <TabsTrigger value="중식">중식</TabsTrigger>
                <TabsTrigger value="석식">석식</TabsTrigger>
              </TabsList>

              {/* 조식 탭 */}
              <TabsContent value="조식" className="mt-4 space-y-4">
                {breakfastMenu ? (
                  <>
                    <div className="flex justify-end">
                      <span className="text-xl font-extrabold text-accent">
                        {breakfastMenu.price?.toLocaleString()}원
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {breakfastMenu.menu_items.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">•</span>
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    등록된 메뉴가 없어요!
                  </p>
                )}
              </TabsContent>

              {/* 중식 탭 */}
              <TabsContent value="중식" className="mt-4">
                <Tabs defaultValue="한식" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="한식">한식</TabsTrigger>
                    <TabsTrigger value="일품">일품</TabsTrigger>
                    <TabsTrigger value="분식">분식</TabsTrigger>
                  </TabsList>
                  {["한식", "일품", "분식"].map((category) => {
                    const menu = lunchMenus.find(m => m.meal_type === `점심-${category}`);
                    return (
                      <TabsContent key={category} value={category} className="mt-0">
                        {menu ? (
                          <>
                            <div className="flex justify-end mb-3">
                              <span className="text-xl font-extrabold text-accent">
                                {menu.price?.toLocaleString()}원
                              </span>
                            </div>
                            <ul className="space-y-2">
                              {menu.menu_items.map((item: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <span className="text-primary mt-0.5">•</span>
                                  <span className="text-foreground">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            등록된 메뉴가 없어요!
                          </p>
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </TabsContent>

              {/* 석식 탭 */}
              <TabsContent value="석식" className="mt-4 space-y-4">
                {dinnerMenu ? (
                  <>
                    <div className="flex justify-end">
                      <span className="text-xl font-extrabold text-accent">
                        {dinnerMenu.price?.toLocaleString()}원
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {dinnerMenu.menu_items.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">•</span>
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    등록된 메뉴가 없어요!
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Cafeteria;
