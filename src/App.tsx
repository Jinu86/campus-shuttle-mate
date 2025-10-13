import React, { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SchoolProvider, useSchoolContext } from "@/contexts/SchoolContext";
import SchoolSelector from "@/components/SchoolSelector";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Train from "./pages/Train";
import Shuttle from "./pages/Shuttle";
import Cafeteria from "./pages/Cafeteria";
import My from "./pages/My";
import Coupons from "./pages/Coupons";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isSchoolSelected, loading } = useSchoolContext();
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    if (!loading && !isSchoolSelected) {
      setShowSelector(true);
    }
  }, [loading, isSchoolSelected]);

  return (
    <>
      <Toaster />
      <Sonner />
      <SchoolSelector open={showSelector} onOpenChange={setShowSelector} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/train" element={<Train />} />
          <Route path="/shuttle" element={<Shuttle />} />
          <Route path="/cafeteria" element={<Cafeteria />} />
          <Route path="/my" element={<My />} />
          <Route path="/coupons" element={<Coupons />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SchoolProvider>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </SchoolProvider>
  </QueryClientProvider>
);

export default App;
