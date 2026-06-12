import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Code2, CheckCircle, AlertTriangle, Loader2, Mail } from "lucide-react";
import { useCurrentUser } from "@/contexts/user-context";
import { useToast } from "@/hooks/use-toast";

function getToken(): string | null {
  return new URLSearchParams(window.location.search).get("token");
}

export default function VerifyEmail() {
  const { refetchMe } = useCurrentUser();
  const { toast } = useToast();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const [resending, setResending] = useState(false);
  const token = getToken();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("Missing token in link. Request a new verification email.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const body = await res.json();
        if (res.ok) {
          await refetchMe();
          setStatus("success");
        } else {
          setStatus("error");
          setErrorMsg(body.error ?? "Verification failed. The link may have expired.");
        }
      } catch {
        setStatus("error");
        setErrorMsg("Network error. Check your connection and try again.");
      }
    })();
  }, [token]);

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Email sent", description: "Check your inbox for a new verification link." });
      } else {
        const body = await res.json();
        toast({ title: "Error", description: body.error ?? "Could not resend email", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="border border-border bg-card">
          <div className="px-6 pt-6 pb-4 border-b border-border/40">
            <div className="flex items-center gap-2 mb-3">
              <Code2 className="h-5 w-5 text-primary" />
              <span className="font-mono font-bold text-lg tracking-tighter text-foreground">
                DL<span className="text-primary">_KE</span>
              </span>
            </div>
            <h1 className="font-mono font-bold text-base">VERIFY_EMAIL</h1>
          </div>

          <div className="p-6">
            {status === "verifying" && (
              <div className="flex flex-col items-center text-center gap-4 py-6">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground font-mono">Verifying your address…</p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-14 h-14 border border-primary/30 bg-primary/5 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-mono font-bold text-sm">EMAIL_VERIFIED</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Your address is confirmed. You're all set.
                  </p>
                </div>
                <Link href="/">
                  <Button size="sm" className="rounded-none font-mono text-xs bg-primary text-primary-foreground">
                    Go to Dashboard →
                  </Button>
                </Link>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-14 h-14 border border-destructive/30 bg-destructive/5 flex items-center justify-center">
                  <AlertTriangle className="h-7 w-7 text-destructive" />
                </div>
                <div>
                  <p className="font-mono font-bold text-sm">VERIFICATION_FAILED</p>
                  <p className="text-xs text-muted-foreground mt-1.5">{errorMsg}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resending}
                    onClick={handleResend}
                    className="rounded-none font-mono text-xs border-border/60"
                  >
                    {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Mail className="h-3.5 w-3.5 mr-1.5" /> Resend Email</>}
                  </Button>
                  <Link href="/">
                    <Button size="sm" className="rounded-none font-mono text-xs bg-primary text-primary-foreground">
                      Home
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
