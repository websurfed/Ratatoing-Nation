import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  Coins, 
  ShieldCheck, 
  Save, 
  UserPen, 
  UserX, 
  Loader2,
  Search,
  Shield
} from "lucide-react";
import { USER_RANKS } from "@shared/schema";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [userDeleteId, setUserDeleteId] = useState<number | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [editedUsers, setEditedUsers] = useState<Record<number, { rank?: string; pocketSniffles?: number }>>({});

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!user && user.rank === 'Banson'
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: number; userData: any }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}`, userData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "User information has been updated successfully."
      });
      setEditedUsers({});
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/users/${userId}/ban`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User banned",
        description: "The user has been banned successfully."
      });
      setUserDeleteId(null);
      setShowDeleteAlert(false);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ban failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle user edit
  const handleUserEdit = (userId: number, field: 'rank' | 'pocketSniffles', value: any) => {
    setEditedUsers(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value
      }
    }));
  };

  // Handle save user edits
  const handleSaveUser = (userId: number) => {
    if (!editedUsers[userId]) return;
    
    const userData: any = {};
    
    if (editedUsers[userId].rank) {
      userData.rank = editedUsers[userId].rank;
    }
    
    if (editedUsers[userId].pocketSniffles !== undefined) {
      userData.pocketSniffles = parseInt(editedUsers[userId].pocketSniffles as unknown as string);
      if (isNaN(userData.pocketSniffles) || userData.pocketSniffles < 0) {
        toast({
          title: "Invalid amount",
          description: "Pocket Sniffles amount must be a positive number.",
          variant: "destructive"
        });
        return;
      }
    }
    
    updateUserMutation.mutate({ userId, userData });
  };

  // Handle user ban/delete
  const handleUserDelete = (userId: number) => {
    setUserDeleteId(userId);
    setShowDeleteAlert(true);
  };

  // Confirm user ban
  const confirmUserDelete = () => {
    if (userDeleteId) {
      banUserMutation.mutate(userDeleteId);
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  // Filter users by search query
  const filteredUsers = users.filter((u: any) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(query) ||
      (u.name && u.name.toLowerCase().includes(query)) ||
      u.email.toLowerCase().includes(query)
    );
  });

  // Pattern for cheese background
  const cheesePatternStyle = {
    backgroundImage: "radial-gradient(rgba(255, 199, 44, 0.15) 2px, transparent 2px)",
    backgroundSize: "24px 24px",
  };

  if (!user || user.rank !== 'Banson') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" style={cheesePatternStyle}>
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Shield className="h-16 w-16 text-destructive" />
              <h2 className="text-2xl font-bold">Access Denied</h2>
              <p className="text-muted-foreground">
                Only users with Banson rank can access the admin controls.
              </p>
              <Button className="mt-4" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background transition-colors" style={cheesePatternStyle}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <MobileHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="container mx-auto p-4 md:p-6">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Admin Controls</h2>
            
            {/* Admin Access Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-card/30 backdrop-blur-lg">
                <CardContent className="p-5">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                      <Users className="text-white h-5 w-5" />
                    </div>
                    <h3 className="ml-3 font-semibold text-lg">User Management</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage user accounts, change ranks, and modify permissions.
                  </p>
                  <Button className="w-full">Access</Button>
                </CardContent>
              </Card>
              
              <Card className="bg-card/30 backdrop-blur-lg">
                <CardContent className="p-5">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                      <Coins className="text-white h-5 w-5" />
                    </div>
                    <h3 className="ml-3 font-semibold text-lg">Currency Management</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Control Pocket Sniffles distribution, transactions, and economy.
                  </p>
                  <Button className="w-full">Access</Button>
                </CardContent>
              </Card>
              
              <Card className="bg-card/30 backdrop-blur-lg">
                <CardContent className="p-5">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                      <ShieldCheck className="text-white h-5 w-5" />
                    </div>
                    <h3 className="ml-3 font-semibold text-lg">Content Moderation</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Review and moderate gallery content and shop listings.
                  </p>
                  <Button className="w-full">Access</Button>
                </CardContent>
              </Card>
            </div>
            
            {/* User Management Panel */}
            <Card className="bg-card/30 backdrop-blur-lg overflow-hidden">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <div className="relative">
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-4 py-1 text-sm"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
              
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                    <p className="mt-4 text-muted-foreground">
                      No users found matching your search
                    </p>
                  </div>
                ) : (
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-accent/50">
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Balance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUsers.map((userItem: any) => (
                        <tr key={userItem.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={userItem.profilePicture || ""} alt={userItem.name || userItem.username} />
                                <AvatarFallback className="bg-primary/20 text-primary">
                                  {getInitials(userItem.name || userItem.username)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="ml-4">
                                <div className="text-sm font-medium">{userItem.name || userItem.username}</div>
                                <div className="text-sm text-muted-foreground">{userItem.username}@ratatoing</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Select
                              value={editedUsers[userItem.id]?.rank || userItem.rank}
                              onValueChange={(value) => handleUserEdit(userItem.id, 'rank', value)}
                              disabled={userItem.username === 'banson' || userItem.username === 'banson2'}
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder={userItem.rank} />
                              </SelectTrigger>
                              <SelectContent>
                                {USER_RANKS.map((rank) => (
                                  <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Input
                                type="number"
                                min="0"
                                value={
                                  editedUsers[userItem.id]?.pocketSniffles !== undefined
                                    ? editedUsers[userItem.id]?.pocketSniffles
                                    : userItem.pocketSniffles
                                }
                                onChange={(e) => handleUserEdit(
                                  userItem.id,
                                  'pocketSniffles',
                                  e.target.value
                                )}
                                className="w-[120px] mr-2"
                              />
                              <span className="text-xs text-muted-foreground">PS</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              variant="outline" 
                              className={
                                userItem.status === 'active' 
                                  ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                                  : userItem.status === 'pending'
                                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                    : 'bg-destructive/20 text-destructive'
                              }
                            >
                              {userItem.status === 'active' 
                                ? 'Active' 
                                : userItem.status === 'pending' 
                                  ? 'Pending' 
                                  : 'Banned'
                              }
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-primary"
                                onClick={() => handleSaveUser(userItem.id)}
                                disabled={
                                  !editedUsers[userItem.id] || 
                                  (userItem.username === 'banson' || userItem.username === 'banson2')
                                }
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-amber-500"
                                disabled={userItem.username === 'banson' || userItem.username === 'banson2'}
                              >
                                <UserPen className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() => handleUserDelete(userItem.id)}
                                disabled={
                                  userItem.username === 'banson' || 
                                  userItem.username === 'banson2' ||
                                  userItem.username === user.username
                                }
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
            
            {/* System Logs */}
            <Card className="bg-card/30 backdrop-blur-lg">
              <CardHeader className="border-b">
                <CardTitle>System Logs</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="font-mono text-sm whitespace-pre-wrap bg-card/50 p-4 rounded-md overflow-x-auto">
                  {`[INFO] ${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString()} - User '${user.username}' logged in
[INFO] ${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString()} - New user registration request from 'whiskers@ratatoing'
[INFO] ${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString()} - New user registration request from 'cheeser@ratatoing'
[INFO] ${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString()} - Shop transaction: 'Cheese Plant Seeds' purchased by 'rodent@ratatoing'
[WARNING] ${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString()} - Failed login attempt for user 'whisker@ratatoing'
[INFO] ${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString()} - User rank changed: 'squeakly@ratatoing' from 'Nibbler' to 'Cheese Guard'
[INFO] ${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString()} - New media uploaded to gallery by 'rodent@ratatoing'
[INFO] ${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString()} - System backup completed successfully`}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {/* Delete User Alert Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will ban the user and they will no longer be able to access their account.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmUserDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {banUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Banning...
                </>
              ) : (
                "Ban User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
