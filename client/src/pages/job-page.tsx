import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { USER_JOBS } from "@shared/schema";
import { RefreshCw, Briefcase } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const applicationSchema = z.object({
  job: z.string().min(1, "Please select a job"),
  description: z.string().min(10, "Application letter must be at least 10 characters"),
});

export default function JobsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  const form = useForm<z.infer<typeof applicationSchema>>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      job: "",
      description: "",
    },
  });

  const { data: applications, isLoading, refetch } = useQuery({
    queryKey: ["/api/jobs/my-applications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/jobs/my-applications");
      return await res.json();
    }
  });

  const applyMutation = useMutation({
    mutationFn: async (values: z.infer<typeof applicationSchema>) => {
      const res = await apiRequest("POST", "/api/jobs/apply", values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Application submitted!",
        description: "Your job application has been sent for review"
      });
      setShowApplicationForm(false);
      form.reset();
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const quitJobMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/jobs/quit", {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Job resigned",
        description: "You have successfully quit your job"
      });
      setShowQuitDialog(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (!user) return null;

  const cheesePatternStyle = {
    backgroundImage: "radial-gradient(rgba(255, 199, 44, 0.15) 2px, transparent 2px)",
    backgroundSize: "24px 24px",
  };

  return (
    <div className="min-h-screen bg-background transition-colors" style={cheesePatternStyle}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <MobileHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="container mx-auto p-4 md:p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Job Applications</h1>
                <p className="text-muted-foreground mt-1">
                  {user.job 
                    ? "You're currently employed as a " + user.job
                    : "Apply for jobs in the Ratatoing Nation"}
                </p>
              </div>
              <div className="flex gap-2">
                {user.job && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowQuitDialog(true)}
                  >
                    Quit Job
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {!user.job ? (
              <>
                {showApplicationForm ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>New Job Application</CardTitle>
                      <CardDescription>
                        Fill out this form to apply for a position
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...form}>
                        <form 
                          onSubmit={form.handleSubmit((values) => applyMutation.mutate(values))}
                          className="space-y-4"
                        >
                          <FormField
                            control={form.control}
                            name="job"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Select Position</FormLabel>
                                <FormControl>
                                  <select
                                    {...field}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <option value="">-- Select a job --</option>
                                    {USER_JOBS.map((job) => (
                                      <option key={job} value={job}>{job}</option>
                                    ))}
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Application Letter</FormLabel>
                                <FormControl>
                                  <textarea
                                    className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Explain why you'd be good at this job..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end gap-2 pt-4">
                            <Button 
                              variant="outline" 
                              type="button"
                              onClick={() => setShowApplicationForm(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit"
                              disabled={applyMutation.isPending}
                            >
                              {applyMutation.isPending ? "Submitting..." : "Submit Application"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center">
                      <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">
                        {applications?.length ? "Your Applications" : "No Applications Yet"}
                      </h3>
                      <p className="text-muted-foreground mt-1 mb-4">
                        {applications?.length 
                          ? "View the status of your job applications below"
                          : "Get started by applying for a position"}
                      </p>
                      <Button onClick={() => setShowApplicationForm(true)}>
                        Apply for a Job
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {applications?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Applications</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {applications.map((app: any) => (
                        <div key={app.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{app.job}</h4>
                            <span className={`px-2 py-1 rounded text-xs ${
                              app.status === 'approved' ? 'bg-green-100 text-green-800' :
                              app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {app.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">{app.description}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Current Employment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{user.job}</h4>
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                        Employed
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      You are currently employed in this position
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Quit Job Confirmation Dialog */}
      <AlertDialog open={showQuitDialog} onOpenChange={setShowQuitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to quit your job?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You will need to reapply if you want to get this job back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => quitJobMutation.mutate()}
              disabled={quitJobMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {quitJobMutation.isPending ? "Quitting..." : "Quit Job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}