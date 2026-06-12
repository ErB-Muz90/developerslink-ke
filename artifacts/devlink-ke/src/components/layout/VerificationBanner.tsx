import { useState } from "react";
import { Mail, X, Loader2, CheckCircle } from "lucide-react";
import { useCurrentUser } from "@/contexts/user-context";
import { useToast } from "@/hooks/use-toast";

export function VerificationBanner() {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!currentUser || currentUser.emailVerified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setSent(true);
        toast({ title: "Email sent", description: "Check your inbox for the verification link." });
      } else {
        const body = await res.json();
        toast({ title: "Error", description: body.error ?? "Could not send email", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5">
      <div className="container mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Mail className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300 font-mono truncate">
            <span className="font-bold">VERIFY_EMAIL</span>
            <span className="text-amber-400/70 ml-2 hidden sm:inline">
              Confirm your email to unlock all features.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!sent ? (
            <button
              onClick={handleResend}
              disabled={sending}
              className="text-[11px] font-mono text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400/50 px-2.5 py-1 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {sending ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Sending…</>
              ) : (
                "Resend link"
              )}
            </button>
          ) : (
            <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Sent
            </span>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-500/60 hover:text-amber-400 transition-colors p-0.5"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
