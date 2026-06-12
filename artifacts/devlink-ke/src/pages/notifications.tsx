import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/contexts/user-context";
import { useToast } from "@/hooks/use-toast";
import { Bell, CheckCheck, Hash, User, Zap, Loader2 } from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Notif = {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string;
  fromUser?: { id: number; displayName: string; username: string } | null;
  room?: { id: number; name: string } | null;
};

function groupByDate(notifs: Notif[]) {
  return notifs.reduce<Record<string, Notif[]>>((acc, n) => {
    const d = new Date(n.createdAt);
    const label = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "MMMM d, yyyy");
    if (!acc[label]) acc[label] = [];
    acc[label].push(n);
    return acc;
  }, {});
}

export default function NotificationsPage() {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ notifications: Notif[]; unreadCount: number }>({
    queryKey: ["/api/me/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/me/notifications", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!currentUser,
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/me/notifications/read-all", { method: "PATCH", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/me/notifications"] });
      toast({ title: "All marked as read" });
    },
  });

  const markOne = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/me/notifications"] }),
  });

  if (!currentUser) return (
    <div className="container mx-auto px-4 py-20 text-center max-w-md">
      <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
      <h1 className="font-mono font-black text-xl mb-2">NOTIFICATIONS</h1>
      <p className="text-muted-foreground text-sm mb-6">Sign in to see your notifications.</p>
      <Link href="/new-profile"><Button className="rounded-none font-mono text-xs bg-primary text-primary-foreground">JOIN_DEVLINK_KE</Button></Link>
    </div>
  );

  const grouped = groupByDate(data?.notifications ?? []);
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono text-primary tracking-widest border border-primary/30 px-2 py-0.5 bg-primary/5">ACTIVITY</span>
            {unread > 0 && (
              <span className="text-[9px] font-mono bg-primary text-primary-foreground px-1.5 py-0.5 font-bold">{unread} NEW</span>
            )}
          </div>
          <h1 className="text-3xl font-black font-mono tracking-tight text-foreground">Notifications</h1>
        </div>
        {unread > 0 && (
          <Button variant="ghost" size="sm"
            className="rounded-none font-mono text-xs text-muted-foreground border border-border/50 hover:text-foreground mt-1"
            onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            {markAll.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <CheckCheck className="h-3 w-3 mr-1.5" />}
            MARK_ALL_READ
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-muted/20 border border-border animate-pulse" />)}
        </div>
      ) : !data || data.notifications.length === 0 ? (
        <div className="py-24 border border-dashed border-border text-center">
          <Bell className="h-10 w-10 text-muted-foreground/25 mx-auto mb-3" />
          <p className="font-mono font-bold text-sm">NO_NOTIFICATIONS</p>
          <p className="text-xs text-muted-foreground mt-1">Activity from rooms and collab requests will appear here.</p>
          <Link href="/explore">
            <Button className="mt-5 rounded-none font-mono text-xs bg-primary text-primary-foreground">EXPLORE_BUILDERS</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, notifs]) => (
            <div key={dateLabel}>
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3 uppercase">{dateLabel}</p>
              <div className="space-y-1">
                {notifs.map((notif, i) => (
                  <motion.div key={notif.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className={`group flex items-start gap-3 px-4 py-3 border relative transition-colors ${
                      !notif.isRead ? "border-primary/20 bg-primary/3" : "border-border/40 bg-card hover:bg-muted/10"
                    }`}>
                    {!notif.isRead && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}

                    {/* Sender avatar */}
                    <div className="w-8 h-8 bg-muted border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                      {notif.fromUser ? (
                        <span className="text-[10px] font-mono font-bold text-muted-foreground/70">
                          {notif.fromUser.displayName.substring(0, 2).toUpperCase()}
                        </span>
                      ) : (
                        <Zap className="h-3 w-3 text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-snug">{notif.message}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {notif.fromUser && (
                          <Link href={`/profile/${notif.fromUser.id}`}
                            className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors">
                            <User className="h-2.5 w-2.5" /> @{notif.fromUser.username}
                          </Link>
                        )}
                        {notif.room && notif.room.id > 0 && (
                          <Link href={`/rooms/${notif.room.id}`}
                            className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => { if (!notif.isRead) markOne.mutate(notif.id); }}>
                            <Hash className="h-2.5 w-2.5" /> {notif.room.name}
                          </Link>
                        )}
                        <span className="text-[10px] font-mono text-muted-foreground/40 ml-auto">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {!notif.isRead && (
                      <button onClick={() => markOne.mutate(notif.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
                        title="Mark as read">
                        <CheckCheck className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
