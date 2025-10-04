import { Home, Bus, Utensils, Train, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "홈", path: "/" },
    { icon: Bus, label: "셔틀", path: "/shuttle" },
    { icon: Utensils, label: "학식", path: "/cafeteria" },
    { icon: Train, label: "기차", path: "/train" },
    { icon: User, label: "MY", path: "/my" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.08)] z-50">
      <div className="max-w-md mx-auto px-2 py-1">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all min-w-[60px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon 
                  className="w-6 h-6" 
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                <span className={cn("text-[10px] mt-1", isActive ? "font-bold" : "font-medium")}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
