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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ApprovalsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"users" | "jobs">("users");

  // Fetch pending users
  const { data: pendingUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['/api/users/pending'],
    queryFn: async () => {
      const response = await fetch('/api/users/pending');
      if (!response.ok) throw new Error('Failed to fetch pending users');
      return response.json();
    },
    enabled: user?.rank === 'Banson',
  });

  // Fetch pending job applications
  const { data: pendingJobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['/api/jobs/pending'],
    queryFn: async () => {
      const response = await fetch('/api/jobs/pending');
      if (!response.ok) throw new Error('Failed to fetch pending jobs');
      return response.json();
    },
    enabled: user?.rank === 'Banson',
  });

  // Fetch recently approved users
  const { data: recentlyApproved = [], isLoading: loadingApproved } = useQuery({
    queryKey: ['/api/users/recently-approved'],
    queryFn: async () => {
      return [
        {
          id: 101,
          username: "rodent",
          name: "Mike Rodent",
          profilePicture: null,
          rank: "Nibbler",
          approvedAt: "2023-04-22T10:30:00Z"
        },
        {
          id: 102,
          username: "whisker",
          name: "David Whiskerington",
          profilePicture: null,
          rank: "Nibbler",
          approvedAt: "2023-04-20T14:45:00Z"
        }
      ];
    },
    enabled: user?.rank === 'Banson',
  });

  // Approve user mutation
  const approveUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/users/${userId}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/pending'] });
      toast({
        title: "User approved",
        description: "The user has been successfully approved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Decline/ban user mutation
  const declineUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/users/${userId}/ban`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/pending'] });
      toast({
        title: "User declined",
        description: "The user has been declined and banned.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Decline failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Approve job mutation
  const approveJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/pending'] });
      toast({
        title: "Job approved",
        description: "The job application has been approved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject job mutation
  const rejectJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/reject`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/pending'] });
      toast({
        title: "Job rejected",
        description: "The job application has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get initials for avatar
  const getInitials = (name?: string | null) => {
    if (!name) return "??";
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMMM dd, yyyy');
  };

  // Pattern for cheese background
  const cheesePatternStyle = {
    backgroundImage: "radial-gradient(rgba(255, 199, 44, 0.15) 2px, transparent 2px)",
    backgroundSize: "24px 24px",
  };

  if (!user || user.rank !== 'Banson') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background" style={cheesePatternStyle}>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-destructive/20 text-destructive rounded-full flex items-center justify-center mb-4">
                <span className="text-xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                Only Banson rank members can access the approvals page.
              </p>
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
            <h2 className="text-2xl font-bold">Approvals Dashboard</h2>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "users" | "jobs")}>
              <TabsList className="grid grid-cols-2 w-full bg-transparent border-b rounded-none h-auto">
                <TabsTrigger 
                  value="users" 
                  className={`py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none ${
                    activeTab === "users" ? "font-medium" : "text-muted-foreground"
                  }`}
                >
                  User Approvals
                </TabsTrigger>
                <TabsTrigger 
                  value="jobs" 
                  className={`py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none ${
                    activeTab === "jobs" ? "font-medium" : "text-muted-foreground"
                  }`}
                >
                  Job Applications
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-6">
                {/* Pending User Approvals */}
                <Card className="bg-card/30 backdrop-blur-lg overflow-hidden">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle>Pending User Approvals</CardTitle>
                      <Badge variant="default">{pendingUsers.length} Pending</Badge>
                    </div>
                  </CardHeader>

                  <div className="overflow-x-auto">
                    {loadingUsers ? (
                      <div className="p-8 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : pendingUsers.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-muted-foreground">No pending user approval requests</p>
                      </div>
                    ) : (
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-accent/50">
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Requested On</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {pendingUsers.map((pendingUser) => (
                            <tr key={pendingUser.id}>
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <Avatar className="h-10 w-10 flex-shrink-0">
                                    <AvatarImage src={pendingUser.profilePicture || ""} alt={pendingUser.name} />
                                    <AvatarFallback className="bg-primary/20 text-primary">
                                      {getInitials(pendingUser.name || pendingUser.username)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium">{pendingUser.name || pendingUser.username}</div>
                                    <div className="text-sm text-muted-foreground">{pendingUser.username}@ratatoing</div>
                                    <div className="text-xs mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {pendingUser.rank}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm max-w-md">
                                  {pendingUser.description || 
                                    <span className="text-muted-foreground italic">No description provided</span>
                                  }
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm">{formatDate(pendingUser.createdAt)}</div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(pendingUser.createdAt), 'HH:mm')}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">
                                  <Button 
                                    size="sm"
                                    onClick={() => approveUserMutation.mutate(pendingUser.id)}
                                    disabled={approveUserMutation.isPending}
                                  >
                                    {approveUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => declineUserMutation.mutate(pendingUser.id)}
                                    disabled={declineUserMutation.isPending}
                                  >
                                    {declineUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline"}
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

                {/* Recently Approved Members */}
                <Card className="bg-card/30 backdrop-blur-lg">
                  <CardHeader className="border-b">
                    <CardTitle>Recently Approved Members</CardTitle>
                  </CardHeader>

                  <CardContent className="p-6">
                    {loadingApproved ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentlyApproved.map((approved) => (
                          <div key={approved.id} className="border rounded-lg overflow-hidden">
                            <div className="p-4">
                              <div className="flex items-center">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={approved.profilePicture || ""} alt={approved.name} />
                                  <AvatarFallback className="bg-primary/20 text-primary">
                                    {getInitials(approved.name || approved.username)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="ml-3">
                                  <div className="font-medium">{approved.name || approved.username}</div>
                                  <div className="text-sm text-muted-foreground">{approved.username}@ratatoing</div>
                                </div>
                              </div>
                              <div className="mt-3 flex justify-between text-sm">
                                <div>
                                  <span className="font-medium">Approved:</span> {formatDate(approved.approvedAt)}
                                </div>
                                <div>
                                  <Badge variant="outline" className="bg-green-500/20 text-green-600 dark:text-green-400">
                                    {approved.rank}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="jobs" className="space-y-6">
                {/* Pending Job Applications */}
                <Card className="bg-card/30 backdrop-blur-lg overflow-hidden">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle>Pending Job Applications</CardTitle>
                      <Badge variant="default">{pendingJobs.length} Pending</Badge>
                    </div>
                  </CardHeader>

                  <div className="overflow-x-auto">
                    {loadingJobs ? (
                      <div className="p-8 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : pendingJobs.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-muted-foreground">No pending job applications</p>
                      </div>
                    ) : (
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-accent/50">
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Applicant</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Job</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Applied On</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {pendingJobs.map((job) => (
                            <tr key={job.id}>
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <Avatar className="h-10 w-10 flex-shrink-0">
                                    <AvatarImage src={job.user?.profilePicture || ""} alt={job.user?.name} />
                                    <AvatarFallback className="bg-primary/20 text-primary">
                                      {getInitials(job.name || job.username)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium">{job.name || job.username}</div>
                                    <div className="text-sm text-muted-foreground">{job.username}@ratatoing</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <Briefcase className="h-4 w-4 mr-2 text-primary" />
                                  <span className="font-medium">{job.job}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm max-w-md">
                                  {job.description || 
                                    <span className="text-muted-foreground italic">No description provided</span>
                                  }
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm">{formatDate(job.createdAt)}</div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(job.createdAt), 'HH:mm')}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">
                                  <Button 
                                    size="sm"
                                    onClick={() => approveJobMutation.mutate(job.id)}
                                    disabled={approveJobMutation.isPending}
                                  >
                                    {approveJobMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => rejectJobMutation.mutate(job.id)}
                                    disabled={rejectJobMutation.isPending}
                                  >
                                    {rejectJobMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}