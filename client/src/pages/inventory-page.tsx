import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ShopItem } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, DollarSign, LucideShoppingBag, RefreshCw, Ban } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";

export default function InventoryPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [resellPrice, setResellPrice] = useState<string>("");
  const [isReselling, setIsReselling] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch user's inventory
  const { data: inventory, isLoading } = useQuery<ShopItem[]>({
    queryKey: ["/api/inventory"],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Resell item mutation
  const resellMutation = useMutation({
    mutationFn: async ({ itemId, price }: { itemId: number; price: number }) => {
      const res = await apiRequest("POST", `/api/inventory/${itemId}/resell`, { price });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your item has been listed for resale",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shop"] });
      setIsReselling(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleResellClick = (item: ShopItem) => {
    setSelectedItem(item);
    // Set initial price to original purchase price or higher
    setResellPrice(item.originalPrice?.toString() || item.price.toString());
    setIsReselling(true);
  };

  const handleResellSubmit = () => {
    if (!selectedItem) return;
    
    const price = parseInt(resellPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }

    if (selectedItem.originalPrice && price < selectedItem.originalPrice) {
      toast({
        title: "Price too low",
        description: "Resell price must be at least the original purchase price",
        variant: "destructive",
      });
      return;
    }

    resellMutation.mutate({ itemId: selectedItem.id, price });
  };

  if (!user) return null;

  // Pattern for cheese background
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
                <h1 className="text-3xl font-bold tracking-tight">My Inventory</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your purchased items and list them for resale
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/inventory"] })}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : inventory && inventory.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center">
                  <LucideShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Your inventory is empty</h3>
                  <p className="text-muted-foreground mt-1">
                    Items you purchase will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inventory?.map((item) => (
                  <Card key={item.id} className="overflow-hidden flex flex-col h-full">
                    <div className="aspect-square w-full relative overflow-hidden">
                      <img
                        src={item.imagePath}
                        alt={item.title}
                        className="object-cover w-full h-full transition-all hover:scale-105"
                      />
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg line-clamp-1">{item.title}</CardTitle>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {item.price}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow pb-0">
                      <div className="text-sm text-muted-foreground">
                        <p>Purchased: {item.soldAt && formatDistanceToNow(new Date(item.soldAt), { addSuffix: true })}</p>
                        {item.originalPrice && (
                          <p>Original price: <span className="font-medium">{item.originalPrice}</span> Pocket Sniffles</p>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-4">
                      <Button 
                        onClick={() => handleResellClick(item)} 
                        className="w-full"
                        variant="outline"
                      >
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        Resell Item
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Resell Dialog */}
            <Dialog open={isReselling} onOpenChange={setIsReselling}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Resell Item</DialogTitle>
                  <DialogDescription>
                    Set a price for your item. The price must be at least the original purchase price.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {selectedItem && (
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 overflow-hidden rounded-md">
                        <img 
                          src={selectedItem.imagePath} 
                          alt={selectedItem.title} 
                          className="object-cover w-full h-full" 
                        />
                      </div>
                      <div>
                        <h3 className="font-medium">{selectedItem.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Original price: {selectedItem.originalPrice || selectedItem.price} Pocket Sniffles
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="resellPrice">Resell Price (Pocket Sniffles)</Label>
                    <Input
                      id="resellPrice"
                      type="number"
                      value={resellPrice}
                      onChange={(e) => setResellPrice(e.target.value)}
                      min={selectedItem?.originalPrice || 1}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsReselling(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleResellSubmit} 
                    disabled={resellMutation.isPending}
                  >
                    {resellMutation.isPending ? "Listing..." : "List for Sale"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </main>
    </div>
  );
}