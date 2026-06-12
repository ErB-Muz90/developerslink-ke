import { useState } from "react";
import { useGetRoom, useGetRoomPosts, useCreatePost, useSummarizeRoom, useJoinRoom } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Users, Hash, Send, Sparkles, AlertCircle, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function RoomDetail() {
  const params = useParams();
  const roomId = parseInt(params.id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [content, setContent] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const { data: room, isLoading: roomLoading } = useGetRoom(roomId, { query: { enabled: !!roomId } });
  const { data: posts, isLoading: postsLoading } = useGetRoomPosts({ roomId }, { query: { enabled: !!roomId } });
  
  const createPost = useCreatePost({
    mutation: {
      onSuccess: () => {
        setContent("");
        queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomId, "posts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomId] });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to post message", variant: "destructive" });
      }
    }
  });

  const joinRoom = useJoinRoom({
    mutation: {
      onSuccess: () => {
        toast({ title: "Joined Room", description: "You are now a member of this room." });
        queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomId] });
      }
    }
  });

  const summarizeRoomFn = useSummarizeRoom({
    mutation: {
      onSuccess: (data) => {
        setSummary(data);
        setIsSummarizing(false);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to generate summary", variant: "destructive" });
        setIsSummarizing(false);
      }
    }
  });

  const handlePost = () => {
    if (!content.trim()) return;
    createPost.mutate({ 
      id: roomId,
      data: { content } 
    });
  };

  const handleSummarize = () => {
    setIsSummarizing(true);
    summarizeRoomFn.mutate({ id: roomId });
  };

  if (roomLoading) return (
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
  
  if (!room) return (
    <div className="container mx-auto px-4 py-16 text-center">
      <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
      <h1 className="text-2xl font-bold font-mono">ROOM_NOT_FOUND</h1>
      <p className="text-muted-foreground mt-2 mb-6">The room you're looking for doesn't exist or was removed.</p>
      <Link href="/rooms">
        <Button className="rounded-none font-mono">BACK_TO_ROOMS</Button>
      </Link>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-3 flex flex-col min-h-[80vh]">
          {/* Room Header */}
          <div className="border-b border-border/50 pb-6 mb-6">
            <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground mb-2">
              <Link href="/rooms" className="hover:text-foreground">ROOMS</Link>
              <span>/</span>
              <span className="text-primary">{room.type.toUpperCase()}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 font-mono tracking-tight flex items-center gap-3">
              <Hash className="h-8 w-8 text-muted-foreground" />
              {room.name}
            </h1>
            <p className="text-lg text-muted-foreground">{room.description}</p>
          </div>

          {/* AI Summary Section (if triggered) */}
          {summary && (
            <div className="mb-6 p-4 border border-secondary/50 bg-secondary/5 relative">
              <div className="absolute top-0 right-0 p-2">
                <Button variant="ghost" size="sm" onClick={() => setSummary(null)} className="h-6 w-6 p-0 rounded-none">&times;</Button>
              </div>
              <h3 className="font-mono font-bold text-secondary flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4" /> AI_SUMMARY
              </h3>
              <p className="text-sm text-foreground/90 mb-3">{summary.summary}</p>
              <div className="flex flex-wrap gap-2">
                {summary.keyTopics.map((topic: string, i: number) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 bg-secondary/10 text-secondary border border-secondary/20 font-mono">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 space-y-4 mb-6 pb-6">
            {postsLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : posts?.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center border border-dashed border-border bg-muted/5">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground font-mono text-sm">NO_MESSAGES_YET</p>
                <p className="text-xs text-muted-foreground mt-1">Start the conversation below.</p>
              </div>
            ) : (
              posts?.map(post => (
                <div key={post.id} className="p-4 bg-card border border-border group hover:border-border/80 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-none bg-muted flex items-center justify-center overflow-hidden">
                        {post.author?.avatarUrl ? (
                          <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-mono text-muted-foreground">
                            {post.author?.displayName?.substring(0, 2).toUpperCase() || "??"}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-sm text-foreground hover:text-primary cursor-pointer transition-colors">
                          {post.author?.displayName || "Unknown User"}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground ml-2">
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="pl-10">
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{post.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Composer */}
          <div className="mt-auto border border-border bg-card p-2 relative focus-within:border-primary transition-colors">
            <Textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message here..."
              className="min-h-[80px] resize-none border-0 focus-visible:ring-0 bg-transparent text-foreground p-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePost();
                }
              }}
            />
            <div className="flex justify-between items-center mt-2 px-2 pb-1 border-t border-border/30 pt-2">
              <span className="text-[10px] font-mono text-muted-foreground">Press Enter to send, Shift+Enter for new line</span>
              <Button 
                onClick={handlePost} 
                disabled={!content.trim() || createPost.isPending}
                size="sm"
                className="rounded-none font-mono bg-primary text-primary-foreground hover:bg-primary/90 px-6 h-8"
              >
                {createPost.isPending ? "SENDING..." : <><Send className="w-3 h-3 mr-2" /> SEND</>}
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Action Card */}
          <div className="p-4 border border-border bg-card/50">
            <Button 
              className="w-full rounded-none font-mono mb-3 bg-foreground text-background hover:bg-foreground/90"
              onClick={() => joinRoom.mutate({ id: roomId })}
              disabled={joinRoom.isPending}
            >
              <Users className="w-4 h-4 mr-2" /> JOIN_ROOM
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full rounded-none font-mono border-secondary text-secondary hover:bg-secondary/10"
              onClick={handleSummarize}
              disabled={isSummarizing || (posts?.length || 0) < 3}
            >
              <Sparkles className="w-4 h-4 mr-2" /> {isSummarizing ? "SUMMARIZING..." : "AI_SUMMARIZE"}
            </Button>
            {(posts?.length || 0) < 3 && (
              <p className="text-[10px] text-center mt-2 text-muted-foreground font-mono">Requires at least 3 messages</p>
            )}
          </div>

          {/* Info Card */}
          <div className="p-4 border border-border bg-card">
            <h3 className="font-mono font-bold text-sm text-foreground mb-4 border-b border-border/50 pb-2">ROOM_INFO</h3>
            
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase">Members</div>
                <div className="flex items-center text-sm font-medium"><Users className="w-3 h-3 mr-1.5 text-primary" /> {room.memberCount} active</div>
              </div>
              
              <div>
                <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase">Created</div>
                <div className="text-sm">{new Date(room.createdAt).toLocaleDateString()}</div>
              </div>
              
              <div>
                <div className="text-[10px] font-mono text-muted-foreground mb-2 uppercase">Required Skills</div>
                <div className="flex flex-wrap gap-1">
                  {room.skills.length > 0 ? room.skills.map(skill => (
                    <span key={skill} className="text-[10px] px-1.5 py-0.5 bg-muted text-foreground border border-border font-mono">
                      {skill}
                    </span>
                  )) : (
                    <span className="text-xs text-muted-foreground italic">None specified</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
