import { Bell, Menu } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Pizza } from "lucide-react";

interface MobileHeaderProps {
  toggleSidebar: () => void;
}

export function MobileHeader({ toggleSidebar }: MobileHeaderProps) {
  const { user } = useAuth();
  
  // Get unread emails count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['/api/emails/unread-count'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/emails/inbox');
        if (!response.ok) return 0;
        
        const emails = await response.json();
        return emails.filter((email: any) => !email.read).length;
      } catch (error) {
        return 0;
      }
    },
    enabled: !!user,
  });
  
  if (!user) return null;
  
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between p-4 bg-background/30 backdrop-blur-lg border-b">
      <Button variant="ghost" size="icon" onClick={toggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>
      
      <div className="flex items-center">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Pizza className="text-white text-sm" />
        </div>
        <h1 className="ml-2 font-bold text-lg">Ratatoing</h1>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
