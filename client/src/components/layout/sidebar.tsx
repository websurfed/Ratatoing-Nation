import { Link, useLocation } from "wouter";
import { ThemeToggle } from "../ui/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { 
  Home, 
  UserCheck, 
  Mail, 
  Image, 
  ShoppingCart, 
  PiggyBank, 
  Shield, 
  LogOut,
  Pizza
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { USER_RANKS } from "@shared/schema";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  if (!user) return null;
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const isAdmin = user.rank === 'Banson';
  
  // Get initial letters for avatar fallback
  const getInitials = (name: string) => {
    return name.split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };
  
  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      <div className="h-full flex flex-col bg-background/30 backdrop-blur-lg border-r border-border">
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Pizza className="text-white" />
            </div>
            <h1 className="ml-3 font-bold text-xl">Ratatoing</h1>
          </div>
          <button 
            onClick={() => setOpen(false)} 
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b">
          <div className="flex items-center">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.profilePicture || ""} alt={user.name || user.username} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {getInitials(user.name || user.username)}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="font-medium">{user.name || user.username}</p>
              <Badge variant="outline" className="bg-primary/20 text-primary mt-1 text-xs">
                {user.rank}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 flex-1 overflow-auto">
          <ul className="space-y-1">
            <li>
              <Link href="/">
                <a className={`flex items-center px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  location === "/" 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}>
                  <Home className="w-5 h-5" />
                  <span className="ml-3">Dashboard</span>
                </a>
              </Link>
            </li>
            
            {isAdmin && (
              <li>
                <Link href="/approvals">
                  <a className={`flex items-center px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                    location === "/approvals" 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}>
                    <UserCheck className="w-5 h-5" />
                    <span className="ml-3">Approvals</span>
                  </a>
                </Link>
              </li>
            )}
            
            <li>
              <Link href="/email">
                <a className={`flex items-center px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  location === "/email" 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}>
                  <Mail className="w-5 h-5" />
                  <span className="ml-3">Email</span>
                </a>
              </Link>
            </li>
            
            <li>
              <Link href="/gallery">
                <a className={`flex items-center px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  location === "/gallery" 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}>
                  <Image className="w-5 h-5" />
                  <span className="ml-3">Gallery</span>
                </a>
              </Link>
            </li>
            
            <li>
              <Link href="/shop">
                <a className={`flex items-center px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  location === "/shop" 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}>
                  <ShoppingCart className="w-5 h-5" />
                  <span className="ml-3">Shop</span>
                </a>
              </Link>
            </li>
            
            <li>
              <Link href="/bank">
                <a className={`flex items-center px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                  location === "/bank" 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}>
                  <PiggyBank className="w-5 h-5" />
                  <span className="ml-3">Bank</span>
                </a>
              </Link>
            </li>
            
            {isAdmin && (
              <li className="pt-4">
                <Link href="/admin">
                  <a className={`flex items-center px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                    location === "/admin" 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}>
                    <Shield className="w-5 h-5" />
                    <span className="ml-3">Admin</span>
                  </a>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Bottom Controls */}
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
