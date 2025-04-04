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

export default function AuthPage() {
  const { user, loginMutation, registerMutation, loginSchema, registerSchema } = useAuth();
  const [location, navigate] = useLocation();
  const { theme } = useTheme();
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
    },
  });

  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: z.infer<typeof registerSchema>) => {
    // Remove confirmPassword before submitting
    const { confirmPassword, ...userData } = data;
    
    // Add email (will be overwritten by server)
    const userWithEmail = {
      ...userData,
      email: `${userData.username}@ratatoing`,
    };
    
    registerMutation.mutate(userWithEmail);
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
            The premier social network for cheese enthusiasts
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
          <p className="mt-1">
            First time users that register with usernames 'banson' or 'banson2' will receive admin privileges.
          </p>
        </div>
      </div>
    </div>
  );
}
