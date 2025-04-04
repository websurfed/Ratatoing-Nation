import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pizza } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { user, loginMutation, registerMutation, loginSchema, registerSchema } = useAuth();
  const [location, navigate] = useLocation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      name: "",
      password: "",
      confirmPassword: "",
      pin: "",
      email: "", // This will be overwritten by the server, but needs to be here for type safety
      pocketSniffles: 0, // These will be set by the server
      rank: "Nibbler" as const,
      status: "pending" as const,
    },
  });

  const onLoginSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      console.log("Login form data:", data);
      
      // Manual fetch for debugging
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      console.log("Login response status:", response.status);
      const responseData = await response.text();
      console.log("Login response data:", responseData);
      
      // Use the regular mutation if manual fetch succeeds
      if (response.ok) {
        loginMutation.mutate(data);
      } else {
        toast({
          title: "Login failed",
          description: responseData || "Check the console for details",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: "An error occurred. Check the console for details.",
        variant: "destructive",
      });
    }
  };

  const onRegisterSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      // Remove confirmPassword before submitting
      const { confirmPassword, ...userData } = data;
      
      // Add email (will be overwritten by server)
      const userWithEmail = {
        ...userData,
        email: `${userData.username}@ratatoing`,
      };
      
      console.log("Register form data:", userWithEmail);
      
      // Manual fetch for debugging
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userWithEmail),
        credentials: "include",
      });
      
      console.log("Register response status:", response.status);
      const responseData = await response.text();
      console.log("Register response data:", responseData);
      
      // Use the regular mutation if manual fetch succeeds
      if (response.ok) {
        registerMutation.mutate(userWithEmail);
      } else {
        toast({
          title: "Registration failed",
          description: responseData || "Check the console for details",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: "An error occurred. Check the console for details.",
        variant: "destructive",
      });
    }
  };

  // Pattern for cheese background
  const cheesePatternStyle = {
    backgroundImage: "radial-gradient(rgba(255, 199, 44, 0.15) 2px, transparent 2px)",
    backgroundSize: "24px 24px",
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors bg-background"
      style={cheesePatternStyle}
    >
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary flex items-center justify-center">
            <Pizza className="text-white text-2xl" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold">Welcome to Ratatoing Nation</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            The place for all Banson lovers
          </p>
        </div>

        <Card className="bg-card/30 backdrop-blur-lg border-border">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
            <TabsList className="grid grid-cols-2 w-full bg-transparent border-b rounded-none h-auto">
              <TabsTrigger 
                value="login" 
                className={`py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none ${
                  activeTab === "login" ? "font-medium" : "text-muted-foreground"
                }`}
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className={`py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none ${
                  activeTab === "register" ? "font-medium" : "text-muted-foreground"
                }`}
              >
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="p-6">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="username" 
                              {...field} 
                              className="pl-10"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                              <span className="text-sm">@</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register" className="p-6">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="username" 
                              {...field} 
                              className="pl-10"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                              <span className="text-sm">@</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank PIN (4 digits)</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••" 
                            maxLength={4} 
                            pattern="[0-9]{4}"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          <p>
            By signing up, you agree to the Ratatoing Nation's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
