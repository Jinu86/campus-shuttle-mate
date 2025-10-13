import { useState } from "react";
import { useSchoolContext } from "@/contexts/SchoolContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Plus } from "lucide-react";
import SchoolRequestForm from "./SchoolRequestForm";

interface SchoolSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SchoolSelector({ open, onOpenChange }: SchoolSelectorProps) {
  const { schools, selectSchool } = useSchoolContext();
  const [showRequestForm, setShowRequestForm] = useState(false);

  const handleSchoolSelect = (schoolId: string) => {
    selectSchool(schoolId);
    onOpenChange(false);
  };

  const handleRequestNewSchool = () => {
    setShowRequestForm(true);
  };

  const handleCloseRequestForm = () => {
    setShowRequestForm(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          {!showRequestForm ? (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">이용하실 대학을 선택해주세요</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  선택한 대학의 셔틀 및 학식 정보를 확인할 수 있습니다
                </p>
              </div>

              <div className="space-y-3">
                {schools.map((school) => (
                  <Button
                    key={school.id}
                    variant="outline"
                    className="w-full h-auto py-4 px-6 flex flex-col items-start gap-2"
                    onClick={() => handleSchoolSelect(school.id)}
                  >
                    <span className="text-lg font-semibold">{school.display_name}</span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {school.station_name}
                    </span>
                  </Button>
                ))}

                <Button
                  variant="ghost"
                  className="w-full h-auto py-4 px-6 border-2 border-dashed flex items-center justify-center gap-2"
                  onClick={handleRequestNewSchool}
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-semibold">우리 대학이 없어요</span>
                </Button>
              </div>
            </div>
          ) : (
            <SchoolRequestForm onClose={handleCloseRequestForm} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
