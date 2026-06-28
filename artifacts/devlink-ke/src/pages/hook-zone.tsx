import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/contexts/user-context";
import { Zap, Hash, Users, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type HookZoneConnection = {
  id: number;
  partner: {
    id: number;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    level: string;
  } | null;
  room: {
    id: number;
    name: string;
    description: string | null;
  } | null;
  createdAt: string;
};

function useHookZone() {
  return useQuery<HookZoneConnection[]>({
    queryKey: ["/api/collab-requests/hook-zone"],
    queryFn: async () => {
      const res = await fetch("/api/collab-requests/hook-zone", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 30_000,
  });
}

export function useHookZoneCount() {
  const { data } = useQuery<HookZoneConnection[]>({
    queryKey: ["/api/collab-requests/hook-zone"],
    queryFn: async () => {
      const res = await fetch("/api/collab-requests/hook-zone", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: false,
  });
  return data?.length ?? 0;
}

export default function HookZonePage() {
  const { currentUser } = useCurrentUser();
  const { data, isLoading } = useHookZone();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [creating, setCreating] = useState<Record<number, boolean>>({});

  const recreateRoom = async (connId: number) => {
    setCreating((p) => ({ ...p, [connId]: true }));
    try {
      const res = await fetch(`/api/collab-requests/hook-zone/${connId}/recreate-room`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        toast({ title: "Error", description: "Failed to create room", variant: "destructive" });
        return;
      }
      toast({ title: "Room created!", description: "Your hook room is ready." });
      qc.invalidateQueries({ queryKey: ["/api/collab-requests/hook-zone"] });
    } catch {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" });
    } finally {
      setCreating((p) => ({ ...p, [connId]: false }));
    }
  };

  if (!currentUser) return (
    <div className="container mx-auto px-4 py-20 text-center max-w-md">
      <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
      <h1 className="font-mono font-black text-xl mb-2">HOOK_ZONE</h1>
      <p className="text-muted-foreground text-sm mb-6">Sign in to see your hook connections.</p>
      <Link href="/new-profile"><Button className="rounded-none font-mono text-xs bg-primary text-primary-foreground">JOIN_DEVLINK_KE</Button></Link>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono text-primary tracking-widest border border-primary/30 px-2 py-0.5 bg-primary/5">HOOK_ZONE</span>
        </div>
        <h1 className="text-3xl font-black font-mono tracking-tight text-foreground">
          Hook_<span className="text-primary">Zone</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-2">Your active hook connections. Jump into a private room and build together.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-muted/20 border border-border animate-pulse" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="py-20 border border-dashed border-border text-center">
          <Zap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-mono font-bold text-sm">HOOK_ZONE_EMPTY</p>
          <p className="text-xs text-muted-foreground mt-1">No hook connections yet. Send a hook request and get accepted!</p>
          <Link href="/explore"><Button className="mt-4 rounded-none font-mono text-xs bg-primary text-primary-foreground">FIND_BUILDERS →</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((conn, i) => (
            <motion.div key={conn.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 p-4 bg-card border border-primary/20 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-primary" />
              <Link href={`/profile/${conn.partner?.id}`}>
                <div className="w-10 h-10 bg-muted border border-border flex items-center justify-center flex-shrink-0 hover:border-primary/40 transition-colors">
                  <span className="text-xs font-mono font-bold text-muted-foreground/70">
                    {(conn.partner?.displayName ?? "?").substring(0, 2).toUpperCase()}
                  </span>
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/profile/${conn.partner?.id}`}>
                    <span className="font-bold text-sm hover:text-primary transition-colors">{conn.partner?.displayName ?? "Unknown"}</span>
                  </Link>
                  <span className="text-[10px] font-mono text-muted-foreground">@{conn.partner?.username}</span>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border ${
                    conn.partner?.level === "pro"
                      ? "text-primary border-primary/30 bg-primary/5"
                      : conn.partner?.level === "intermediate"
                      ? "text-secondary border-secondary/30 bg-secondary/5"
                      : "text-muted-foreground border-border"
                  }`}>
                    {conn.partner?.level}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Zap className="h-3 w-3 text-primary" />
                  Hooked since {formatDistanceToNow(new Date(conn.createdAt), { addSuffix: true })}
                </p>
              </div>
              {conn.room ? (
                <Link href={`/rooms/${conn.room.id}`}>
                  <Button size="sm" className="rounded-none font-mono text-xs h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Hash className="h-3 w-3 mr-1" /> JOIN_ROOM
                  </Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none font-mono text-xs h-8 px-3 border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() => recreateRoom(conn.id)}
                  disabled={creating[conn.id]}
                >
                  {creating[conn.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : "CREATE_ROOM"}
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
