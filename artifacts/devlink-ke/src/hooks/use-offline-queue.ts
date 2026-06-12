import { useEffect } from "react";
import { flushRegistrationQueue, getQueuedRegistrations } from "@/lib/offline-queue";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/contexts/user-context";

export function useOfflineQueueSync() {
  const { toast } = useToast();
  const { refetchMe } = useCurrentUser();

  useEffect(() => {
    const tryFlush = async () => {
      const queued = await getQueuedRegistrations();
      if (queued.length === 0) return;

      flushRegistrationQueue(
        async () => {
          await refetchMe();
          toast({
            title: "Account created!",
            description: "Your offline registration was submitted and your profile is live.",
          });
        },
        (_, error) => {
          if (!error.toLowerCase().includes("already")) {
            toast({
              title: "Registration failed",
              description: `Queued registration: ${error}`,
              variant: "destructive",
            });
          }
        },
      );
    };

    if (navigator.onLine) {
      tryFlush();
    }

    window.addEventListener("online", tryFlush);
    return () => window.removeEventListener("online", tryFlush);
  }, []);
}
