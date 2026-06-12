import { useState, useEffect } from "react";
import { Bell, CheckCheck, ChevronRight, Hash } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUser } from "@/contexts/user-context";

export function NotificationBell() {
  const { currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [flashCount, setFlashCount] = useState(false);

  const notifKey = currentUser
    ? getListNotificationsQueryKey({ userId: currentUser.id })
    : ["disabled"];

  const { data } = useListNotifications(
    { userId: currentUser?.id ?? 0 },
    {
      query: {
        enabled: !!currentUser,
        queryKey: notifKey as any,
        refetchInterval: 30_000,
      },
    }
  );

  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  const unreadCount = data?.unreadCount ?? 0;

  // Listen for incoming notifications from any room WebSocket
  useEffect(() => {
    if (!currentUser) return;

    const handler = (e: Event) => {
      const notification = (e as CustomEvent).detail;
      if (!notification || notification.userId !== currentUser.id) return;

      queryClient.setQueryData(notifKey as any, (old: any) => {
        if (!old) return { notifications: [notification], unreadCount: 1 };
        const exists = old.notifications.some((n: any) => n.id === notification.id);
        if (exists) return old;
        return {
          notifications: [notification, ...old.notifications],
          unreadCount: old.unreadCount + 1,
        };
      });

      setFlashCount(true);
      setTimeout(() => setFlashCount(false), 800);
    };

    window.addEventListener("devlink:notification", handler);
    return () => window.removeEventListener("devlink:notification", handler);
  }, [currentUser, queryClient, notifKey]);

  const handleMarkAll = () => {
    if (!currentUser) return;
    markAll.mutate(
      { data: { userId: currentUser.id } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: notifKey as any }) }
    );
  };

  const handleMarkOne = (id: number) => {
    markOne.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.setQueryData(notifKey as any, (old: any) => {
            if (!old) return old;
            return {
              ...old,
              notifications: old.notifications.map((n: any) =>
                n.id === id ? { ...n, isRead: true } : n
              ),
              unreadCount: Math.max(0, old.unreadCount - 1),
            };
          });
        },
      }
    );
  };

  if (!currentUser) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-notification-bell"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: flashCount ? [1, 1.4, 1] : 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-primary text-primary-foreground text-[9px] font-mono font-bold px-0.5"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0 rounded-none border-border bg-background"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono font-bold text-xs tracking-wider">NOTIFICATIONS</span>
            {unreadCount > 0 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={markAll.isPending}
              className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[340px] overflow-y-auto">
          {!data || data.notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Bell className="h-6 w-6 text-muted-foreground/30" />
              <p className="text-xs font-mono text-muted-foreground">No notifications yet</p>
              <p className="text-[10px] text-muted-foreground/60">
                Activity in rooms you post in will appear here
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {data.notifications.map((notif: any, i: number) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`group relative border-b border-border/30 last:border-0 ${
                    !notif.isRead ? "bg-primary/3" : ""
                  }`}
                >
                  {!notif.isRead && (
                    <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                  )}
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className="w-7 h-7 bg-muted flex-shrink-0 flex items-center justify-center mt-0.5">
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {notif.fromUser?.displayName?.substring(0, 2).toUpperCase() ?? "??"}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-snug">{notif.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {notif.room && (
                          <Link
                            href={`/rooms/${notif.room.id}`}
                            onClick={() => {
                              setOpen(false);
                              if (!notif.isRead) handleMarkOne(notif.id);
                            }}
                            className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Hash className="h-2.5 w-2.5" />
                            {notif.room.name}
                            <ChevronRight className="h-2.5 w-2.5" />
                          </Link>
                        )}
                        <span className="text-[10px] text-muted-foreground/60 ml-auto">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkOne(notif.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                        title="Mark as read"
                      >
                        <CheckCheck className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {data && data.notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-border/30 bg-muted/10">
            <p className="text-[10px] font-mono text-muted-foreground text-center">
              Showing latest {data.notifications.length} notifications
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
