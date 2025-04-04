import { useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Inbox, Send, Trash2, Search, RefreshCw, MoreVertical, Plus, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Email form schema
const emailSchema = z.object({
  recipientUsername: z.string().min(1, "Recipient is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Message is required")
});

type EmailFormValues = z.infer<typeof emailSchema>;

export default function EmailPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'trash'>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  // Form for composing new email
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      recipientUsername: "",
      subject: "",
      body: ""
    }
  });

  // Fetch inbox emails
  const { data: inboxEmails = [], isLoading: loadingInbox, refetch: refetchInbox } = useQuery({
    queryKey: ['/api/emails/inbox'],
    queryFn: async () => {
      const response = await fetch('/api/emails/inbox');
      if (!response.ok) throw new Error('Failed to fetch emails');
      return response.json();
    },
    enabled: !!user
  });

  // Fetch sent emails
  const { data: sentEmails = [], isLoading: loadingSent, refetch: refetchSent } = useQuery({
    queryKey: ['/api/emails/sent'],
    queryFn: async () => {
      const response = await fetch('/api/emails/sent');
      if (!response.ok) throw new Error('Failed to fetch sent emails');
      return response.json();
    },
    enabled: !!user
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: EmailFormValues) => {
      const res = await apiRequest("POST", "/api/emails", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email sent",
        description: "Your email has been sent successfully."
      });
      form.reset();
      setComposeOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/emails/sent'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mark email as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const res = await apiRequest("PATCH", `/api/emails/${emailId}/read`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails/inbox'] });
    }
  });

  // Delete email mutation
  const deleteEmailMutation = useMutation({
    mutationFn: async (emailId: number) => {
      const res = await apiRequest("DELETE", `/api/emails/${emailId}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email deleted",
        description: "The email has been deleted."
      });
      setSelectedEmail(null);
      queryClient.invalidateQueries({ queryKey: ['/api/emails/inbox'] });
      queryClient.invalidateQueries({ queryKey: ['/api/emails/sent'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete email",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Today's date
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    }
    
    // This year
    if (date.getFullYear() === now.getFullYear()) {
      return format(date, 'MMM d');
    }
    
    // Different year
    return format(date, 'MMM d, yyyy');
  };

  // Handle email selection
  const handleSelectEmail = (email: any) => {
    setSelectedEmail(email);
    
    // Mark as read if in inbox and not already read
    if (activeFolder === 'inbox' && !email.read) {
      markAsReadMutation.mutate(email.id);
    }
  };

  // Handle send email
  const onSubmit = (data: EmailFormValues) => {
    sendEmailMutation.mutate(data);
  };

  // Get current emails based on active folder
  const currentEmails = activeFolder === 'inbox' ? inboxEmails : activeFolder === 'sent' ? sentEmails : [];
  const isLoading = activeFolder === 'inbox' ? loadingInbox : loadingSent;

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
            <h2 className="text-2xl font-bold">Email System</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Email Sidebar */}
              <div className="lg:col-span-1">
                <Card className="bg-card/30 backdrop-blur-lg">
                  <CardHeader className="border-b px-4 py-3">
                    <Button 
                      onClick={() => setComposeOpen(true)}
                      className="w-full flex items-center justify-center"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Compose</span>
                    </Button>
                  </CardHeader>
                  
                  <CardContent className="p-2">
                    <ul className="space-y-1">
                      <li>
                        <Button
                          variant={activeFolder === 'inbox' ? 'default' : 'ghost'}
                          className="w-full justify-start"
                          onClick={() => setActiveFolder('inbox')}
                        >
                          <Inbox className="mr-2 h-4 w-4" />
                          <span>Inbox</span>
                          {inboxEmails.filter(email => !email.read).length > 0 && (
                            <Badge className="ml-auto" variant="default">
                              {inboxEmails.filter(email => !email.read).length}
                            </Badge>
                          )}
                        </Button>
                      </li>
                      <li>
                        <Button
                          variant={activeFolder === 'sent' ? 'default' : 'ghost'}
                          className="w-full justify-start"
                          onClick={() => setActiveFolder('sent')}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          <span>Sent</span>
                        </Button>
                      </li>
                      <li>
                        <Button
                          variant={activeFolder === 'trash' ? 'default' : 'ghost'}
                          className="w-full justify-start"
                          onClick={() => setActiveFolder('trash')}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Trash</span>
                        </Button>
                      </li>
                    </ul>
                  </CardContent>
                  
                  <CardHeader className="border-t px-4 py-3">
                    <CardTitle className="text-sm">Contacts</CardTitle>
                    
                    <CardContent className="p-0 pt-2">
                      <ul className="space-y-2">
                        {/* This would be populated from a contacts API, showing sample structure */}
                        <li className="flex items-center">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/20 text-primary">BC</AvatarFallback>
                          </Avatar>
                          <div className="ml-2">
                            <div className="text-sm">Banson</div>
                            <div className="text-xs text-muted-foreground">banson@ratatoing</div>
                          </div>
                        </li>
                        <li className="flex items-center">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/20 text-primary">B2</AvatarFallback>
                          </Avatar>
                          <div className="ml-2">
                            <div className="text-sm">Banson2</div>
                            <div className="text-xs text-muted-foreground">banson2@ratatoing</div>
                          </div>
                        </li>
                      </ul>
                    </CardContent>
                  </CardHeader>
                </Card>
              </div>
              
              {/* Email Content */}
              <div className="lg:col-span-3">
                <Card className="bg-card/30 backdrop-blur-lg h-full">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle>{activeFolder === 'inbox' ? 'Inbox' : activeFolder === 'sent' ? 'Sent' : 'Trash'}</CardTitle>
                      <div className="flex space-x-2">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => activeFolder === 'inbox' ? refetchInbox() : refetchSent()}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {selectedEmail ? (
                    // Email detail view
                    <div className="flex flex-col h-full">
                      <div className="p-6 border-b">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold">{selectedEmail.subject}</h3>
                            <div className="text-sm text-muted-foreground mt-1">
                              {formatDate(selectedEmail.createdAt)}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => deleteEmailMutation.mutate(selectedEmail.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setSelectedEmail(null)}
                            >
                              <span className="text-xl">&times;</span>
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {getInitials(selectedEmail.senderName || 'User')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="ml-3">
                            <div className="font-medium">
                              {activeFolder === 'sent' ? 'To: ' + selectedEmail.recipientName : selectedEmail.senderName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {activeFolder === 'sent' 
                                ? `${selectedEmail.recipientUsername}@ratatoing`
                                : `${selectedEmail.senderUsername}@ratatoing`
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-6 flex-grow">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {selectedEmail.body}
                        </div>
                      </div>
                      
                      <CardFooter className="border-t p-4">
                        <Button 
                          variant="ghost" 
                          onClick={() => {
                            setComposeOpen(true);
                            form.setValue(
                              "recipientUsername", 
                              activeFolder === 'sent' 
                                ? selectedEmail.recipientUsername
                                : selectedEmail.senderUsername
                            );
                            form.setValue(
                              "subject", 
                              selectedEmail.subject.startsWith("Re:") 
                                ? selectedEmail.subject 
                                : `Re: ${selectedEmail.subject}`
                            );
                          }}
                        >
                          Reply
                        </Button>
                      </CardFooter>
                    </div>
                  ) : (
                    // Email list view
                    <div>
                      {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      ) : currentEmails.length === 0 ? (
                        <div className="text-center py-12">
                          <Mail className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                          <p className="mt-4 text-muted-foreground">
                            {activeFolder === 'inbox' 
                              ? "Your inbox is empty" 
                              : activeFolder === 'sent' 
                                ? "You haven't sent any emails yet"
                                : "No emails in trash"
                            }
                          </p>
                        </div>
                      ) : (
                        <ul>
                          {currentEmails.map((email: any) => (
                            <li 
                              key={email.id} 
                              className={`border-b hover:bg-accent/10 transition-colors ${
                                activeFolder === 'inbox' && !email.read ? 'bg-primary/5' : ''
                              }`}
                            >
                              <button 
                                className="block w-full text-left px-6 py-4"
                                onClick={() => handleSelectEmail(email)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <Avatar className="w-10 h-10">
                                      <AvatarFallback className="bg-primary/20 text-primary">
                                        {getInitials(activeFolder === 'sent' 
                                          ? email.recipientName || 'User' 
                                          : email.senderName || 'User'
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="ml-3">
                                      <div className="flex items-center">
                                        <p className={`font-medium ${activeFolder === 'inbox' && !email.read ? 'font-semibold' : ''}`}>
                                          {activeFolder === 'sent' ? email.recipientName : email.senderName}
                                        </p>
                                        {activeFolder === 'inbox' && !email.read && (
                                          <Badge className="ml-2" variant="default">New</Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {activeFolder === 'sent' 
                                          ? `${email.recipientUsername}@ratatoing`
                                          : `${email.senderUsername}@ratatoing`
                                        }
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{formatDate(email.createdAt)}</p>
                                </div>
                                <div className="mt-2">
                                  <h4 className={`text-sm ${activeFolder === 'inbox' && !email.read ? 'font-medium' : ''}`}>
                                    {email.subject}
                                  </h4>
                                  <p className="text-sm text-muted-foreground truncate">{email.body}</p>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Compose Email Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="recipientUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To</FormLabel>
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
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Subject" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write your message here..." 
                        className="min-h-[200px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setComposeOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={sendEmailMutation.isPending}
                >
                  {sendEmailMutation.isPending ? "Sending..." : "Send"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
