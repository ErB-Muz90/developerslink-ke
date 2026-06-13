import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.current) errs.current = "Required";
    if (form.next.length < 8) errs.next = "At least 8 characters";
    else if (!/[A-Z]/.test(form.next)) errs.next = "Must contain an uppercase letter";
    else if (!/[0-9]/.test(form.next)) errs.next = "Must contain a number";
    if (form.next !== form.confirm) errs.confirm = "Passwords don't match";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setIsLoading(true);

    try {
      const res = await fetch("/api/me/password", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 401) setErrors({ current: body.error });
        else toast({ title: "Error", description: body.error, variant: "destructive" });
        return;
      }
      setDone(true);
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setTimeout(() => { setDone(false); setForm({ current: "", next: "", confirm: "" }); onClose(); }, 1800);
    } catch {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setForm({ current: "", next: "", confirm: "" });
    setErrors({});
    setDone(false);
    onClose();
  };

  const strength = (() => {
    const p = form.next;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthColors = ["bg-destructive/60", "bg-amber-500", "bg-amber-400", "bg-primary"];
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="rounded-none border-border bg-background max-w-sm p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-primary/30 bg-primary/5 flex items-center justify-center">
              <Lock className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-mono font-black text-base tracking-tight">CHANGE_PASSWORD</DialogTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">Keep your account secure.</p>
            </div>
          </div>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <p className="font-mono font-bold text-sm">PASSWORD_UPDATED</p>
            <p className="text-xs text-muted-foreground">Your password has been changed.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Current password */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">CURRENT PASSWORD</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={form.current}
                  onChange={(e) => setForm({ ...form, current: e.target.value })}
                  autoComplete="current-password"
                  className="rounded-none border-border bg-background font-mono pr-9 focus-visible:ring-primary focus-visible:border-primary"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {errors.current && <p className="text-[11px] text-destructive font-mono">{errors.current}</p>}
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">NEW PASSWORD</Label>
              <div className="relative">
                <Input
                  type={showNext ? "text" : "password"}
                  value={form.next}
                  onChange={(e) => setForm({ ...form, next: e.target.value })}
                  autoComplete="new-password"
                  className="rounded-none border-border bg-background font-mono pr-9 focus-visible:ring-primary focus-visible:border-primary"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowNext((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showNext ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {/* Strength bar */}
              {form.next && (
                <div className="space-y-1">
                  <div className="flex gap-1 h-1">
                    {[0,1,2,3].map((i) => (
                      <div key={i} className={`flex-1 transition-all duration-300 ${i < strength ? strengthColors[strength - 1] : "bg-border"}`} />
                    ))}
                  </div>
                  <p className={`text-[10px] font-mono ${strength >= 3 ? "text-primary" : strength === 2 ? "text-amber-400" : "text-muted-foreground"}`}>
                    {strengthLabels[strength - 1] ?? "Weak"} — 8+ chars, uppercase & number required
                  </p>
                </div>
              )}
              {errors.next && <p className="text-[11px] text-destructive font-mono">{errors.next}</p>}
            </div>

            {/* Confirm */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono tracking-wider text-muted-foreground">CONFIRM NEW PASSWORD</Label>
              <Input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                autoComplete="new-password"
                className="rounded-none border-border bg-background font-mono focus-visible:ring-primary focus-visible:border-primary"
              />
              {errors.confirm && <p className="text-[11px] text-destructive font-mono">{errors.confirm}</p>}
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="ghost" className="flex-1 rounded-none font-mono text-xs border border-border/50 text-muted-foreground"
                onClick={handleClose} disabled={isLoading}>
                CANCEL
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-[2] rounded-none font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                {isLoading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Updating…</> : "UPDATE_PASSWORD"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
