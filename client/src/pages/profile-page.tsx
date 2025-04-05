import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User as UserIcon, Key, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { updateUserSchema, type UpdateUser } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

// Extend the update schema with required validation for the current password
const profileUpdateSchema = updateUserSchema.extend({
  currentPassword: z.string().min(1, "Please enter your current password to verify changes")
});

// Create a new type that includes the current password
type ProfileFormValues = z.infer<typeof profileUpdateSchema>;

// Create a specialized password change schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    "Password must include uppercase, lowercase, number and special character"
  ),
  confirmPassword: z.string().min(1, "Please confirm your new password")
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type PasswordFormValues = z.infer<typeof passwordChangeSchema>;

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");

  // Basic profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      currentPassword: ""
    }
  });

  // Update form values when user data loads
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || "",
        email: user.email || "",
        currentPassword: ""
      });
    }
  }, [user, profileForm]);

  // Password change form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      profileForm.reset({
        name: user?.name || "",
        email: user?.email || "",
        currentPassword: ""
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      const res = await apiRequest("POST", "/api/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully."
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Password change failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Pin change mutation
  const changePinMutation = useMutation({
    mutationFn: async (data: { currentPassword: string, newPin: string }) => {
      const res = await apiRequest("POST", "/api/change-pin", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "PIN changed",
        description: "Your banking PIN has been changed successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "PIN change failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle profile update
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Handle password change
  const onPasswordSubmit = (data: PasswordFormValues) => {
    changePasswordMutation.mutate(data);
  };

  // Handle PIN change
  const onPinSubmit = (data: { currentPassword: string, newPin: string }) => {
    changePinMutation.mutate(data);
  };

  // Pattern for cheese background
  const cheesePatternStyle = {
    backgroundImage: "radial-gradient(rgba(255, 199, 44, 0.15) 2px, transparent 2px)",
    backgroundSize: "24px 24px",
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
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
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">My Profile</h2>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                <TabsTrigger value="general">
                  <UserIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="avatar">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Avatar</span>
                </TabsTrigger>
              </TabsList>
              
              {/* General Tab */}
              <TabsContent value="general" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Update your account information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                        <FormField
                          control={profileForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="Your email" {...field} />
                              </FormControl>
                              <FormDescription>
                                This is used for notifications and account recovery
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Verify with your current password" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Required to confirm changes to your profile
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full sm:w-auto"
                          disabled={updateProfileMutation.isPending}
                        >
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Username:</span>
                        <span className="font-medium">{user.username}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Rank:</span>
                        <span className="font-medium">{user.rank}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium capitalize">{user.status}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Member Since:</span>
                        <span className="font-medium">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Avatar Tab */}
              <TabsContent value="avatar" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Picture</CardTitle>
                    <CardDescription>
                      Upload or change your profile picture
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="h-16 w-16 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      <form 
                        encType="multipart/form-data" 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          
                          // Check if a file was selected
                          const file = formData.get('profilePicture') as File;
                          if (!file || file.size === 0) {
                            toast({
                              title: "No file selected",
                              description: "Please select an image to upload",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          // Check file size (max 2MB)
                          if (file.size > 2 * 1024 * 1024) {
                            toast({
                              title: "File too large",
                              description: "Maximum file size is 2MB",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          // Show upload in progress
                          toast({
                            title: "Uploading...",
                            description: "Your profile picture is being uploaded"
                          });
                          
                          try {
                            // Send the file to the server
                            const res = await fetch('/api/users/profile-picture', {
                              method: 'POST',
                              body: formData,
                              credentials: 'include'
                            });
                            
                            if (!res.ok) {
                              const errorData = await res.json().catch(() => ({}));
                              throw new Error(errorData.message || 'Failed to upload profile picture');
                            }
                            
                            await res.json();
                            
                            toast({
                              title: "Profile picture updated",
                              description: "Your profile picture has been updated successfully"
                            });
                            
                            // Refresh user data
                            queryClient.invalidateQueries({ queryKey: ['/api/user'] });
                          } catch (error: any) {
                            toast({
                              title: "Upload failed",
                              description: error.message || "An error occurred during upload",
                              variant: "destructive"
                            });
                          }
                        }}
                        className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto"
                      >
                        <input 
                          type="file" 
                          name="profilePicture" 
                          id="profilePicture" 
                          accept="image/jpeg,image/png,image/gif"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Auto submit when file is selected
                              e.target.form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                            }
                          }}
                        />
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => document.getElementById('profilePicture')?.click()}
                        >
                          Upload New
                        </Button>
                        
                        {user.profilePicture && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="text-destructive hover:text-destructive"
                            onClick={async () => {
                              try {
                                // Show deleting in progress
                                toast({
                                  title: "Removing...",
                                  description: "Your profile picture is being removed"
                                });
                                
                                // Call API to remove profile picture
                                await apiRequest("DELETE", "/api/users/profile-picture");
                                
                                toast({
                                  title: "Profile picture removed",
                                  description: "Your profile picture has been removed"
                                });
                                
                                // Refresh user data
                                queryClient.invalidateQueries({ queryKey: ['/api/user'] });
                              } catch (error: any) {
                                toast({
                                  title: "Remove failed",
                                  description: error.message || "An error occurred during removal",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </form>
                      
                      <p className="text-sm text-muted-foreground">
                        Allowed formats: JPG, PNG, GIF. Max size: 2MB
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}