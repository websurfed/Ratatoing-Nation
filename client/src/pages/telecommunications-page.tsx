import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Loader2, 
  MessageSquare,
  Phone,
  UserPlus,
  ChevronLeft,
  MoreVertical,
  Send,
  Smile,
  Mic,
  Trash
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ref, set, push, onValue, off, query, orderByChild, equalTo, get, limitToLast } from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import { updateMessageStatus, formatMessageForFirebase } from "@/lib/message-utils";
import { useToast } from "@/hooks/use-toast";
import { User } from '@shared/schema';

// Phone number validation schema
const phoneSchema = z.object({
  cellDigits: z.string().min(10, "Phone number must be at least 10 digits")
});

// Message schema
const messageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty")
});

type PhoneFormValues = z.infer<typeof phoneSchema>;
type MessageFormValues = z.infer<typeof messageSchema>;

type Contact = {
  id: string;
  contactName?: string;
  contactCellDigits: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
};

type Message = {
  id: string;
  text: string;
  sender: 'me' | 'them';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  senderName?: string;
  recipientName?: string;
};

function useMessageListener(
  currentUserCellDigits: string,
  contactCellDigits: string,
  callback: (messages: Message[]) => void,
  scrollToBottom: () => void
) {
  useEffect(() => {
    if (!currentUserCellDigits || !contactCellDigits) return;

    const participantsKey = [currentUserCellDigits, contactCellDigits].sort().join('_');
    const messagesRef = query(
      ref(firebaseDb, 'messages'),
      orderByChild('participants'),
      equalTo(participantsKey)
    );

    const handleNewMessage = (snapshot: any) => {
      const newMessages: Message[] = [];
      snapshot.forEach((child: any) => {
        const msg = child.val();
        newMessages.push({
          id: child.key,
          text: msg.text,
          sender: msg.sender === currentUserCellDigits ? 'me' : 'them',
          timestamp: new Date(msg.timestamp),
          status: msg.status || 'sent',
          senderName: msg.senderName,
          recipientName: msg.recipientName
        });
      });
      callback(newMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
      scrollToBottom();
    };

    onValue(messagesRef, handleNewMessage);
    return () => off(messagesRef, 'value', handleNewMessage);
  }, [currentUserCellDigits, contactCellDigits, callback, scrollToBottom]);
}

export default function TelecommunicationsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch contacts from Postgres
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['/api/telecom/contacts'],
    queryFn: async () => {
      const response = await fetch('/api/telecom/contacts');
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    },
    enabled: !!user
  });

  // Fetch messages when contact is selected
  const { refetch: refetchMessages } = useQuery({
    queryKey: ['/api/telecom/messages', selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact || !user?.cellDigits) return [];

      // Load from Firebase instead of your API
      const participantsKey = [user.cellDigits, selectedContact.contactCellDigits].sort().join('_');
      const snapshot = await get(query(
        ref(firebaseDb, 'messages'),
        orderByChild('participants'),
        equalTo(participantsKey),
        limitToLast(50)
      ));

      const messages: Message[] = [];
      snapshot.forEach((child) => {
        const msg = child.val();
        messages.push({
          id: child.key!,
          text: msg.text,
          sender: msg.sender === user.cellDigits ? 'me' : 'them',
          timestamp: new Date(msg.timestamp),
          status: msg.status,
          senderName: msg.senderName,
          recipientName: msg.recipientName
        });
      });

      setMessages(messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
      scrollToBottom();
      return messages;
    },
    enabled: !!selectedContact && !!user?.cellDigits
  });

  // Use the message listener
  useMessageListener(
    user?.cellDigits || '',
    selectedContact?.contactCellDigits || '',
    (newMessages) => {
      setMessages(newMessages);
    },
    scrollToBottom
  );

  // Form for adding contacts
  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      cellDigits: ""
    }
  });

  // Form for sending messages
  const messageForm = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: ""
    }
  });

  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: async (data: PhoneFormValues) => {
      const res = await apiRequest("POST", "/api/telecom/contacts", data);
      return res.json();
    },
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: ['/api/telecom/contacts'] });
      toast({
        title: "Contact added",
        description: `${newContact.cellDigits} has been added to your contacts.`
      });
      phoneForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add contact",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await apiRequest("DELETE", `/api/telecom/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/telecom/contacts'] });
      toast({
        title: "Contact deleted",
        description: "Contact removed successfully"
      });
      setSelectedContact(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete contact",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageFormValues) => {
      if (!selectedContact || !user?.cellDigits) {
        throw new Error("No contact selected or user not available");
      }

      const messageRef = push(ref(firebaseDb, 'messages'));
      const newMessage = {
        sender: user.cellDigits,
        senderName: user.name,
        recipient: selectedContact.contactCellDigits,
        recipientName: selectedContact.contactName,
        text: data.message,
        timestamp: Date.now(),
        status: 'sent',
        participants: [user.cellDigits, selectedContact.contactCellDigits].sort().join('_')
      };

      await set(messageRef, newMessage);
      return { id: messageRef.key, ...newMessage };
    },
    onSuccess: () => {
      messageForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/telecom/contacts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle adding a contact
  const onAddContact = (data: PhoneFormValues) => {
    addContactMutation.mutate(data);
  };

  const onDeleteContact = (contactId: string) => {
    deleteContactMutation.mutate(contactId);
  };

  // Handle sending a message
  const onSendMessage = (data: MessageFormValues) => {
    sendMessageMutation.mutate(data);
  };

  // Format time for messages
  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  // Format date for conversation list
  const formatConversationDate = (date?: Date) => {
    if (!date) return "";
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return format(date, 'h:mm a');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return format(date, 'MM/dd/yyyy');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <MobileHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Contacts sidebar */}
          <div className={`w-full md:w-80 border-r ${selectedContact ? 'hidden md:block' : 'block'}`}>
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">Messages</h2>
                <Button variant="ghost" size="icon">
                  <UserPlus className="h-5 w-5" />
                </Button>
              </div>

              {/* Add contact form */}
              <div className="p-4 border-b">
                <Form {...phoneForm}>
                  <form onSubmit={phoneForm.handleSubmit(onAddContact)} className="space-y-2">
                    <FormField
                      control={phoneForm.control}
                      name="cellDigits"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="Enter cell digits" 
                                {...field} 
                                className="pl-10"
                              />
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                <Phone className="h-4 w-4" />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={addContactMutation.isPending}
                    >
                      {addContactMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Contact"
                      )}
                    </Button>
                  </form>
                </Form>
              </div>

              {/* Contacts list */}
              <div className="flex-1 overflow-y-auto">
                {contactsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No contacts yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add a contact to start messaging
                    </p>
                  </div>
                ) : (
                  <ul>
                    {contacts.map((contact) => (
                      <li 
                        key={contact.id}
                        className={`border-b cursor-pointer hover:bg-accent/50 ${selectedContact?.id === contact.id ? 'bg-accent/30' : ''}`}
                        onClick={() => setSelectedContact(contact)}
                      >
                        <div className="flex items-center p-4">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarFallback>
                              {contact.contactName ? contact.contactName.charAt(0).toUpperCase() : contact.contactCellDigits.slice(-2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <p className="font-medium truncate">
                                {contact.contactName || contact.contactCellDigits}
                              </p>
                              <p className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                {formatConversationDate(contact.lastMessageTime)}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {contact.lastMessage || "No messages yet"}
                            </p>
                          </div>
                          {contact.unreadCount ? (
                            <div className="ml-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                              {contact.unreadCount}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Conversation view */}
          {selectedContact ? (
            <div className="flex-1 flex flex-col">
              {/* Conversation header */}
              <div className="p-3 border-b flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden mr-2"
                  onClick={() => setSelectedContact(null)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarFallback>
                    {selectedContact.contactName ? 
                      selectedContact.contactName.charAt(0).toUpperCase() : 
                      selectedContact.contactCellDigits.slice(-2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">
                    {selectedContact.contactName || selectedContact.contactCellDigits}
                  </h3>
                  <p className="text-xs text-muted-foreground">{selectedContact.contactCellDigits}</p>
                </div>
                <Button variant="ghost" size="icon">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onDeleteContact(selectedContact.id)}
                  disabled={deleteContactMutation.isPending}
                >
                  {deleteContactMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash className="h-5 w-5 text-destructive" />
                  )}
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No messages yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Send a message to start the conversation
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div 
                        key={message.id}
                        className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${
                          message.sender === 'me' 
                            ? 'bg-primary text-primary-foreground rounded-br-none' 
                            : 'bg-muted rounded-bl-none'
                        }`}>
                          {/* Show sender info for received messages */}
                          {message.sender !== 'me' && (
                            <p className="text-xs font-semibold mb-1">
                              {selectedContact?.contactName || selectedContact?.contactCellDigits}
                            </p>
                          )}
                          <p>{message.text}</p>
                          <div className={`text-xs mt-1 flex items-center justify-end space-x-1 ${
                            message.sender === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            <span>{formatTime(message.timestamp)}</span>
                            {message.sender === 'me' && (
                              <span>
                                {message.status === 'sent' && '✓'}
                                {message.status === 'delivered' && '✓✓'}
                                {message.status === 'read' && '✓✓✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message input */}
              <div className="p-3 border-t">
                <Form {...messageForm}>
                  <form onSubmit={messageForm.handleSubmit(onSendMessage)} className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" type="button">
                      <Smile className="h-5 w-5" />
                    </Button>
                    <FormField
                      control={messageForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input 
                              placeholder="Message" 
                              {...field} 
                              className="flex-1"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      type="button"
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900/50">
              <div className="text-center p-8">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Select a conversation</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a contact to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}