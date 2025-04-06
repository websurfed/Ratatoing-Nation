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
  Shield,
  UserCheck,
  Trash2,
  ClipboardList
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
import { Briefcase, UserCog } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { USER_JOBS } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function AdminPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [userActionId, setUserActionId] = useState<number | null>(null);
  const [showBanAlert, setShowBanAlert] = useState(false);
  const [showUnbanAlert, setShowUnbanAlert] = useState(false);
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

  const [showFireAlert, setShowFireAlert] = useState(false);

  // Add these form schemas at the top of the component
  const taskFormSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    assignedJob: z.enum(USER_JOBS),
    dueDate: z.string().optional().transform(str => str ? new Date(str) : undefined)
  });

  const payoutFormSchema = z.object({
    job: z.enum(USER_JOBS),
    amount: z.string().transform(Number).pipe(
      z.number().int().positive("Amount must be positive")
    ),
    description: z.string().optional()
  });

  // Add these inside the component before the return statement
  const taskForm = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedJob: USER_JOBS[0]
    }
  });

  const payoutForm = useForm<z.infer<typeof payoutFormSchema>>({
    resolver: zodResolver(payoutFormSchema),
    defaultValues: {
      job: USER_JOBS[0],
      amount: 100,
      description: ""
    }
  });

  // Mutation handlers
  const createTaskMutation = useMutation({
    mutationFn: async (values: z.infer<typeof taskFormSchema>) => {
      const res = await apiRequest("POST", "/api/tasks", {
        ...values,
        dueDate: values.dueDate?.toISOString() // Convert Date to ISO string
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Task created successfully" });
      taskForm.reset();
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating task",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const createPayoutMutation = useMutation({
    mutationFn: async (values: z.infer<typeof payoutFormSchema>) => {
      const res = await apiRequest("POST", "/api/payouts", values);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Payout processed successfully" });
      payoutForm.reset();
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error processing payout",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Data fetching
  const { data: tasksData } = useQuery({
    queryKey: ['admin-tasks'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/tasks");
      return await res.json();
    }
  });

  const handleCreateTask = (values: z.infer<typeof taskFormSchema>) => {
    console.log("Form submitted with values:", values); // Add this line
    createTaskMutation.mutate(values);
  };

  const handleCreatePayout = (values: z.infer<typeof payoutFormSchema>) => {
    createPayoutMutation.mutate(values);
  };
  
  const fireUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}`, { job: null });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User fired",
        description: "The user has been successfully fired from their job."
      });
      setUserActionId(null);
      setShowFireAlert(false);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to fire user",
        description: error.message,
        variant: "destructive"
      });
    }
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
      setUserActionId(null);
      setShowBanAlert(false);
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

  // Unban user mutation
  const unbanUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/users/${userId}/unban`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User unbanned",
        description: "The user has been unbanned successfully."
      });
      setUserActionId(null);
      setShowUnbanAlert(false);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Unban failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user account has been permanently deleted."
      });
      setUserActionId(null);
      setShowDeleteAlert(false);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
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

  const handleFireUser = (userId: number) => {
    setUserActionId(userId);
    setShowFireAlert(true);
  };

  const confirmFireUser = () => {
    if (userActionId) {
      fireUserMutation.mutate(userActionId);
    }
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
      if (isNaN(userData.pocketSniffles)) {
        toast({
          title: "Invalid amount",
          description: "Pocket Sniffles amount must be a number.",
          variant: "destructive"
        });
        return;
      }
    }

    updateUserMutation.mutate({ userId, userData });
  };

  // Handle user ban
  const handleUserBan = (userId: number) => {
    setUserActionId(userId);
    setShowBanAlert(true);
  };

  // Handle user unban
  const handleUserUnban = (userId: number) => {
    setUserActionId(userId);
    setShowUnbanAlert(true);
  };

  // Handle user delete
  const handleUserDelete = (userId: number) => {
    setUserActionId(userId);
    setShowDeleteAlert(true);
  };

  // Confirm user ban
  const confirmUserBan = () => {
    if (userActionId) {
      banUserMutation.mutate(userActionId);
    }
  };

  // Confirm user unban
  const confirmUserUnban = () => {
    if (userActionId) {
      unbanUserMutation.mutate(userActionId);
    }
  };

  // Confirm user delete
  const confirmUserDelete = () => {
    if (userActionId) {
      deleteUserMutation.mutate(userActionId);
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

  // Check if user is a protected admin account
  const isProtectedAccount = (username: string) => {
    return username === 'banson' || username === 'banson2';
  };

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
                  <Button 
                    className="w-full" 
                    onClick={() => document.querySelector(".user-management-section")?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Access
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-card/30 backdrop-blur-lg">
                <CardContent className="p-5">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                      <Briefcase className="text-white h-5 w-5" />
                    </div>
                    <h3 className="ml-3 font-semibold text-lg">Job Management</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    View and manage user employment status. Fire employees if needed.
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={() => document.querySelector(".job-management-section")?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Access
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-card/30 backdrop-blur-lg">
                <CardContent className="p-5">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                      <ClipboardList className="text-white h-5 w-5" />
                    </div>
                    <h3 className="ml-3 font-semibold text-lg">Task Management</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create and assign tasks to specific job positions
                  </p>
                  <Button 
                    className="w-full" 
                    onClick={() => document.querySelector(".task-management-section")?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Access
                  </Button>
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
                  <Button 
                    className="w-full" 
                    onClick={() => document.querySelector(".currency-management-section")?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Access
                  </Button>
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
                  <Button 
                    className="w-full"
                    onClick={() => document.querySelector(".content-moderation-section")?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Access
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* User Management Panel */}
            <Card className="bg-card/30 backdrop-blur-lg overflow-hidden user-management-section">
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
                                  !editedUsers[userItem.id]
                                }
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-amber-500"
                                onClick={() => {
                                  // Open profile edit dialog or navigate to profile edit page
                                  window.location.href = `/admin/edit-profile/${userItem.id}`;
                                }}
                              >
                                <UserPen className="h-4 w-4" />
                              </Button>
                              {userItem.status === 'banned' ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-green-600"
                                  onClick={() => handleUserUnban(userItem.id)}
                                  disabled={
                                    isProtectedAccount(userItem.username) ||
                                    userItem.username === user.username
                                  }
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive"
                                  onClick={() => handleUserBan(userItem.id)}
                                  disabled={
                                    isProtectedAccount(userItem.username) ||
                                    userItem.username === user.username
                                  }
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() => handleUserDelete(userItem.id)}
                                disabled={
                                  isProtectedAccount(userItem.username) ||
                                  userItem.username === user.username
                                }
                              >
                                <Trash2 className="h-4 w-4" />
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
            <Card className="bg-card/30 backdrop-blur-lg content-moderation-section">
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

            <Card className="bg-card/30 backdrop-blur-lg">
              <CardContent className="p-5">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <ClipboardList className="text-white h-5 w-5" />
                  </div>
                  <h3 className="ml-3 font-semibold text-lg">Task Management</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Create and assign tasks to specific job positions
                </p>
                <Button 
                  className="w-full" 
                  onClick={() => document.querySelector(".task-management-section")?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Access
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/30 backdrop-blur-lg task-management-section">
              <CardHeader className="border-b">
                <CardTitle>Task Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Create New Task</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Form {...taskForm}>
                        <form onSubmit={taskForm.handleSubmit(handleCreateTask)} className="space-y-4" onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}>
                          <FormField
                            control={taskForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Task Title</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={taskForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description*</FormLabel>
                                <FormControl>
                                  <textarea
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                                    placeholder="Detailed description of the task (minimum 10 characters)"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={taskForm.control}
                            name="assignedJob"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Assign To Job</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a job" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {USER_JOBS.map((job) => (
                                      <SelectItem key={job} value={job}>{job}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={taskForm.control}
                            name="dueDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Due Date (optional)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="datetime-local" 
                                    onChange={field.onChange}
                                    value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button 
                            type="submit" 
                            disabled={createTaskMutation.isPending}
                            onClick={() => console.log("Button clicked")} // Add this for debugging
                          >
                            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Salary Payout</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Form {...payoutForm}>
                        <form onSubmit={payoutForm.handleSubmit(handleCreatePayout)} className="space-y-4">
                          <FormField
                            control={payoutForm.control}
                            name="job"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Job Position</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a job" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {USER_JOBS.map((job) => (
                                      <SelectItem key={job} value={job}>{job}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={payoutForm.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Amount per Employee</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} onChange={(e) => {
                                      field.onChange(e.target.value);
                                    }}/>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={payoutForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description (optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Salary payment description"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={createPayoutMutation.isPending}>
                            {createPayoutMutation.isPending ? "Processing..." : "Pay Employees"}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Active Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasksData?.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell>{task.title}</TableCell>
                            <TableCell>{task.assignedJob}</TableCell>
                            <TableCell>
                              <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                                {task.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <Card className="bg-card/30 backdrop-blur-lg job-management-section">
              <CardHeader className="border-b">
                <CardTitle>Job Management</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                    <p className="mt-4 text-muted-foreground">
                      No users found
                    </p>
                  </div>
                ) : (
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-accent/50">
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Job Status</th>
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
                            {userItem.job ? (
                              <Badge variant="secondary" className="bg-green-500/20 text-green-600 dark:text-green-400">
                                {userItem.job}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Unemployed
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              {userItem.job && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive"
                                  onClick={() => handleFireUser(userItem.id)}
                                  disabled={
                                    isProtectedAccount(userItem.username) ||
                                    userItem.username === user.username
                                  }
                                >
                                  <UserCog className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Fire User Alert Dialog */}
      <AlertDialog open={showFireAlert} onOpenChange={setShowFireAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fire User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the user from their current job position. They can apply for jobs again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmFireUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {fireUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Firing...
                </>
              ) : (
                "Fire User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban User Alert Dialog */}
      <AlertDialog open={showBanAlert} onOpenChange={setShowBanAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban User?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will ban the user and they will no longer be able to access their account.
              You can unban them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmUserBan}
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

      {/* Unban User Alert Dialog */}
      <AlertDialog open={showUnbanAlert} onOpenChange={setShowUnbanAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unban User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the user's access to their account. They will be able to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmUserUnban}
              className="bg-green-600 text-white hover:bg-green-600/90"
            >
              {unbanUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unbanning...
                </>
              ) : (
                "Unban User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Alert Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmUserDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}