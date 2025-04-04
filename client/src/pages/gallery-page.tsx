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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Heart, 
  Download, 
  Loader2, 
  Filter,
  Trash,
  Play
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Label } from "@/components/ui/label";

// Gallery form schema
const galleryItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  media: z.instanceof(FileList).refine(files => files.length === 1, "Media file is required")
});

type GalleryFormValues = z.infer<typeof galleryItemSchema>;

export default function GalleryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'images' | 'videos' | 'my-uploads' | 'featured'>('all');
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Form for uploading new media
  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(galleryItemSchema),
    defaultValues: {
      title: "",
      description: ""
    }
  });

  // Fetch all media
  const { data: galleryItems = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/gallery'],
    queryFn: async () => {
      const response = await fetch('/api/gallery');
      if (!response.ok) throw new Error('Failed to fetch gallery items');
      return response.json();
    },
    enabled: !!user
  });

  // Fetch user media
  const { data: userMedia = [] } = useQuery({
    queryKey: ['/api/gallery/user', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/gallery/user/${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch user media');
      return response.json();
    },
    enabled: !!user && filter === 'my-uploads'
  });

  // Upload media mutation
  const uploadMediaMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        body: data,
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to upload media');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload successful",
        description: "Your media has been uploaded to the gallery."
      });
      form.reset();
      setUploadDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gallery/user', user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete media mutation
  const deleteMediaMutation = useMutation({
    mutationFn: async (mediaId: number) => {
      const res = await apiRequest("DELETE", `/api/gallery/${mediaId}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Media deleted",
        description: "The media has been removed from the gallery."
      });
      setSelectedMedia(null);
      setViewDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gallery/user', user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle upload submission
  const onSubmit = (data: GalleryFormValues) => {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    formData.append('media', data.media[0]);
    
    uploadMediaMutation.mutate(formData);
  };

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
    return format(new Date(dateString), 'MMMM dd, yyyy');
  };

  // Get filtered media items
  const getFilteredMedia = () => {
    if (filter === 'all') return galleryItems;
    if (filter === 'images') return galleryItems.filter((item: any) => item.type === 'image');
    if (filter === 'videos') return galleryItems.filter((item: any) => item.type === 'video');
    if (filter === 'my-uploads') return userMedia;
    if (filter === 'featured') return galleryItems.filter((item: any) => item.featured); // This would be set by admins
    
    return galleryItems;
  };

  // Check if user can delete media (owner or admin)
  const canDeleteMedia = (mediaItem: any) => {
    return user?.id === mediaItem.userId || user?.rank === 'Banson';
  };

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

  // Pattern for cheese background
  const cheesePatternStyle = {
    backgroundImage: "radial-gradient(rgba(255, 199, 44, 0.15) 2px, transparent 2px)",
    backgroundSize: "24px 24px",
  };

  if (!user) return null;
  
  const filteredMedia = getFilteredMedia();
  
  return (
    <div className="min-h-screen bg-background transition-colors" style={cheesePatternStyle}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <MobileHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="container mx-auto p-4 md:p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-2xl font-bold">Media Gallery</h2>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                <span>Upload New</span>
              </Button>
            </div>
            
            {/* Gallery Filters */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={filter === 'all' ? 'default' : 'outline'} 
                size="sm" 
                className="rounded-full"
                onClick={() => setFilter('all')}
              >
                All Media
              </Button>
              <Button 
                variant={filter === 'images' ? 'default' : 'outline'} 
                size="sm" 
                className="rounded-full"
                onClick={() => setFilter('images')}
              >
                Images
              </Button>
              <Button 
                variant={filter === 'videos' ? 'default' : 'outline'} 
                size="sm" 
                className="rounded-full"
                onClick={() => setFilter('videos')}
              >
                Videos
              </Button>
              <Button 
                variant={filter === 'my-uploads' ? 'default' : 'outline'} 
                size="sm" 
                className="rounded-full"
                onClick={() => setFilter('my-uploads')}
              >
                My Uploads
              </Button>
              <Button 
                variant={filter === 'featured' ? 'default' : 'outline'} 
                size="sm" 
                className="rounded-full"
                onClick={() => setFilter('featured')}
              >
                Featured
              </Button>
            </div>
            
            {/* Gallery Grid */}
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-20 w-20 bg-accent/50 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No media found</h3>
                <p className="text-muted-foreground mt-2">
                  {filter === 'my-uploads' 
                    ? "You haven't uploaded any media yet" 
                    : "No media matching the selected filter"
                  }
                </p>
                {filter === 'my-uploads' && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    Upload your first media
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredMedia.map((item: any) => (
                  <Card 
                    key={item.id} 
                    className="bg-card/30 backdrop-blur-lg overflow-hidden transition-transform hover:scale-105"
                  >
                    <div className="relative">
                      <div className="w-full h-48 bg-accent/50 flex items-center justify-center">
                        {item.type === 'image' ? (
                          <img 
                            src={item.path} 
                            alt={item.title} 
                            className="w-full h-full object-cover"
                            onClick={() => {
                              setSelectedMedia(item);
                              setViewDialogOpen(true);
                            }}
                          />
                        ) : (
                          <div 
                            className="w-full h-full bg-black flex items-center justify-center cursor-pointer"
                            onClick={() => {
                              setSelectedMedia(item);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Play className="h-12 w-12 text-white opacity-80" />
                          </div>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium truncate" title={item.title}>{item.title}</h3>
                        <Badge variant="outline" className={
                          item.type === 'image' 
                            ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                            : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                        }>
                          {item.type === 'image' ? 'Image' : 'Video'}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Avatar className="w-5 h-5 mr-2">
                          <AvatarFallback className="text-xs bg-primary/20 text-primary">
                            {getInitials(item.userName || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{item.userName || item.username}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span>{formatDate(item.createdAt)}</span>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Heart className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Load More Button */}
            {filteredMedia.length > 0 && (
              <div className="flex justify-center mt-6">
                <Button variant="outline">
                  <Loader2 className="mr-2 h-4 w-4" />
                  Load More
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="media"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Media File (Max 15MB)</FormLabel>
                    <FormControl>
                      <div className="grid w-full gap-1.5">
                        <Label htmlFor="media" className="sr-only">Media</Label>
                        <Input
                          id="media"
                          type="file"
                          accept="image/*,video/*"
                          {...rest}
                          onChange={(e) => {
                            onChange(e.target.files);
                            handleFileChange(e);
                          }}
                        />
                        {previewUrl && (
                          <div className="mt-2 rounded-md overflow-hidden border border-border">
                            {previewUrl.startsWith('blob:') && previewUrl.includes('image') ? (
                              <img
                                src={previewUrl}
                                alt="Preview"
                                className="max-h-[200px] w-full object-contain"
                              />
                            ) : (
                              <div className="h-[200px] bg-accent/50 flex items-center justify-center">
                                <Video className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
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
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a title for your media" {...field} />
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
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setUploadDialogOpen(false);
                    form.reset();
                    setPreviewUrl(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploadMediaMutation.isPending}
                >
                  {uploadMediaMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* View Media Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[800px] h-auto max-h-[90vh] overflow-y-auto">
          {selectedMedia && (
            <>
              <DialogHeader className="flex justify-between items-center">
                <DialogTitle>{selectedMedia.title}</DialogTitle>
                {canDeleteMedia(selectedMedia) && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteMediaMutation.mutate(selectedMedia.id)}
                    disabled={deleteMediaMutation.isPending}
                  >
                    {deleteMediaMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </>
                    )}
                  </Button>
                )}
              </DialogHeader>
              
              <div className="mt-4">
                {selectedMedia.type === 'image' ? (
                  <img 
                    src={selectedMedia.path} 
                    alt={selectedMedia.title} 
                    className="w-full max-h-[500px] object-contain rounded-md"
                  />
                ) : (
                  <video 
                    src={selectedMedia.path} 
                    controls 
                    className="w-full max-h-[500px] rounded-md"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
              
              <div className="mt-4">
                <div className="flex items-center mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {getInitials(selectedMedia.userName || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <div className="font-medium">{selectedMedia.userName || selectedMedia.username}</div>
                    <div className="text-sm text-muted-foreground">
                      Uploaded on {formatDate(selectedMedia.createdAt)}
                    </div>
                  </div>
                </div>
                
                {selectedMedia.description && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {selectedMedia.description}
                  </div>
                )}
              </div>
              
              <DialogFooter className="gap-2 sm:gap-0">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Heart className="h-4 w-4 mr-2" />
                    Like
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
