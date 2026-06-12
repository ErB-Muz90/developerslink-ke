import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Code2, Eye, EyeOff, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

const schema = z.object({
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

function getToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

export default function ResetPassword() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const token = getToken();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: FormValues) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });

      const body = await res.json();

      if (!res.ok) {
        toast({ title: "Reset failed", description: body.error ?? "Something went wrong", variant: "destructive" });
        return;
      }

      setDone(true);
      setTimeout(() => setLocation("/"), 2500);
    } catch {
      toast({ title: "Error", description: "Network error. Try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
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
            <h1 className="font-mono font-bold text-base">SET_NEW_PASSWORD</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Choose a strong password for your DevLink KE account.
            </p>
          </div>

          <div className="p-6">
            {!token ? (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-14 h-14 border border-destructive/30 bg-destructive/5 flex items-center justify-center">
                  <AlertTriangle className="h-7 w-7 text-destructive" />
                </div>
                <div>
                  <p className="font-mono font-bold text-sm">INVALID_LINK</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    This reset link is missing a token. Request a new one.
                  </p>
                </div>
                <Link href="/forgot-password">
                  <Button size="sm" className="rounded-none font-mono text-xs bg-primary text-primary-foreground">
                    Request New Link
                  </Button>
                </Link>
              </div>
            ) : done ? (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-14 h-14 border border-primary/30 bg-primary/5 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-mono font-bold text-sm">PASSWORD_UPDATED</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Your password has been changed. Redirecting to login…
                  </p>
                </div>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Min 8 chars, 1 uppercase, 1 number"
                            className="rounded-none font-mono h-10 border-border focus-visible:ring-primary pr-10"
                            autoComplete="new-password"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirm ? "text" : "password"}
                            placeholder="Repeat your new password"
                            className="rounded-none font-mono h-10 border-border focus-visible:ring-primary pr-10"
                            autoComplete="new-password"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-none font-mono h-11 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isLoading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : "UPDATE_PASSWORD"
                    }
                  </Button>
                </form>
              </Form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
