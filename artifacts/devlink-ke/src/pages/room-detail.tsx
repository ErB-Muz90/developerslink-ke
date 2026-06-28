import { useState, useRef, useEffect } from "react";
import {
  useGetRoom,
  useGetRoomPosts,
  useCreatePost,
  useJoinRoom,
  useUpvotePost,
  useDeleteRoom,
  getGetRoomPostsQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  Hash,
  Send,
  Sparkles,
  AlertCircle,
  MessageSquare,
  ChevronUp,
  Wifi,
  WifiOff,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useRoomSocket } from "@/hooks/use-room-socket";
import { useCurrentUser } from "@/contexts/user-context";

const ROOM_TYPE_COLOR: Record<string, string> = {
  discussion: "text-primary border-primary/30 bg-primary/5",
  project: "text-secondary border-secondary/30 bg-secondary/5",
  learning: "text-amber-400 border-amber-400/30 bg-amber-400/5",
};

export default function RoomDetail() {
  const params = useParams();
  const roomId = parseInt(params.id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser, isLoading: userLoading } = useCurrentUser();

  const [content, setContent] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [newPostIds, setNewPostIds] = useState<Set<number>>(new Set());
  const [joined, setJoined] = useState(false);

  const { isConnected, hasConnectedBefore } = useRoomSocket(joined ? roomId : 0, {
    userId: currentUser?.id,
  });

  const { data: room, isLoading: roomLoading } = useGetRoom(roomId, {
    query: { enabled: !!roomId, queryKey: ["/api/rooms", roomId] },
  });
  const { data: posts, isLoading: postsLoading } = useGetRoomPosts(
    { roomId },
    { query: { enabled: !!roomId, queryKey: getGetRoomPostsQueryKey({ roomId }) } }
  );

  const { data: membership } = useQuery({
    queryKey: ["/api/rooms", roomId, "membership"],
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${roomId}/membership`, { credentials: "include" });
      if (!res.ok) return { isMember: false };
      return res.json();
    },
    enabled: !!currentUser && !!roomId,
  });

  useEffect(() => {
    if (membership?.isMember && !joined) {
      setJoined(true);
    }
  }, [membership, joined]);

  const createPost = useCreatePost({
    mutation: {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: getGetRoomPostsQueryKey({ roomId }) });
        const previous = queryClient.getQueryData(getGetRoomPostsQueryKey({ roomId }));
        const optimisticPost = {
          id: -Date.now(),
          content: variables.data.content,
          roomId,
          authorId: currentUser?.id ?? null,
          author: currentUser ? {
            id: currentUser.id,
            displayName: currentUser.displayName,
            username: currentUser.username,
            level: currentUser.level,
            avatarUrl: currentUser.avatarUrl ?? null,
          } : null,
          upvotes: 0,
          isPinned: false,
          parentPostId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData(getGetRoomPostsQueryKey({ roomId }), (old: any[] | undefined) => {
          if (!old) return [optimisticPost];
          return [optimisticPost, ...old];
        });
        return { previous };
      },
      onSuccess: (post, _variables, context) => {
        setContent("");
        setNewPostIds((prev) => new Set(prev).add(post.id));
        queryClient.setQueryData(getGetRoomPostsQueryKey({ roomId }), (old: any[] | undefined) => {
          if (!old) return [post];
          const filtered = old.filter((p) => p.id < 0);
          if (filtered.some((p) => p.id === post.id)) return old;
          return [post, ...filtered];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      },
      onError: (_err, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(getGetRoomPostsQueryKey({ roomId }), context.previous);
        }
        toast({ title: "Error", description: "Failed to post message", variant: "destructive" });
      },
    },
  });

  const joinRoom = useJoinRoom({
    mutation: {
      onSuccess: () => {
        setJoined(true);
        queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomId, "membership"] });
        toast({ title: "Connected", description: "You are now connected to this room." });
      },
    },
  });

  const [, navigate] = useLocation();

  const deleteRoom = useDeleteRoom({
    mutation: {
      onSuccess: () => {
        toast({ title: "Room deleted", description: "The room has been removed." });
        queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
        queryClient.invalidateQueries({ queryKey: ["/api/rooms/live-activity"] });
        navigate("/rooms");
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Failed to delete";
        toast({ title: "Error", description: message, variant: "destructive" });
      },
    },
  });

  const handleDeleteRoom = () => {
    if (!confirm("Delete this room? This cannot be undone.")) return;
    deleteRoom.mutate({ id: roomId });
  };

  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);

  const isOwner = currentUser && room?.createdByUserId === currentUser.id;

  const handleAddLink = async () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    const currentLinks = (room as any)?.links ?? [];
    const updatedLinks = [...currentLinks, { label: newLinkLabel.trim(), url: newLinkUrl.trim() }];
    try {
      const res = await fetch(`/api/rooms/${roomId}/links`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-requested-with": "devlink-ke" },
        credentials: "include",
        body: JSON.stringify({ links: updatedLinks }),
      });
      if (!res.ok) throw new Error("Failed to add link");
      await queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomId] });
      setNewLinkLabel("");
      setNewLinkUrl("");
      setShowLinkForm(false);
      toast({ title: "Link added" });
    } catch {
      toast({ title: "Error", description: "Failed to add link", variant: "destructive" });
    }
  };

  const handleRemoveLink = async (index: number) => {
    const currentLinks = (room as any)?.links ?? [];
    const updatedLinks = currentLinks.filter((_: any, i: number) => i !== index);
    try {
      const res = await fetch(`/api/rooms/${roomId}/links`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-requested-with": "devlink-ke" },
        credentials: "include",
        body: JSON.stringify({ links: updatedLinks }),
      });
      if (!res.ok) throw new Error("Failed to remove link");
      await queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomId] });
      toast({ title: "Link removed" });
    } catch {
      toast({ title: "Error", description: "Failed to remove link", variant: "destructive" });
    }
  };

  const upvotePost = useUpvotePost();

  const handleSummarize = async () => {
    setIsSummarizing(true);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["/api/ai/summarize", roomId],
        queryFn: () => fetch(`/api/ai/summarize/${roomId}`).then((r) => r.json()),
        staleTime: 60_000,
      });
      setSummary(data);
    } catch {
      toast({ title: "Error", description: "Failed to generate summary", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handlePost = () => {
    if (!content.trim() || createPost.isPending) return;
    createPost.mutate({
      id: roomId,
      data: { content, authorId: currentUser?.id ?? undefined },
    });
  };

  const handleUpvote = (postId: number) => {
    upvotePost.mutate(
      { id: postId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRoomPostsQueryKey({ roomId }) });
        },
      }
    );
  };

  if (roomLoading) {
    return (
      <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-32 w-full mt-8" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold font-mono">ROOM_NOT_FOUND</h1>
        <p className="text-muted-foreground mt-2 mb-6">The room you're looking for doesn't exist.</p>
        <Link href="/rooms">
          <Button className="rounded-none font-mono">BACK_TO_ROOMS</Button>
        </Link>
      </div>
    );
  }

  const typeColorClass = ROOM_TYPE_COLOR[room.type] ?? "text-primary border-primary/30 bg-primary/5";

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 flex flex-col min-h-[85vh]">
          {/* Header */}
          <div className="border-b border-border/50 pb-5 mb-5">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-3">
              <Link href="/rooms" className="hover:text-foreground flex items-center gap-1 transition-colors">
                <ArrowLeft className="h-3 w-3" /> ROOMS
              </Link>
              <span>/</span>
              <span className={`px-1.5 py-0.5 border font-mono text-[10px] ${typeColorClass}`}>
                {room.type.toUpperCase()}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground font-mono tracking-tight flex items-center gap-2 flex-wrap">
                  <Hash className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                  {room.name}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{room.description}</p>
              </div>
              {joined && (
                <div
                  className={`flex items-center gap-1.5 text-[10px] font-mono flex-shrink-0 px-2 py-1 border ${
                    isConnected
                      ? "text-primary border-primary/30 bg-primary/5"
                      : "text-muted-foreground border-border/40"
                  }`}
                >
                  {isConnected ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <Wifi className="h-3 w-3" />
                      LIVE
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3" />
                      {hasConnectedBefore ? "RECONNECTING" : "CONNECTING"}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Posting as banner */}
          {currentUser && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 border border-primary/20 bg-primary/5 text-xs font-mono">
              <div className="w-5 h-5 bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-[8px]">{currentUser.displayName.substring(0, 2).toUpperCase()}</span>
              </div>
              <span className="text-muted-foreground">Posting as</span>
              <span className="text-primary font-semibold">{currentUser.displayName}</span>
              <span className={`ml-auto text-[9px] px-1 py-0.5 border font-mono ${
                currentUser.level === "pro"
                  ? "text-primary border-primary/30 bg-primary/5"
                  : currentUser.level === "intermediate"
                  ? "text-secondary border-secondary/30"
                  : "text-muted-foreground border-border"
              }`}>
                {currentUser.level.toUpperCase()}
              </span>
            </div>
          )}

          {/* AI Summary */}
          <AnimatePresence>
            {summary && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-5 p-4 border border-secondary/40 bg-secondary/5 relative"
              >
                <button
                  onClick={() => setSummary(null)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-lg leading-none"
                >
                  &times;
                </button>
                <h3 className="font-mono font-bold text-secondary flex items-center gap-2 mb-2 text-sm">
                  <Sparkles className="h-4 w-4" /> AI_SUMMARY
                </h3>
                <p className="text-sm text-foreground/90 mb-3 leading-relaxed">{summary.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                  {summary.keyTopics.map((topic: string, i: number) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 bg-secondary/10 text-secondary border border-secondary/20 font-mono"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Join prompt */}
          {!joined && (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border bg-muted/5 mb-5 min-h-[300px]">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="font-mono font-bold text-lg text-foreground">JOIN_THIS_ROOM</p>
              {!currentUser ? (
                <p className="text-sm text-muted-foreground mt-1 mb-6">Log in to join and participate in this room.</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1 mb-6">Click "JOIN_ROOM" to connect and participate.</p>
              )}
              <Button
                className="rounded-none font-mono bg-foreground text-background hover:bg-foreground/90"
                onClick={() => currentUser && joinRoom.mutate({ id: roomId })}
                disabled={!currentUser || joinRoom.isPending}
              >
                <Users className="w-4 h-4 mr-2" />
                {!currentUser ? "LOGIN_TO_JOIN" : joinRoom.isPending ? "JOINING..." : "JOIN_ROOM"}
              </Button>
            </div>
          )}

          {/* Messages */}
          {joined && <div className="flex-1 space-y-3 mb-5">
            {postsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : !posts || posts.length === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center border border-dashed border-border bg-muted/5">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground font-mono text-sm">NO_MESSAGES_YET</p>
                <p className="text-xs text-muted-foreground mt-1">Start the conversation below.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {[...posts].reverse().map((post) => {
                  const isNew = newPostIds.has(post.id);
                  const isOwn = currentUser && post.author?.id === currentUser.id;
                  return (
                    <motion.div
                      key={post.id}
                      initial={isNew ? { opacity: 0, y: 12, scale: 0.98 } : false}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25 }}
                      data-testid={`post-card-${post.id}`}
                      className={`p-4 bg-card border transition-colors ${
                        isOwn
                          ? "border-primary/25 bg-primary/3"
                          : "border-border hover:border-primary/20"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Link href={post.author?.id ? `/profile/${post.author.id}` : "#"}>
                            <div className="w-8 h-8 bg-muted flex items-center justify-center overflow-hidden hover:ring-1 hover:ring-primary transition-all cursor-pointer flex-shrink-0">
                              {post.author?.avatarUrl ? (
                                <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-mono text-muted-foreground">
                                  {post.author?.displayName?.substring(0, 2).toUpperCase() ?? "??"}
                                </span>
                              )}
                            </div>
                          </Link>
                          <div>
                            <Link href={post.author?.id ? `/profile/${post.author.id}` : "#"}>
                              <span className={`font-bold text-sm hover:text-primary cursor-pointer transition-colors ${isOwn ? "text-primary" : "text-foreground"}`}>
                                {post.author?.displayName ?? "Unknown User"}
                                {isOwn && <span className="ml-1.5 text-[9px] font-mono opacity-60">YOU</span>}
                              </span>
                            </Link>
                            <span className="text-[10px] font-mono text-muted-foreground ml-2">
                              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                            </span>
                            {post.author?.level && (
                              <span
                                className={`ml-2 text-[9px] px-1 py-0.5 font-mono border ${
                                  post.author.level === "pro"
                                    ? "text-primary border-primary/30 bg-primary/5"
                                    : post.author.level === "intermediate"
                                    ? "text-secondary border-secondary/30 bg-secondary/5"
                                    : "text-muted-foreground border-border"
                                }`}
                              >
                                {post.author.level.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUpvote(post.id)}
                          data-testid={`upvote-post-${post.id}`}
                          className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-primary transition-colors group/up"
                        >
                          <ChevronUp className="h-3.5 w-3.5 group-hover/up:-translate-y-0.5 transition-transform" />
                          {post.upvotes}
                        </button>
                      </div>
                      <div className="pl-10">
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {post.content}
                        </p>
                        {post.isPinned && (
                          <span className="mt-2 inline-block text-[9px] px-1.5 py-0.5 font-mono border border-amber-400/30 text-amber-400 bg-amber-400/5">
                            PINNED
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>}

          {/* Composer */}
          {joined && <div className="mt-auto border border-border bg-card focus-within:border-primary/60 transition-colors">
            {!currentUser && (
              <div className="px-3 py-2 border-b border-border/30 bg-muted/20 flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Select a profile in the navbar to post with your identity
                </span>
              </div>
            )}
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                currentUser
                  ? `Share your thoughts as ${currentUser.displayName}...`
                  : "Type your message here..."
              }
              className="min-h-[80px] resize-none border-0 focus-visible:ring-0 bg-transparent text-foreground p-3 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handlePost();
                }
              }}
              data-testid="input-post-content"
            />
            <div className="flex justify-between items-center px-3 pb-2 pt-1.5 border-t border-border/30">
              <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">
                Enter to send &middot; Shift+Enter for new line
              </span>
              <Button
                onClick={handlePost}
                disabled={!content.trim() || createPost.isPending}
                size="sm"
                className="rounded-none font-mono bg-primary text-primary-foreground hover:bg-primary/90 px-6 h-8 ml-auto"
                data-testid="button-send-post"
              >
                {createPost.isPending ? "SENDING..." : <><Send className="w-3 h-3 mr-2" /> SEND</>}
              </Button>
            </div>
          </div>}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 border border-border bg-card/50 space-y-2">
            {!joined ? (
              <Button
                className="w-full rounded-none font-mono bg-foreground text-background hover:bg-foreground/90 text-xs"
                onClick={() => currentUser && joinRoom.mutate({ id: roomId })}
                disabled={!currentUser || joinRoom.isPending}
                data-testid="button-join-room"
              >
                <Users className="w-3.5 h-3.5 mr-2" />
                {!currentUser ? "LOGIN_TO_JOIN" : joinRoom.isPending ? "JOINING..." : "JOIN_ROOM"}
              </Button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 border border-primary/30 bg-primary/5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-mono text-primary font-semibold flex-1">CONNECTED</span>
                <Wifi className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <Button
              variant="outline"
              className="w-full rounded-none font-mono border-secondary/40 text-secondary hover:bg-secondary/10 text-xs"
              onClick={handleSummarize}
              disabled={isSummarizing || (posts?.length ?? 0) < 3}
              data-testid="button-ai-summarize"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              {isSummarizing ? "SUMMARIZING..." : "AI_SUMMARIZE"}
            </Button>
            {(posts?.length ?? 0) < 3 && (
              <p className="text-[10px] text-center text-muted-foreground font-mono">Requires 3+ messages</p>
            )}
            {currentUser && room.createdByUserId === currentUser.id && (
              <Button
                variant="ghost"
                className="w-full rounded-none font-mono text-xs text-destructive border border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDeleteRoom}
                disabled={deleteRoom.isPending}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                {deleteRoom.isPending ? "DELETING..." : "DELETE_ROOM"}
              </Button>
            )}
          </div>

          <div className="p-4 border border-border bg-card">
            <h3 className="font-mono font-bold text-xs text-foreground mb-4 border-b border-border/50 pb-2 tracking-widest">
              ROOM_INFO
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">Type</div>
                <span className={`text-[10px] px-1.5 py-0.5 border font-mono ${typeColorClass}`}>
                  {room.type.toUpperCase()}
                </span>
              </div>
              <div>
                <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">Members</div>
                <div className="flex items-center text-sm font-semibold">
                  <Users className="w-3 h-3 mr-1.5 text-primary" />
                  {room.memberCount.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">Posts</div>
                <div className="text-sm font-semibold">{room.postCount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-muted-foreground mb-2 uppercase tracking-wider">Skills</div>
                <div className="flex flex-wrap gap-1">
                  {room.skills.length > 0 ? (
                    room.skills.map((skill) => (
                      <span key={skill} className="text-[10px] px-1.5 py-0.5 bg-muted text-foreground border border-border font-mono">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">None specified</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">Created</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(room.createdAt).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })}
                </div>
              </div>
            </div>
          </div>

          {(room as any).links?.length > 0 || (isOwner && room.type === "project") ? (
            <div className="p-4 border border-border bg-card">
              <h3 className="font-mono font-bold text-xs text-foreground mb-4 border-b border-border/50 pb-2 tracking-widest">
                LINKS
              </h3>
              <div className="space-y-2">
                {(room as any).links?.map((link: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-xs font-mono text-primary hover:underline truncate"
                    >
                      {link.label}
                    </a>
                    {isOwner && (
                      <button
                        onClick={() => handleRemoveLink(i)}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
                {isOwner && room.type === "project" && !showLinkForm && (
                  <button
                    onClick={() => setShowLinkForm(true)}
                    className="text-xs font-mono text-primary hover:text-primary/80 mt-2 flex items-center gap-1"
                  >
                    + ADD_LINK
                  </button>
                )}
                {isOwner && showLinkForm && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-border/50">
                    <input
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                      placeholder="Label (e.g. GitHub)"
                      className="w-full text-xs px-2 py-1 bg-background border border-border font-mono focus:outline-none focus:border-primary"
                    />
                    <input
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="URL (e.g. https://github.com/...)"
                      className="w-full text-xs px-2 py-1 bg-background border border-border font-mono focus:outline-none focus:border-primary"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={handleAddLink}
                        disabled={!newLinkLabel.trim() || !newLinkUrl.trim()}
                        className="flex-1 text-xs font-mono py-1 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        SAVE
                      </button>
                      <button
                        onClick={() => { setShowLinkForm(false); setNewLinkLabel(""); setNewLinkUrl(""); }}
                        className="text-xs font-mono py-1 px-2 text-muted-foreground hover:text-foreground"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

    </div>
  );
}
