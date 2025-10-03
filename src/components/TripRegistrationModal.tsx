import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TripRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TripRegistrationModal = ({ open, onOpenChange, onSuccess }: TripRegistrationModalProps) => {
  const TEMP_USER_ID = "00000000-0000-0000-0000-000000000000";
  const [destination, setDestination] = useState<string>("");
  const [arrivalTime, setArrivalTime] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("trips").insert({
        user_id: TEMP_USER_ID,
        destination_station: destination,
        arrival_time: arrivalTime,
      });

      if (error) throw error;

      toast.success("기차 시간이 등록되었습니다!");
      onSuccess();
      onOpenChange(false);
      setDestination("");
      setArrivalTime("");
    } catch (error: any) {
      toast.error(error.message || "등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">기차 시간 등록</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="destination">도착역</Label>
            <Select value={destination} onValueChange={setDestination} required>
              <SelectTrigger id="destination">
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
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "등록중..." : "등록"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TripRegistrationModal;
