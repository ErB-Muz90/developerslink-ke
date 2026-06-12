import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Code2, Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      if (!res.ok) {
        const body = await res.json();
        toast({ title: "Error", description: body.error ?? "Something went wrong", variant: "destructive" });
        return;
      }

      setSubmittedEmail(data.email);
      setSent(true);
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
            <h1 className="font-mono font-bold text-base">RECOVER_ACCESS</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Enter your email and we'll send a reset link if an account exists.
            </p>
          </div>

          <div className="p-6">
            {sent ? (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-14 h-14 border border-primary/30 bg-primary/5 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-mono font-bold text-sm">CHECK_YOUR_EMAIL</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    If <span className="font-mono text-foreground">{submittedEmail}</span> is registered,
                    you'll receive a reset link shortly. Check your spam folder too.
                  </p>
                </div>
                <Link href="/">
                  <Button variant="outline" size="sm" className="rounded-none font-mono text-xs border-border/60 mt-2">
                    <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                    Back to Home
                  </Button>
                </Link>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            className="rounded-none font-mono h-10 border-border focus-visible:ring-primary pl-9"
                            autoComplete="email"
                            {...field}
                          />
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
                      : "SEND_RESET_LINK"
                    }
                  </Button>

                  <div className="pt-2 border-t border-border/30 text-center">
                    <Link href="/">
                      <button type="button" className="text-xs text-muted-foreground hover:text-primary font-mono transition-colors">
                        ← Back to login
                      </button>
                    </Link>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
