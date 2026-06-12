import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/contexts/user-context";
import { Code2, Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
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
              </form>
            </Form>

            <div className="mt-4 pt-4 border-t border-border/30 text-center">
              <p className="text-xs text-muted-foreground">
                No account yet?{" "}
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
