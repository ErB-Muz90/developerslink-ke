import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/contexts/user-context";
import { Code2, Eye, EyeOff, LogIn, Loader2 } from "lucide-react";

const GITHUB_ICON = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const GOOGLE_ICON = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);
import { useLocation } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "register";
}

export function AuthModal({ open, onOpenChange, defaultTab = "login" }: AuthModalProps) {
  const { refetchMe } = useCurrentUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const handleLogin = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        toast({ title: "Login failed", description: body.error ?? "Invalid credentials", variant: "destructive" });
        return;
      }

      await refetchMe();
      toast({ title: "Welcome back!", description: "You're now logged in." });
      onOpenChange(false);
      loginForm.reset();
    } catch {
      toast({ title: "Error", description: "Something went wrong. Try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-none border-border bg-background p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="h-5 w-5 text-primary" />
            <span className="font-mono font-bold text-lg tracking-tighter">DL<span className="text-primary">_KE</span></span>
          </div>
          <DialogTitle className="text-left font-mono text-base font-bold">ACCESS_PORTAL</DialogTitle>
          <DialogDescription className="sr-only">Sign in to your DevLink KE account</DialogDescription>
          <p className="text-xs text-muted-foreground">Sign in with your DevLink KE credentials.</p>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full rounded-none border-b border-border h-10 bg-muted/20 p-0">
            <TabsTrigger value="login" className="flex-1 rounded-none font-mono text-xs h-10 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary">
              LOGIN
            </TabsTrigger>
            <TabsTrigger value="register" className="flex-1 rounded-none font-mono text-xs h-10 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary">
              NEW ACCOUNT
            </TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login" className="mt-0 p-6">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField control={loginForm.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="johndoe_ke"
                        className="rounded-none font-mono h-10 border-border focus-visible:ring-primary"
                        autoComplete="username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )} />

                <FormField control={loginForm.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="rounded-none font-mono h-10 border-border focus-visible:ring-primary pr-10"
                          autoComplete="current-password"
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

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-none font-mono h-11 bg-primary text-primary-foreground hover:bg-primary/90 mt-2"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogIn className="h-4 w-4 mr-2" /> LOGIN</>}
                </Button>

                {/* Google OAuth divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/30" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-2 text-muted-foreground font-mono">OR</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={async () => {
                    setGoogleLoading(true);
                    try {
                      const res = await fetch("/api/auth/google/url");
                      const data = await res.json();
                      if (data.url) {
                        window.location.href = data.url;
                      }
                    } catch {
                      setGoogleLoading(false);
                      toast({ title: "Error", description: "Failed to start Google sign-in", variant: "destructive" });
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2.5 h-11 border border-border bg-background hover:bg-muted/20 transition-colors font-mono text-xs disabled:opacity-50"
                >
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>{GOOGLE_ICON} CONTINUE WITH GOOGLE</>
                  )}
                </button>

                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={async () => {
                    setGoogleLoading(true);
                    try {
                      const res = await fetch("/api/auth/github/url");
                      const data = await res.json();
                      if (data.url) {
                        window.location.href = data.url;
                      }
                    } catch {
                      setGoogleLoading(false);
                      toast({ title: "Error", description: "Failed to start GitHub sign-in", variant: "destructive" });
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2.5 h-11 border border-border bg-background hover:bg-muted/20 transition-colors font-mono text-xs disabled:opacity-50"
                >
                  {googleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>{GITHUB_ICON} CONTINUE WITH GITHUB</>
                  )}
                </button>
              </form>
            </Form>

            <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
              <button
                onClick={() => {
                  onOpenChange(false);
                  setLocation("/forgot-password");
                }}
                className="text-xs text-muted-foreground hover:text-primary font-mono transition-colors"
              >
                Forgot password?
              </button>
              <p className="text-xs text-muted-foreground">
                No account?{" "}
                <button
                  onClick={() => {
                    onOpenChange(false);
                    setLocation("/new-profile");
                  }}
                  className="text-primary hover:underline font-mono"
                >
                  Create one →
                </button>
              </p>
            </div>
          </TabsContent>

          {/* Register tab redirects to full page */}
          <TabsContent value="register" className="mt-0 p-6">
            <div className="flex flex-col items-center text-center gap-4 py-6">
              <div className="w-14 h-14 border border-primary/30 bg-primary/5 flex items-center justify-center">
                <Code2 className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-mono font-bold text-sm">JOIN THE NETWORK</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Creating a profile takes a few minutes. Set up your skills, level, and what you're looking for.
                </p>
              </div>
              <Button
                className="w-full rounded-none font-mono bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  onOpenChange(false);
                  setLocation("/new-profile");
                }}
              >
                Create Profile →
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
