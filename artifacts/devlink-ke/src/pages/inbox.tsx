import { useState, type ReactElement } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/contexts/user-context";
import {
  Zap, Check, X, Clock, Users, ArrowRight, Inbox, Send,
  ChevronRight, Loader2, MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type CollabRequest = {
  id: number;
  fromUserId?: number;
  toUserId?: number;
  message: string | null;
  status: string;
  createdAt: string;
  displayName: string | null;
  username: string | null;
};

function useIncoming() {
  return useQuery<CollabRequest[]>({
    queryKey: ["/api/collab-requests/incoming"],
    queryFn: async () => {
      const res = await fetch("/api/collab-requests/incoming", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}

function useSent() {
  return useQuery<CollabRequest[]>({
    queryKey: ["/api/collab-requests/sent"],
    queryFn: async () => {
      const res = await fetch("/api/collab-requests/sent", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}

function StatusChip({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string; icon: ReactElement }> = {
    pending:  { cls: "text-amber-400 border-amber-400/30 bg-amber-400/5",  label: "PENDING",  icon: <Clock className="h-2.5 w-2.5" /> },
    accepted: { cls: "text-primary border-primary/30 bg-primary/5",        label: "ACCEPTED", icon: <Check className="h-2.5 w-2.5" /> },
    declined: { cls: "text-muted-foreground border-border bg-muted/20",    label: "DECLINED", icon: <X className="h-2.5 w-2.5" />    },
  };
  const { cls, label, icon } = cfg[status] ?? cfg.pending;
  return (
    <span className={`flex items-center gap-1 text-[9px] font-mono font-bold border px-2 py-0.5 ${cls}`}>
      {icon} {label}
    </span>
  );
}

function IncomingTab() {
  const { data, isLoading } = useIncoming();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [acting, setActing] = useState<Record<number, boolean>>({});

  const act = async (id: number, action: "accept" | "decline") => {
    setActing((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/collab-requests/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json();
        toast({ title: "Error", description: body.error, variant: "destructive" });
        return;
      }
      toast({
        title: action === "accept" ? "Accepted! 🎉" : "Declined",
        description: action === "accept" ? "Connection made — go build something." : "Request declined.",
      });
      qc.invalidateQueries({ queryKey: ["/api/collab-requests/incoming"] });
    } finally {
      setActing((p) => ({ ...p, [id]: false }));
    }
  };

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted/20 border border-border animate-pulse" />)}
    </div>
  );

  const pending  = data?.filter((r) => r.status === "pending") ?? [];
  const resolved = data?.filter((r) => r.status !== "pending") ?? [];

  if (!data || data.length === 0) return (
    <div className="py-20 border border-dashed border-border text-center">
      <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="font-mono font-bold text-sm">INBOX_EMPTY</p>
      <p className="text-xs text-muted-foreground mt-1">No one has sent you a collab request yet.</p>
      <Link href="/explore"><Button className="mt-4 rounded-none font-mono text-xs bg-primary text-primary-foreground">FIND_BUILDERS →</Button></Link>
    </div>
  );

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">PENDING — {pending.length}</p>
          <div className="space-y-3">
            <AnimatePresence>
              {pending.map((req, i) => (
                <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.04 }}
                  className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 bg-card border border-primary/20 relative overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-primary" />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Link href={`/profile/${req.fromUserId}`}>
                      <div className="w-10 h-10 bg-muted border border-border flex items-center justify-center flex-shrink-0 hover:border-primary/40 transition-colors">
                        <span className="text-xs font-mono font-bold text-muted-foreground/70">
                          {(req.displayName ?? "?").substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    </Link>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/profile/${req.fromUserId}`}>
                          <span className="font-bold text-sm hover:text-primary transition-colors">{req.displayName ?? "Unknown"}</span>
                        </Link>
                        <span className="text-[10px] font-mono text-muted-foreground">@{req.username}</span>
                        <span className="text-[10px] font-mono text-muted-foreground/50">
                          {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {req.message && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5">
                          <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary/60" />
                          <span className="italic">"{req.message}"</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" variant="ghost"
                      className="rounded-none font-mono text-xs h-8 px-3 border border-border/50 hover:border-destructive/30 hover:text-destructive"
                      onClick={() => act(req.id, "decline")} disabled={acting[req.id]}>
                      {acting[req.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <><X className="h-3 w-3 mr-1" /> DECLINE</>}
                    </Button>
                    <Button size="sm"
                      className="rounded-none font-mono text-xs h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => act(req.id, "accept")} disabled={acting[req.id]}>
                      {acting[req.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" /> ACCEPT</>}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">RESOLVED — {resolved.length}</p>
          <div className="space-y-2">
            {resolved.map((req) => (
              <div key={req.id} className="flex items-center gap-3 p-4 bg-card border border-border/40">
                <Link href={`/profile/${req.fromUserId}`}>
                  <div className="w-8 h-8 bg-muted border border-border flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground/50">
                      {(req.displayName ?? "?").substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-muted-foreground">{req.displayName}</span>
                  <span className="text-[10px] font-mono text-muted-foreground/50 ml-2">@{req.username}</span>
                </div>
                <StatusChip status={req.status} />
                <Link href={`/profile/${req.fromUserId}`}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 hover:text-primary transition-colors" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SentTab() {
  const { data, isLoading } = useSent();

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2].map((i) => <div key={i} className="h-20 bg-muted/20 border border-border animate-pulse" />)}
    </div>
  );

  if (!data || data.length === 0) return (
    <div className="py-20 border border-dashed border-border text-center">
      <Send className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="font-mono font-bold text-sm">NO_REQUESTS_SENT</p>
      <p className="text-xs text-muted-foreground mt-1">Browse the directory and hit Hook Up on a builder.</p>
      <Link href="/explore"><Button className="mt-4 rounded-none font-mono text-xs bg-primary text-primary-foreground">EXPLORE_BUILDERS →</Button></Link>
    </div>
  );

  return (
    <div className="space-y-2">
      {data.map((req, i) => (
        <motion.div key={req.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          className="flex items-center gap-3 p-4 bg-card border border-border">
          <Link href={`/profile/${req.toUserId}`}>
            <div className="w-8 h-8 bg-muted border border-border flex items-center justify-center flex-shrink-0 hover:border-primary/40 transition-colors">
              <span className="text-[10px] font-mono font-bold text-muted-foreground/70">
                {(req.displayName ?? "?").substring(0, 2).toUpperCase()}
              </span>
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/profile/${req.toUserId}`}>
                <span className="font-medium text-sm hover:text-primary transition-colors">{req.displayName ?? "Unknown"}</span>
              </Link>
              <span className="text-[10px] font-mono text-muted-foreground/50">
                {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
              </span>
            </div>
            {req.message && (
              <p className="text-[11px] text-muted-foreground/60 mt-0.5 italic truncate">"{req.message}"</p>
            )}
          </div>
          <StatusChip status={req.status} />
          <Link href={`/profile/${req.toUserId}`}>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 hover:text-primary transition-colors" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

export default function InboxPage() {
  const { currentUser } = useCurrentUser();
  const [tab, setTab] = useState<"incoming" | "sent">("incoming");
  const { data: incoming } = useIncoming();

  const pendingCount = incoming?.filter((r) => r.status === "pending").length ?? 0;

  if (!currentUser) return (
    <div className="container mx-auto px-4 py-20 text-center max-w-md">
      <Inbox className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
      <h1 className="font-mono font-black text-xl mb-2">COLLAB_INBOX</h1>
      <p className="text-muted-foreground text-sm mb-6">Sign in to see your collab requests.</p>
      <Link href="/new-profile"><Button className="rounded-none font-mono text-xs bg-primary text-primary-foreground">JOIN_DEVLINK_KE</Button></Link>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono text-primary tracking-widest border border-primary/30 px-2 py-0.5 bg-primary/5">COLLAB_INBOX</span>
        </div>
        <h1 className="text-3xl font-black font-mono tracking-tight text-foreground">
          Hook_<span className="text-primary">Up</span> Requests
        </h1>
        <p className="text-muted-foreground text-sm mt-2">Manage collab requests from other builders in the network.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {([
          { key: "incoming", label: "Incoming", icon: <Inbox className="h-3.5 w-3.5" /> },
          { key: "sent",     label: "Sent",     icon: <Send className="h-3.5 w-3.5" /> },
        ] as const).map(({ key, label, icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono border-b-2 -mb-px transition-colors ${
              tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {icon} {label.toUpperCase()}
            {key === "incoming" && pendingCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 min-w-[18px] text-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "incoming" ? <IncomingTab /> : <SentTab />}
    </div>
  );
}
