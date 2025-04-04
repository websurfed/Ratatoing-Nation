import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { 
  Card, 
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Plus, 
  Search, 
  ShoppingBag, 
  Loader2, 
  Coins, 
  Trash2,
  AlertTriangle
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Shop item form schema
const shopItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required").refine(
    (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
    "Price must be a positive number"
  ),
  image: z.instanceof(FileList).refine(files => files.length === 1, "Image is required")
});

type ShopFormValues = z.infer<typeof shopItemSchema>;

export default function ShopPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [createItemDialogOpen, setCreateItemDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("any");
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [itemDetailsDialogOpen, setItemDetailsDialogOpen] = useState(false);
  const [cartItems, setCartItems] = useState<number[]>([]);

  // Form for creating new shop item
  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopItemSchema),
    defaultValues: {
      title: "",
      description: "",
      price: ""
    }
  });

  // Fetch shop items
  const { data: shopItems = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/shop'],
    queryFn: async () => {
      const response = await fetch('/api/shop');
      if (!response.ok) throw new Error('Failed to fetch shop items');
      return response.json();
    },
    enabled: !!user
  });

  // Create shop item mutation
  const createItemMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/shop', {
        method: 'POST',
        body: data,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create shop item');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Item created successfully",
        description: "Your item has been listed in the shop."
      });
      form.reset();
      setCreateItemDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/shop'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create item",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Purchase item mutation
  const purchaseItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await apiRequest("POST", `/api/shop/${itemId}/purchase`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase successful",
        description: "You have successfully purchased the item."
      });
      setPurchaseDialogOpen(false);
      setSelectedItem(null);
      queryClient.invalidateQueries({ queryKey: ['/api/shop'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await apiRequest("DELETE", `/api/shop/${itemId}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Item deleted",
        description: "The shop item has been removed."
      });
      setItemDetailsDialogOpen(false);
      setSelectedItem(null);
      queryClient.invalidateQueries({ queryKey: ['/api/shop'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle create item submission
  const onSubmit = (data: ShopFormValues) => {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    formData.append('price', data.price);
    formData.append('image', data.image[0]);
    
    createItemMutation.mutate(formData);
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  // Filter shop items
  const filteredItems = shopItems
    .filter((item: any) => {
      // Search query filter
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Category filter (mock - would be implemented with real categories)
      if (categoryFilter !== "all") {
        // For now, just filtering based on price as a mock categorization
        if (categoryFilter === "collectibles" && item.price < 100) return false;
        if (categoryFilter === "crafts" && (item.price < 100 || item.price > 500)) return false;
        if (categoryFilter === "gadgets" && (item.price < 500 || item.price > 1000)) return false;
        if (categoryFilter === "vintage" && item.price < 1000) return false;
      }
      
      // Price filter
      if (priceFilter === "under100" && item.price >= 100) return false;
      if (priceFilter === "100to500" && (item.price < 100 || item.price > 500)) return false;
      if (priceFilter === "500to1000" && (item.price < 500 || item.price > 1000)) return false;
      if (priceFilter === "over1000" && item.price <= 1000) return false;
      
      return true;
    })
    .sort((a: any, b: any) => {
      // Sort order
      if (sortOrder === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      
      if (sortOrder === "priceAsc") {
        return a.price - b.price;
      }
      
      if (sortOrder === "priceDesc") {
        return b.price - a.price;
      }
      
      // Default: sort by newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Preview file before upload
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a preview URL for the selected file
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Clean up the preview URL when component unmounts
      return () => URL.revokeObjectURL(url);
    }
  };

  // Check if user can delete item (owner or admin)
  const canDeleteItem = (item: any) => {
    return user?.id === item.sellerId || user?.rank === 'Banson';
  };

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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-2xl font-bold">Shop</h2>
              <div className="flex space-x-2">
                <Button onClick={() => setCreateItemDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>List Item</span>
                </Button>
                <Button variant="outline" size="icon" className="relative">
                  <ShoppingBag className="h-5 w-5" />
                  {cartItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {cartItems.length}
                    </span>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Shop Filters */}
            <Card className="bg-card/30 backdrop-blur-lg">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Input
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="collectibles">Collectibles</SelectItem>
                        <SelectItem value="crafts">Crafts</SelectItem>
                        <SelectItem value="gadgets">Gadgets</SelectItem>
                        <SelectItem value="vintage">Vintage</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={priceFilter} onValueChange={setPriceFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Price: Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Price: Any</SelectItem>
                        <SelectItem value="under100">Under 100 PS</SelectItem>
                        <SelectItem value="100to500">100-500 PS</SelectItem>
                        <SelectItem value="500to1000">500-1000 PS</SelectItem>
                        <SelectItem value="over1000">Over 1000 PS</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by: Newest" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Sort by: Newest</SelectItem>
                        <SelectItem value="priceAsc">Price: Low to High</SelectItem>
                        <SelectItem value="priceDesc">Price: High to Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Shop Items */}
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-20 w-20 bg-accent/50 rounded-full flex items-center justify-center mb-4">
                  <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No items found</h3>
                <p className="text-muted-foreground mt-2">
                  Try adjusting your search filters or check back later for new listings
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all");
                    setPriceFilter("any");
                    setSortOrder("newest");
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredItems.map((item: any) => (
                  <Card 
                    key={item.id} 
                    className="bg-card/30 backdrop-blur-lg overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/20"
                  >
                    <div className="relative">
                      <img 
                        src={item.imagePath} 
                        alt={item.title} 
                        className="w-full h-48 object-cover cursor-pointer"
                        onClick={() => {
                          setSelectedItem(item);
                          setItemDetailsDialogOpen(true);
                        }}
                      />
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'available' 
                          ? 'bg-green-500 text-white' 
                          : item.status === 'low-stock' 
                            ? 'bg-amber-500 text-white' 
                            : 'bg-destructive text-white'
                      }`}>
                        {item.status === 'available' 
                          ? 'Available' 
                          : item.status === 'low-stock' 
                            ? 'Low Stock' 
                            : 'Sold Out'
                        }
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-lg" title={item.title}>
                        {item.title.length > 20 ? item.title.substring(0, 20) + '...' : item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2" title={item.description}>
                        {item.description || "No description provided"}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center text-sm">
                          <Coins className="text-primary mr-1 h-4 w-4" />
                          <span className="font-bold">{item.price}</span>
                          <span className="ml-1 text-muted-foreground">Pocket Sniffles</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Avatar className="w-5 h-5 mr-1">
                            <AvatarFallback className="text-xs bg-primary/20 text-primary">
                              {getInitials(item.sellerName || 'S')}
                            </AvatarFallback>
                          </Avatar>
                          <span>{item.sellerName || item.sellerUsername}</span>
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-3"
                        disabled={
                          item.status !== 'available' || 
                          item.sellerId === user.id || 
                          user.pocketSniffles < item.price
                        }
                        onClick={() => {
                          setSelectedItem(item);
                          setPurchaseDialogOpen(true);
                        }}
                      >
                        {item.sellerId === user.id 
                          ? "Your Listing"
                          : item.status !== 'available'
                            ? "Sold Out"
                            : user.pocketSniffles < item.price
                              ? "Insufficient Funds"
                              : "Buy Now"
                        }
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {filteredItems.length > 0 && (
              <div className="flex justify-center mt-6">
                <div className="flex space-x-1">
                  <Button variant="outline" size="icon" disabled>
                    <span className="sr-only">Previous page</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>
                  <Button variant="default" size="icon" className="h-8 w-8">1</Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">2</Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">3</Button>
                  <Button variant="outline" size="icon">
                    <span className="sr-only">Next page</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Create Item Dialog */}
      <Dialog open={createItemDialogOpen} onOpenChange={setCreateItemDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>List New Item</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="image"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Item Image</FormLabel>
                    <FormControl>
                      <div className="grid w-full gap-1.5">
                        <Label htmlFor="image" className="sr-only">Image</Label>
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          {...rest}
                          onChange={(e) => {
                            onChange(e.target.files);
                            handleFileChange(e);
                          }}
                        />
                        {previewUrl && (
                          <div className="mt-2 rounded-md overflow-hidden border border-border">
                            <img
                              src={previewUrl}
                              alt="Preview"
                              className="max-h-[200px] w-full object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a title for your item" {...field} />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add a description..." 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (Pocket Sniffles)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="number" 
                          min="1" 
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
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setCreateItemDialogOpen(false);
                    form.reset();
                    setPreviewUrl(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createItemMutation.isPending}
                >
                  {createItemMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Listing"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Purchase Confirmation Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="rounded-md overflow-hidden border border-border w-16 h-16">
                  <img
                    src={selectedItem.imagePath}
                    alt={selectedItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-medium">{selectedItem.title}</h4>
                  <div className="flex items-center text-sm">
                    <Coins className="text-primary mr-1 h-4 w-4" />
                    <span className="font-bold">{selectedItem.price}</span>
                    <span className="ml-1 text-muted-foreground">Pocket Sniffles</span>
                  </div>
                </div>
              </div>
              
              <div className="rounded-md bg-primary/10 p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span>Your Balance:</span>
                  <span>{user.pocketSniffles} PS</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Item Price:</span>
                  <span>- {selectedItem.price} PS</span>
                </div>
                <div className="pt-1 border-t border-border flex justify-between font-medium">
                  <span>Remaining Balance:</span>
                  <span>{user.pocketSniffles - selectedItem.price} PS</span>
                </div>
              </div>
              
              {user.pocketSniffles < selectedItem.price && (
                <div className="rounded-md bg-destructive/10 p-3 flex items-center text-sm">
                  <AlertTriangle className="h-4 w-4 mr-2 text-destructive" />
                  <span className="text-destructive">
                    You don't have enough Pocket Sniffles to make this purchase.
                  </span>
                </div>
              )}
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setPurchaseDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={() => purchaseItemMutation.mutate(selectedItem.id)}
                  disabled={
                    purchaseItemMutation.isPending || 
                    user.pocketSniffles < selectedItem.price
                  }
                >
                  {purchaseItemMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Purchase"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Item Details Dialog */}
      <Dialog open={itemDetailsDialogOpen} onOpenChange={setItemDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedItem && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>{selectedItem.title}</DialogTitle>
                  {canDeleteItem(selectedItem) && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteItemMutation.mutate(selectedItem.id)}
                      disabled={deleteItemMutation.isPending}
                    >
                      {deleteItemMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md overflow-hidden border border-border">
                  <img
                    src={selectedItem.imagePath}
                    alt={selectedItem.title}
                    className="w-full h-auto"
                  />
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedItem.title}</h3>
                    <div className="flex items-center text-sm mt-1">
                      <Coins className="text-primary mr-1 h-4 w-4" />
                      <span className="font-bold">{selectedItem.price}</span>
                      <span className="ml-1 text-muted-foreground">Pocket Sniffles</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>{selectedItem.description || "No description provided"}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={
                      selectedItem.status === 'available' 
                        ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                        : selectedItem.status === 'low-stock' 
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                          : 'bg-destructive/20 text-destructive'
                    }>
                      {selectedItem.status === 'available' 
                        ? 'Available' 
                        : selectedItem.status === 'low-stock' 
                          ? 'Low Stock' 
                          : 'Sold Out'
                      }
                    </Badge>
                    <Badge variant="outline" className="bg-primary/20 text-primary">
                      Listed: {format(new Date(selectedItem.createdAt), 'MMM dd, yyyy')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {getInitials(selectedItem.sellerName || 'S')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-2">
                      <div className="text-sm font-medium">{selectedItem.sellerName || selectedItem.sellerUsername}</div>
                      <div className="text-xs text-muted-foreground">{selectedItem.sellerUsername}@ratatoing</div>
                    </div>
                  </div>
                  
                  {selectedItem.status === 'available' && selectedItem.sellerId !== user.id && (
                    <Button 
                      className="w-full mt-4"
                      disabled={user.pocketSniffles < selectedItem.price}
                      onClick={() => {
                        setItemDetailsDialogOpen(false);
                        setPurchaseDialogOpen(true);
                      }}
                    >
                      {user.pocketSniffles < selectedItem.price ? "Insufficient Funds" : "Buy Now"}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
