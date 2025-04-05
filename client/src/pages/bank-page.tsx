import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Loader2, 
  Lock, 
  Coins, 
  RefreshCw, 
  ArrowDown, 
  ArrowUp,
  Banknote
} from "lucide-react";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";

// PIN verification schema
const pinSchema = z.object({
  pin: z.string().length(4, "PIN must be 4 digits")
});

// Transfer schema
const transferSchema = z.object({
  recipientUsername: z.string().min(1, "Recipient username is required"),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
    "Amount must be a positive number"
  ),
  message: z.string().optional()
});

type PinFormValues = z.infer<typeof pinSchema>;
type TransferFormValues = z.infer<typeof transferSchema>;

export default function BankPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [authenticated, setAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Auto-refresh data every 30 seconds when authenticated
  useEffect(() => {
    if (authenticated && user) {
      // Initial refresh when first authenticated
      setLastRefreshed(new Date());
      
      const interval = setInterval(() => {
        // Refresh data using our custom refresh function
        refreshData();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [authenticated, user]);

  // Form for PIN verification
  const pinForm = useForm<PinFormValues>({
    resolver: zodResolver(pinSchema),
    defaultValues: {
      pin: ""
    }
  });

  // Form for transfers
  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      recipientUsername: "",
      amount: "",
      message: ""
    }
  });

  // Fetch user transactions
  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    enabled: !!user && authenticated
  });
  
  // Create a custom refresh function to track when data is refreshed
  const refreshData = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    setLastRefreshed(new Date());
    toast({
      title: "Account Updated",
      description: "Your bank information has been refreshed.",
      duration: 3000, // Hide after 3 seconds
    });
  };

  // Verify PIN mutation
  const verifyPinMutation = useMutation({
    mutationFn: async (data: PinFormValues) => {
      const res = await apiRequest("POST", "/api/verify-pin", data);
      return res.json();
    },
    onSuccess: () => {
      setAuthenticated(true);
    },
    onError: (error: Error) => {
      toast({
        title: "PIN verification failed",
        description: "The PIN you entered is incorrect.",
        variant: "destructive"
      });
      pinForm.reset();
    }
  });

  // Transfer funds mutation
  const transferMutation = useMutation({
    mutationFn: async (data: TransferFormValues) => {
      const res = await apiRequest("POST", "/api/transfer", {
        recipientUsername: data.recipientUsername,
        amount: parseInt(data.amount),
        description: data.message || "Transfer"
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transfer successful",
        description: "The funds have been transferred successfully."
      });
      transferForm.reset();
      
      // Use our refresh function to update data and timestamp
      refreshData();
    },
    onError: (error: Error) => {
      toast({
        title: "Transfer failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle PIN verification
  const onPinSubmit = (data: PinFormValues) => {
    verifyPinMutation.mutate(data);
  };

  // Handle transfer
  const onTransferSubmit = (data: TransferFormValues) => {
    transferMutation.mutate(data);
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

  // Handle numeric keypad input
  const handlePinInput = (num: number) => {
    if (pinInput.length < 4) {
      const newPin = pinInput + num;
      setPinInput(newPin);
      pinForm.setValue("pin", newPin);
    }
  };

  // Handle backspace
  const handleBackspace = () => {
    if (pinInput.length > 0) {
      const newPin = pinInput.slice(0, -1);
      setPinInput(newPin);
      pinForm.setValue("pin", newPin);
    }
  };

  if (!user) return null;
  
  return (
    <div className="min-h-screen bg-background transition-colors" style={cheesePatternStyle}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <MobileHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="container mx-auto p-4 md:p-6">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Bank Account</h2>
            
            {/* PIN Authentication */}
            {!authenticated ? (
              <div className="max-w-md mx-auto">
                <Card className="bg-card/30 backdrop-blur-lg">
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
                        <Lock className="text-white h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-semibold">Enter PIN</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Please enter your secure PIN to access your bank account
                      </p>
                    </div>
                    
                    <Form {...pinForm}>
                      <form onSubmit={pinForm.handleSubmit(onPinSubmit)}>
                        <div className="mb-4">
                          <div className="flex justify-center space-x-2">
                            {Array(4).fill(0).map((_, i) => (
                              <div 
                                key={i}
                                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl border border-border bg-accent/50"
                              >
                                {pinInput.length > i ? "●" : ""}
                              </div>
                            ))}
                          </div>
                          <FormField
                            control={pinForm.control}
                            name="pin"
                            render={({ field }) => (
                              <FormItem className="sr-only">
                                <FormControl>
                                  <Input {...field} type="hidden" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <Button
                              key={num}
                              type="button"
                              variant="outline"
                              className="w-full py-3 rounded-lg text-lg font-medium"
                              onClick={() => handlePinInput(num)}
                            >
                              {num}
                            </Button>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full py-3 rounded-lg text-lg font-medium"
                            onClick={() => handlePinInput(0)}
                          >
                            0
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full py-3 rounded-lg text-lg font-medium col-span-2"
                            onClick={handleBackspace}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                          </Button>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full py-3 rounded-lg"
                          disabled={pinInput.length !== 4 || verifyPinMutation.isPending}
                        >
                          {verifyPinMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            "Verify PIN"
                          )}
                        </Button>
                      </form>
                    </Form>
                    
                    <p className="text-center text-sm mt-4 text-muted-foreground">
                      <Button variant="link" className="p-0 h-auto">Forgot PIN?</Button> Contact a Banson for assistance.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Bank Account Summary
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-card/30 backdrop-blur-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold">Account Balance</h3>
                        <Button variant="ghost" size="icon" onClick={refreshData}>
                          <RefreshCw className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                      <div className="flex items-center mb-4">
                        <Coins className="text-primary text-3xl mr-3" />
                        <div>
                          <p className="text-3xl font-bold">{user.pocketSniffles.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">Pocket Sniffles</p>
                        </div>
                      </div>
                      <Separator className="my-4" />
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Account ID:</span>
                          <span className="font-medium">PS-{user.id.toString().padStart(6, '0')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Account Owner:</span>
                          <span className="font-medium">{user.name || user.username}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Email:</span>
                          <span className="font-medium">{user.username}@ratatoing</span>
                        </div>
                        {lastRefreshed && (
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>Auto-refreshes every 30s</span>
                            <span>Last updated: {format(lastRefreshed, 'h:mm:ss a')}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card/30 backdrop-blur-lg">
                    <CardHeader>
                      <CardTitle>Quick Transfer</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-6">
                      <Form {...transferForm}>
                        <form onSubmit={transferForm.handleSubmit(onTransferSubmit)} className="space-y-3">
                          <FormField
                            control={transferForm.control}
                            name="recipientUsername"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Recipient Username</FormLabel>
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
                            control={transferForm.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Amount (PS)</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      type="number" 
                                      min="1" 
                                      max={user.pocketSniffles}
                                      placeholder="0" 
                                      {...field} 
                                      className="pl-9"
                                    />
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <Coins className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={transferForm.control}
                            name="message"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Message (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Payment for..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={transferMutation.isPending}
                          >
                            {transferMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              "Send Sniffles"
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Recent Transactions */}
                <Card className="bg-card/30 backdrop-blur-lg">
                  <CardHeader className="border-b">
                    <CardTitle>Recent Transactions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {isLoading ? (
                      <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-8">
                        <Banknote className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                        <p className="mt-4 text-muted-foreground">
                          No transactions found
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {transactions.map((transaction: any) => (
                          <li key={transaction.id} className="py-3 flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                transaction.recipientId === user.id 
                                  ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                                  : 'bg-destructive/20 text-destructive'
                              }`}>
                                {transaction.recipientId === user.id 
                                  ? <ArrowDown className="h-5 w-5" /> 
                                  : <ArrowUp className="h-5 w-5" />
                                }
                              </div>
                              <div className="ml-3">
                                <p className="font-medium">
                                  {transaction.type === 'transfer' 
                                    ? transaction.recipientId === user.id 
                                      ? 'Received Payment' 
                                      : 'Sent Payment'
                                    : transaction.type === 'purchase'
                                      ? transaction.recipientId === user.id 
                                        ? 'Item Sold' 
                                        : 'Item Purchased'
                                      : 'Admin Operation'
                                  }
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {transaction.description ? (
                                    transaction.description
                                  ) : transaction.type === 'purchase' ? (
                                    transaction.recipientId === user.id 
                                      ? `Buyer: ${transaction.senderName || transaction.senderUsername || 'Unknown'}`
                                      : `Seller: ${transaction.recipientName || transaction.recipientUsername || 'Unknown'}`
                                  ) : (
                                    transaction.recipientId === user.id 
                                      ? `From: ${transaction.senderName || transaction.senderUsername || 'System'}`
                                      : `To: ${transaction.recipientName || transaction.recipientUsername || 'System'}`
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-medium ${
                                transaction.recipientId === user.id 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-destructive'
                              }`}>
                                {transaction.recipientId === user.id ? '+' : '-'}{transaction.amount} PS
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(transaction.createdAt)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
