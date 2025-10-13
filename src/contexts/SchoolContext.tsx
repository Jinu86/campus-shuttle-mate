import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface School {
  id: string;
  name: string;
  display_name: string;
  station_name: string;
  is_active: boolean;
  created_at: string;
}

interface SchoolContextType {
  selectedSchool: School | null;
  schools: School[];
  selectSchool: (schoolId: string) => void;
  isSchoolSelected: boolean;
  loading: boolean;
  refreshSchools: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider = ({ children }: { children: ReactNode }) => {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSchools = async () => {
    const { data, error } = await supabase
      .from("schools" as any)
      .select("*")
      .eq("is_active", true)
      .order("display_name");

    if (error) {
      console.error("Failed to load schools:", error);
      return;
    }

    setSchools((data as unknown as School[]) || []);
    return (data as unknown as School[]) || [];
  };

  const selectSchool = (schoolId: string) => {
    const school = schools.find((s) => s.id === schoolId);
    if (school) {
      setSelectedSchool(school);
      localStorage.setItem("selected_school_id", schoolId);
    }
  };

  const refreshSchools = async () => {
    await loadSchools();
  };

  useEffect(() => {
    const initializeSchool = async () => {
      setLoading(true);
      const schoolList = await loadSchools();
      
      // Try to load from localStorage
      const savedSchoolId = localStorage.getItem("selected_school_id");
      
      if (savedSchoolId && schoolList) {
        const school = schoolList.find((s) => s.id === savedSchoolId);
        if (school) {
          setSelectedSchool(school);
        }
      }
      
      setLoading(false);
    };

    initializeSchool();
  }, []);

  return (
    <SchoolContext.Provider
      value={{
        selectedSchool,
        schools,
        selectSchool,
        isSchoolSelected: !!selectedSchool,
        loading,
        refreshSchools,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchoolContext = () => {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error("useSchoolContext must be used within a SchoolProvider");
  }
  return context;
};
