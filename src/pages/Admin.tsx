import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, LogOut, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ShuttleSchedule {
  id: string;
  day_type: string;
  departure_time: string;
  arrival_time: string | null;
  notes: string | null;
  created_at?: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin, signOut } = useAuth();
  const [isSemesterActive, setIsSemesterActive] = useState(true);
  const [schedules, setSchedules] = useState<ShuttleSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New schedule form state
  const [newSchedule, setNewSchedule] = useState({
    day_type: "월~목",
    departure_time: "",
    arrival_time: "",
    notes: "",
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        toast.error("관리자 권한이 필요합니다");
        navigate("/");
      } else {
        loadData();
      }
    }
  }, [user, authLoading, isAdmin, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);

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

      // Load shuttle schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("shuttle_schedules")
        .select("id, day_type, departure_time, arrival_time, notes, created_at")
        .order("day_type", { ascending: true })
        .order("departure_time", { ascending: true });

      if (schedulesError) throw schedulesError;
      setSchedules((schedulesData as unknown as ShuttleSchedule[]) || []);
    } catch (error: any) {
      toast.error(error.message || "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleSemesterToggle = async (checked: boolean) => {
    try {
      setSubmitting(true);
      
      const { data: existingData } = await supabase
        .from("semester_status")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existingData) {
        const { error } = await supabase
          .from("semester_status")
          .update({
            is_semester_active: checked,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .eq("id", existingData.id);

        if (error) throw error;
      }

      setIsSemesterActive(checked);
      toast.success(checked ? "학기 중으로 변경되었습니다" : "방학으로 변경되었습니다");
    } catch (error: any) {
      toast.error(error.message || "변경 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSchedule.departure_time || !newSchedule.arrival_time) {
      toast.error("출발 시간과 도착 시간을 입력해주세요");
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from("shuttle_schedules").insert([{
        day_type: newSchedule.day_type,
        departure_time: newSchedule.departure_time,
        arrival_time: newSchedule.arrival_time,
        notes: newSchedule.notes || null,
      }] as any);

      if (error) throw error;

      toast.success("셔틀 시간이 추가되었습니다");
      setNewSchedule({
        day_type: "월~목",
        departure_time: "",
        arrival_time: "",
        notes: "",
      });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "추가 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from("shuttle_schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("삭제되었습니다");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "삭제 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">관리자 페이지</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            로그아웃
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Semester Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>학기 상태 관리</CardTitle>
              <CardDescription>
                방학 중에는 셔틀이 운행하지 않습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Switch
                  id="semester-status"
                  checked={isSemesterActive}
                  onCheckedChange={handleSemesterToggle}
                  disabled={submitting}
                />
                <Label htmlFor="semester-status" className="text-lg">
                  {isSemesterActive ? "학기 중" : "방학"}
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Add Schedule Card */}
          <Card>
            <CardHeader>
              <CardTitle>셔틀 시간 추가</CardTitle>
              <CardDescription>
                새로운 셔틀 시간표를 추가합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSchedule} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="day-type">요일</Label>
                    <Select
                      value={newSchedule.day_type}
                      onValueChange={(value) =>
                        setNewSchedule({ ...newSchedule, day_type: value })
                      }
                    >
                      <SelectTrigger id="day-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="월~목">월~목</SelectItem>
                        <SelectItem value="금요일">금요일</SelectItem>
                        <SelectItem value="일요일">일요일</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departure">출발 시간</Label>
                    <Input
                      id="departure"
                      type="time"
                      value={newSchedule.departure_time}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          departure_time: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arrival">도착 시간</Label>
                    <Input
                      id="arrival"
                      type="time"
                      value={newSchedule.arrival_time}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          arrival_time: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">메모 (선택)</Label>
                    <Input
                      id="notes"
                      placeholder="예: 오송역 경유"
                      value={newSchedule.notes}
                      onChange={(e) =>
                        setNewSchedule({ ...newSchedule, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button type="submit" disabled={submitting}>
                  <Plus className="h-4 w-4 mr-2" />
                  추가
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Schedules List Card */}
          <Card>
            <CardHeader>
              <CardTitle>셔틀 시간표 관리</CardTitle>
              <CardDescription>
                현재 등록된 셔틀 시간표 ({schedules.length}개)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>요일</TableHead>
                      <TableHead>출발 시간</TableHead>
                      <TableHead>도착 시간</TableHead>
                      <TableHead>메모</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          등록된 시간표가 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      schedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">
                            {schedule.day_type}
                          </TableCell>
                          <TableCell>{schedule.departure_time}</TableCell>
                          <TableCell>{schedule.arrival_time}</TableCell>
                          <TableCell>{schedule.notes || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              disabled={submitting}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
