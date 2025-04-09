import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from 
  "@/components/layout/mobile-header";
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
  Heart, 
  Loader2, 
  Gamepad2,
  MessageSquare,
  Trash2,
  Star
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
import { ExternalLink } from "lucide-react";
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

const gameSchema = z.discriminatedUnion("gameType", [
  z.object({
    gameType: z.literal("embedded"),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    gameContent: z.string().min(1, "Game code is required for embedded games"),
    thumbnail: z.instanceof(FileList).optional()
  }),
  z.object({
    gameType: z.literal("external"),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    gameContent: z.string().url("Valid URL is required for external games"),
    thumbnail: z.instanceof(FileList).optional()
  })
]);

type GameFormValues = z.infer<typeof gameSchema>;

export default function ArcadePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [createGameDialogOpen, setCreateGameDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("popular");
  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [gameDetailsDialogOpen, setGameDetailsDialogOpen] = useState(false);
  const [commentInput, setCommentInput] = useState("");

  const getInitials = (name: string) => {
    if (!name) return '';
    const nameParts = name.trim().split(' ');
    let initials = '';
    for (let part of nameParts) {
      if (part) {
        initials += part.charAt(0).toUpperCase();
      }
    }
    return initials || 'U'; // Default to 'U' if no initials
  };

  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      title: "",
      description: "",
      gameType: "embedded",
      gameContent: ""
    }
  });

  const gameType = form.watch("gameType");

  const { data: games = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/arcade'],
    queryFn: async () => {
      const response = await fetch('/api/arcade');
      if (!response.ok) throw new Error('Failed to fetch games');
      const data = await response.json();
      return data.map((game: any) => ({
        ...game,
        hasHearted: game.hasHearted || false
      }));
    },
    enabled: !!user
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['/api/arcade/comments', selectedGame?.id],
    queryFn: async () => {
      if (!selectedGame) return [];
      const response = await fetch(`/api/arcade/${selectedGame.id}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      return data.map((comment: any) => ({
        ...comment,
        user: {
          id: comment.userId,
          name: comment.name || comment.username,
          username: comment.username,
          profilePicture: comment.profilePicture
        }
      }));
    },
    enabled: !!selectedGame
  });

  const [isTogglingHeart, setIsTogglingHeart] = useState(false);

  const createGameMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        body: data,
        credentials: 'include'
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create game');
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Game created successfully",
        description: "Your game has been added to the arcade."
      });
      form.reset();
      setCreateGameDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/arcade'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create game",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/arcade/${selectedGame?.id}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Comment added",
        description: "Your comment has been posted."
      });
      setCommentInput("");
      queryClient.invalidateQueries({ queryKey: ['/api/arcade/comments', selectedGame?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add comment",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const toggleHeartMutation = useMutation({
    mutationFn: async (gameId: number) => {
      const res = await apiRequest("POST", `/api/arcade/${gameId}/heart`, {});
      return res.json();
    },
    onMutate: async (gameId) => {
      // Snapshot the previous state
      const previousGame = selectedGame;

      // Update selectedGame locally
      setSelectedGame((prev) => {
        if (!prev || prev.id !== gameId) return prev;
        const hasHearted = !prev.hasHearted; // Toggle like/unlike
        const hearts = hasHearted ? prev.hearts + 1 : prev.hearts - 1; // Adjust count locally
        return { ...prev, hasHearted, hearts };
      });

      return { previousGame };
    },
    onError: (error, gameId, context) => {
      // Rollback on error
      setSelectedGame(context?.previousGame);
      toast({
        title: "Failed to update like",
        description: error.message,
        variant: "destructive"
      });
    },
    onSuccess: () => {
      // No refetching or query invalidation—just trust the local update
      // Optionally show a success toast if you want
      // toast({ title: "Like updated" });
    },
  });

  const deleteGameMutation = useMutation({
    mutationFn: async (gameId: number) => {
      const res = await apiRequest("DELETE", `/api/arcade/${gameId}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Game deleted",
        description: "The game has been removed from the arcade."
      });
      setGameDetailsDialogOpen(false);
      setSelectedGame(null);
      queryClient.invalidateQueries({ queryKey: ['/api/arcade'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: GameFormValues) => {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    formData.append('gameType', data.gameType);
    formData.append('gameContent', data.gameContent || '');
    if (data.thumbnail?.[0]) formData.append('thumbnail', data.thumbnail[0]);

    createGameMutation.mutate(formData);
  };

  const filteredGames = games
    .filter((game: any) => {
      if (searchQuery && !game.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (categoryFilter !== "all" && game.category !== categoryFilter) {
        return false;
      }
      return true;
    })
    .sort((a: any, b: any) => {
      if (sortOrder === "popular") {
        return b.hearts - a.hearts;
      }
      if (sortOrder === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOrder === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return b.hearts - a.hearts;
    });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  };

  const canDeleteGame = (game: any) => {
    return user?.id === game.creatorId || user?.rank === 'Banson';
  };

  const arcadeGlowStyle = {
    backgroundImage: "radial-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px)",
    backgroundSize: "20px 20px",
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background transition-colors" style={arcadeGlowStyle}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <MobileHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="container mx-auto p-4 md:p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                Arcade
              </h2>
              {user.rank === 'Banson' && (
                <Button onClick={() => setCreateGameDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Add Game</span>
                </Button>
              )}
            </div>

            <Card className="bg-card/50 backdrop-blur-lg border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Input
                        placeholder="Search games..."
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
                        <SelectItem value="action">Action</SelectItem>
                        <SelectItem value="puzzle">Puzzle</SelectItem>
                        <SelectItem value="adventure">Adventure</SelectItem>
                        <SelectItem value="strategy">Strategy</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by: Popular" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="popular">Sort by: Popular</SelectItem>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-20 w-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                  <Gamepad2 className="h-10 w-10 text-blue-500" />
                </div>
                <h3 className="text-lg font-medium">No games found</h3>
                <p className="text-muted-foreground mt-2">
                  Try adjusting your search filters or check back later for new games
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all");
                    setSortOrder("popular");
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredGames.map((game: any) => (
                  <Card 
                    key={game.id} 
                    className="bg-card/50 backdrop-blur-lg border-blue-500/20 hover:border-blue-500/40 transition-all hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className="relative">
                      <img 
                        src={game.thumbnailPath} 
                        alt={game.title} 
                        className="w-full h-48 object-cover cursor-pointer rounded-t-lg"
                        onClick={() => {
                          setSelectedGame(game);
                          setGameDetailsDialogOpen(true);
                        }}
                      />
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-500">
                          {game.category}
                        </Badge>
                      </div>
                      <div className="absolute bottom-2 right-2 flex items-center space-x-1 bg-black/50 px-2 py-1 rounded-full">
                        <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                        <span className="text-white text-sm">{game.hearts}</span>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-lg" title={game.title}>
                        {game.title.length > 20 ? game.title.substring(0, 20) + '...' : game.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2" title={game.description}>
                        {game.description || "No description provided"}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          <span>{game.commentCount || 0} comments</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Avatar className="w-5 h-5 mr-1">
                            <AvatarImage src={game.creatorAvatar} />
                            <AvatarFallback className="text-xs bg-blue-500/20 text-blue-500">
                              {game.creatorName ? getInitials(game.creatorName) : 'G'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{game.creatorName || game.creatorUsername}</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        className="w-full mt-3 border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/10"
                        onClick={() => {
                          setSelectedGame(game);
                          setGameDetailsDialogOpen(true);
                        }}
                      >
                        <Gamepad2 className="mr-2 h-4 w-4" />
                        Play Game
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {filteredGames.length > 0 && (
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

      <Dialog open={createGameDialogOpen} onOpenChange={setCreateGameDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-blue-500">Add New Game</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="thumbnail"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Game Thumbnail (Optional)</FormLabel>
                    <FormControl>
                      <div className="grid w-full gap-1.5">
                        <Label htmlFor="thumbnail" className="sr-only">Thumbnail</Label>
                        <Input
                          id="thumbnail"
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
                    <FormLabel>Game Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your game title" {...field} />
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
                        placeholder="Describe your game..." 
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
                name="gameType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select game type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="embedded">Embedded Code</SelectItem>
                        <SelectItem value="external">External Link</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {gameType === "embedded" ? (
                <FormField
                  control={form.control}
                  name="gameContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game Code</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Paste your game HTML/JS code here..." 
                          className="resize-none font-mono text-sm h-40" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="gameContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/game" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setCreateGameDialogOpen(false);
                    form.reset();
                    setPreviewUrl(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createGameMutation.isPending}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {createGameMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Add Game"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={gameDetailsDialogOpen} onOpenChange={setGameDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          {selectedGame && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-blue-500">{selectedGame.title}</DialogTitle>
                  {canDeleteGame(selectedGame) && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteGameMutation.mutate(selectedGame.id)}
                      disabled={deleteGameMutation.isPending}
                    >
                      {deleteGameMutation.isPending ? (
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

              <div className="space-y-6">
                {/* Game Display Area */}
                <div className="rounded-lg overflow-hidden border border-blue-500/20 bg-black">
                  {selectedGame.gameType === "embedded" ? (
                    <div 
                      className="w-full h-[400px] overflow-auto"
                      dangerouslySetInnerHTML={{ __html: selectedGame.gameContent }}
                    />
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-muted-foreground mb-4">
                        This game is hosted externally. Click the button below to play it on the original site.
                      </p>
                      <Button 
                        onClick={() => window.open(selectedGame.gameContent, '_blank')}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Play on External Site
                      </Button>
                      {selectedGame.thumbnailPath && (
                        <div className="mt-4 rounded-md overflow-hidden border border-border">
                          <img
                            src={selectedGame.thumbnailPath}
                            alt={selectedGame.title}
                            className="w-full h-auto max-w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    {/* Game Info */}
                    <div>
                      <h3 className="font-semibold text-lg">{selectedGame.title}</h3>
                      <p className="text-muted-foreground mt-1">
                        {selectedGame.description || "No description provided"}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-500"
                          onClick={() => toggleHeartMutation.mutate(selectedGame.id)}
                          disabled={isTogglingHeart} // Disable while toggling
                        >
                          <Heart 
                            className="h-5 w-5 mr-1" 
                            fill={selectedGame.hasHearted ? "currentColor" : "none"} 
                          />
                          {selectedGame.hearts}
                        </Button>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        <span>{selectedGame.commentCount || 0} comments</span>
                      </div>
                      <Badge variant="outline">
                        Added: {selectedGame.createdAt && !isNaN(new Date(selectedGame.createdAt).getTime()) 
                          ? format(new Date(selectedGame.createdAt), 'MMM dd, yyyy') 
                          : 'Unknown Date'}
                      </Badge>
                    </div>

                    {/* Creator Info */}
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedGame.creatorAvatar} />
                        <AvatarFallback className="text-xs bg-blue-500/20 text-blue-500">
                          {selectedGame.creatorName ? getInitials(selectedGame.creatorName) : 'G'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-2">
                        <div className="text-sm font-medium">{selectedGame.creatorName || selectedGame.creatorUsername}</div>
                        <div className="text-xs text-muted-foreground">Game Creator</div>
                      </div>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Comments</h4>
                    {/* Add Comment */}
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Add a comment..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        className="resize-none"
                      />
                      <Button
                        size="sm"
                        onClick={() => addCommentMutation.mutate(commentInput)}
                        disabled={!commentInput.trim() || addCommentMutation.isPending}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        {addCommentMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Post Comment"
                        )}
                      </Button>
                    </div>
                    {/* Comments List */}
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                      {comments.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-4">
                          No comments yet. Be the first to comment!
                        </div>
                      ) : (
                        comments.map((comment: any) => (
                          <div key={comment.id} className="border-b border-border/50 pb-3 last:border-0">
                            <div className="flex items-start space-x-2">
                              <Avatar className="h-8 w-8 mt-1">
                                <AvatarImage src={comment.userAvatar} />
                                <AvatarFallback className="text-xs bg-blue-500/20 text-blue-500">
                                  {comment.name ? getInitials(comment.name) : comment.userName?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-sm font-medium">{comment.name || comment.userName}</span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                                    </span>
                                  </div>
                                  {(user.id === comment.userId || user.rank === 'Banson') && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-muted-foreground"
                                      onClick={() => {}}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                <p className="text-sm mt-1">{comment.content}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}