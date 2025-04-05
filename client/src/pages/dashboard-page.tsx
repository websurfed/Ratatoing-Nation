import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { 
  User, 
  UserCheck, 
  Image as ImageIcon, 
  ShoppingBag, 
  Shield, 
  Crown, 
  Star, 
  Pizza, 
  UserPlus, 
  ShoppingCart, 
  AlertCircle, 
  Wallet 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  
  // Get pending users for admin
  const { data: pendingUsers = [] } = useQuery({
    queryKey: ['/api/users/pending'],
    queryFn: async () => {
      const response = await fetch('/api/users/pending');
      if (!response.ok) throw new Error('Failed to fetch pending users');
      return response.json();
    },
    enabled: user?.rank === 'Banson',
  });
  
  // Get recent gallery uploads
  const { data: recentGallery = [] } = useQuery({
    queryKey: ['/api/gallery'],
    queryFn: async () => {
      const response = await fetch('/api/gallery');
      if (!response.ok) throw new Error('Failed to fetch gallery');
      return response.json();
    },
  });

  // Get recent shop items
  const { data: shopItems = [] } = useQuery({
    queryKey: ['/api/shop'],
    queryFn: async () => {
      const response = await fetch('/api/shop');
      if (!response.ok) throw new Error('Failed to fetch shop items');
      return response.json();
    },
  });

  // Get user data
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      if (user?.rank !== 'Banson') return [];
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: user?.rank === 'Banson',
  });
  
  // Get recent transactions (only for Banson rank admin users)
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      if (user?.rank !== 'Banson') return [];
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    enabled: user?.rank === 'Banson',
  });
  
  // Get recently approved members (new active users)
  const { data: recentApprovals = [] } = useQuery({
    queryKey: ['/api/users/recent-approvals'],
    queryFn: async () => {
      if (user?.rank !== 'Banson') return [];
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const users = await response.json();
      // Filter for only recently approved users (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return users.filter((u: any) => 
        u.status === 'active' && 
        u.approvedBy !== null && 
        new Date(u.createdAt) > oneWeekAgo
      );
    },
    enabled: user?.rank === 'Banson',
  });
  
  // Get recently added media (last 10 items)
  const { data: recentMedia = [] } = useQuery({
    queryKey: ['/api/gallery/recent'],
    queryFn: async () => {
      const response = await fetch('/api/gallery');
      if (!response.ok) throw new Error('Failed to fetch gallery');
      const media = await response.json();
      return media.slice(0, 10).sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
  });

  // Combine and format activities
  const recentActivities = [
    ...pendingUsers.map(user => ({
      id: `pending-${user.id}`,
      type: 'user_join',
      user: { name: user.name || user.username, username: user.username },
      createdAt: user.createdAt,
      message: 'requested to join Ratatoing Nation'
    })),
    ...recentGallery.slice(0, 5).map(item => ({
      id: `gallery-${item.id}`,
      type: 'gallery_upload',
      user: { name: 'Gallery Upload', username: '' },
      createdAt: item.createdAt || new Date().toISOString(),
      message: `uploaded "${item.title || 'an image'}" to the gallery`
    })),
    ...shopItems.filter(item => item.status === 'sold').slice(0, 5).map(item => ({
      id: `shop-${item.id}`,
      type: 'shop_purchase',
      user: { name: 'Shop Purchase', username: '' },
      createdAt: item.updatedAt || new Date().toISOString(),
      message: `purchased "${item.title}" from the shop`
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  
  // Format time elapsed
  const formatTimeElapsed = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  };
  
  // Get real stats from the data
  const stats = {
    pendingApprovals: pendingUsers.length,
    galleryActivity: recentGallery.length,
    shopListings: shopItems.filter(item => item.status === 'available').length,
  };
  
  // Pattern for cheese background
  const cheesePatternStyle = {
    backgroundImage: "radial-gradient(rgba(255, 199, 44, 0.15) 2px, transparent 2px)",
    backgroundSize: "24px 24px",
  };
  
  if (!user) return null;
  
  return (
    <div className="min-h-screen bg-background transition-colors" style={cheesePatternStyle}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <MobileHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="container mx-auto p-4 md:p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Dashboard</h2>
              <div className="flex items-center space-x-2">
                <span className="hidden md:flex items-center">
                  <Pizza className="text-primary mr-2 h-4 w-4" />
                  <span className="font-medium">{user.pocketSniffles.toLocaleString()}</span>
                  <span className="ml-1 text-sm text-muted-foreground">Pocket Sniffles</span>
                </span>
                <Button size="icon" variant="ghost">
                  <AlertCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card/30 backdrop-blur-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Account Status</h3>
                    <Badge variant="outline" className="bg-green-500/20 text-green-600 dark:text-green-400">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center">
                    <Shield className="h-8 w-8 text-primary mr-3" />
                    <div>
                      <p className="font-semibold">{user.rank}</p>
                      <p className="text-xs text-muted-foreground">{user.username}@ratatoing</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {user.rank === 'Banson' && (
                <Card className="bg-card/30 backdrop-blur-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Pending Approvals</h3>
                      <UserCheck className="text-primary h-4 w-4" />
                    </div>
                    <p className="text-2xl font-semibold">{stats.pendingApprovals}</p>
                    <p className="text-xs text-muted-foreground">New members awaiting approval</p>
                  </CardContent>
                </Card>
              )}
              
              <Card className="bg-card/30 backdrop-blur-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Gallery Activity</h3>
                    <ImageIcon className="text-primary h-4 w-4" />
                  </div>
                  <p className="text-2xl font-semibold">{stats.galleryActivity}</p>
                  <p className="text-xs text-muted-foreground">New media uploads today</p>
                </CardContent>
              </Card>
              
              <Card className="bg-card/30 backdrop-blur-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Shop Listings</h3>
                    <ShoppingBag className="text-primary h-4 w-4" />
                  </div>
                  <p className="text-2xl font-semibold">{stats.shopListings}</p>
                  <p className="text-xs text-muted-foreground">Active items for sale</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activities */}
            <Card className="bg-card/30 backdrop-blur-lg">
              <CardHeader className="border-b">
                <CardTitle>Recent Activities</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-4">
                  {recentActivities.map((activity) => (
                    <li key={activity.id} className="flex items-start">
                      <span className="flex-shrink-0 h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                        {activity.type === 'user_join' && <UserPlus className="text-primary h-4 w-4" />}
                        {activity.type === 'shop_purchase' && <ShoppingCart className="text-green-500 h-4 w-4" />}
                        {activity.type === 'gallery_upload' && <ImageIcon className="text-amber-500 h-4 w-4" />}
                      </span>
                      <div className="ml-3">
                        <p className="text-sm">
                          <span className="font-medium">{activity.user.name}</span> {activity.message}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatTimeElapsed(activity.createdAt)}</p>
                      </div>
                      {activity.type === 'user_join' && user.rank === 'Banson' && (
                        <div className="ml-auto flex space-x-2">
                          <Link href="/approvals">
                            <Button size="sm" variant="default" className="text-xs">Approve</Button>
                          </Link>
                          <Button size="sm" variant="outline" className="text-xs">Decline</Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Recent Transactions - Admin Only */}
            {user.rank === 'Banson' && (
              <Card className="bg-card/30 backdrop-blur-lg">
                <CardHeader className="border-b">
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {recentTransactions.length > 0 ? (
                      recentTransactions.slice(0, 5).map((transaction) => {
                        const sender = allUsers.find(u => u.id === transaction.senderId);
                        const recipient = allUsers.find(u => u.id === transaction.recipientId);
                        return (
                          <li key={transaction.id} className="flex items-center gap-4 p-4">
                            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                              <Wallet className="text-white h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {sender?.username || "System"} sent {transaction.amount} PS to {recipient?.username || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {transaction.description || "No description"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </li>
                        );
                      })
                    ) : (
                      <li className="flex items-center gap-4 p-4">
                        <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center">
                          <AlertCircle className="text-white h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">No recent transactions</p>
                          <p className="text-xs text-muted-foreground">All monetary transfers will appear here</p>
                        </div>
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Hierarchy Overview */}
            <Card className="bg-card/30 backdrop-blur-lg">
              <CardHeader className="border-b">
                <CardTitle>Ratatoing Nation Hierarchy</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/10">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <Crown className="text-white h-5 w-5" />
                      </div>
                      <h4 className="ml-3 font-medium">Banson</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Supreme leaders with full administrative access.</p>
                    <p className="mt-2 text-xs">
                      <span className="font-medium">Members:</span> {allUsers.filter(u => u.rank === 'Banson').length || 2}
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Star className="text-white h-5 w-5" />
                      </div>
                      <h4 className="ml-3 font-medium">Elite Nibbler</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Senior officials with special privileges.</p>
                    <p className="mt-2 text-xs">
                      <span className="font-medium">Members:</span> {allUsers.filter(u => u.rank === 'Elite Nibbler').length || 0}
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                        <Pizza className="text-white h-5 w-5" />
                      </div>
                      <h4 className="ml-3 font-medium">Cheese Guard</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Moderators who oversee content and members.</p>
                    <p className="mt-2 text-xs">
                      <span className="font-medium">Members:</span> {allUsers.filter(u => u.rank === 'Cheese Guard').length || 0}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 mt-4">
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center">
                        <User className="text-white h-5 w-5" />
                      </div>
                      <h4 className="ml-3 font-medium">Nibbler</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Regular citizens of Ratatoing Nation.</p>
                    <p className="mt-2 text-xs">
                      <span className="font-medium">Members:</span> {allUsers.filter(u => u.rank === 'Nibbler' && u.status === 'active').length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
