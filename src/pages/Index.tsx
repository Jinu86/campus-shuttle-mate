import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bus, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Index = () => {
  const navigate = useNavigate();
  const [shuttles, setShuttles] = useState<any[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<string>("mugunghwa-3410");
  const [tripType, setTripType] = useState<"board" | "alight">("board");

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto px-5 py-6 space-y-4">
        {/* 학교에서 출발 카드 */}
        <Card className="shadow-soft border-border bg-card">
          <CardContent className="p-5 flex items-center gap-3">
            <Bus className="w-8 h-8 text-primary flex-shrink-0" strokeWidth={2} />
            <div className="flex-1">
              <p className="text-base font-medium text-foreground mb-1">학교에서 출발</p>
              <p className="text-5xl font-black text-foreground">08:00</p>
            </div>
          </CardContent>
        </Card>

        {/* 조치원역에서 출발 카드 */}
        <Card className="shadow-soft border-border bg-card">
          <CardContent className="p-5 flex items-center gap-3">
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
              <Bus className="w-6 h-6 text-primary" strokeWidth={2} />
              <h3 className="text-lg font-bold text-foreground">서울 시간 계산기</h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base text-foreground">기차에</span>
              <Button
                variant={tripType === "board" ? "default" : "outline"}
                size="sm"
                onClick={() => setTripType("board")}
                className="text-sm"
              >
                탑패
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
                <SelectItem value="mugunghwa-3410">무궁화 3410 14:30 조치원 도착</SelectItem>
                <SelectItem value="ktx-101">KTX 101 15:00 조치원 도착</SelectItem>
                <SelectItem value="itx-203">ITX 203 16:30 조치원 도착</SelectItem>
              </SelectContent>
            </Select>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Bus className="w-5 h-5 text-primary" strokeWidth={2} />
                <p className="text-sm font-medium text-foreground">조치원역에서 출발</p>
              </div>
              <p className="text-3xl font-black text-foreground">08:10 <span className="text-lg text-muted-foreground">(40분대기)</span></p>
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
