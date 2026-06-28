import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/contexts/user-context";
import { queueRegistration } from "@/lib/offline-queue";
import { validateEmailDomain } from "@/lib/email-validator";
import { UserPlus, Code2, Trash2, Eye, EyeOff, Loader2, WifiOff, CheckCircle } from "lucide-react";

const skillCategoryEnum = z.enum(["backend", "frontend", "mobile", "ai", "networking", "design", "devops", "other"]);
const skillProficiencyEnum = z.enum(["beginner", "intermediate", "pro"]);

const KENYA_COUNTIES: Record<string, string[]> = {
  "Nairobi": ["Nairobi"],
  "Central": ["Kiambu", "Kirinyaga", "Murang'a", "Nyandarua", "Nyeri"],
  "Coast": ["Kilifi", "Kwale", "Lamu", "Mombasa", "Taita-Taveta", "Tana River"],
  "Eastern": ["Embu", "Isiolo", "Kitui", "Machakos", "Makueni", "Marsabit", "Meru", "Tharaka-Nithi"],
  "North Eastern": ["Garissa", "Mandera", "Wajir"],
  "Nyanza": ["Homa Bay", "Kisii", "Kisumu", "Migori", "Nyamira", "Siaya"],
  "Rift Valley": ["Baringo", "Bomet", "Elgeyo-Marakwet", "Kajiado", "Kericho", "Laikipia", "Nakuru", "Nandi", "Narok", "Samburu", "Trans Nzoia", "Turkana", "Uasin Gishu", "West Pokot"],
  "Western": ["Bungoma", "Busia", "Kakamega", "Vihiga"],
};

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(20, "Max 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscores only"),
  email: z.string().email("Enter a valid email").refine((val) => {
    const result = validateEmailDomain(val);
    return result.valid;
  }, (val) => ({ message: validateEmailDomain(val).reason ?? "Invalid email address." })),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  confirmPassword: z.string(),
  displayName: z.string().min(2, "At least 2 characters"),
  bio: z.string().max(500).optional(),
  location: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "pro"]),
  lookingFor: z.string().optional(),
  githubUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  twitterUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof profileSchema>;

export default function NewProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { refetchMe } = useCurrentUser();

  const [skills, setSkills] = useState<Array<{ name: string; category: any; proficiency: any }>>([]);
  const [skillInput, setSkillInput] = useState({ name: "", category: "frontend", proficiency: "intermediate" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queuedOffline, setQueuedOffline] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      displayName: "",
      bio: "",
      location: "",
      level: "intermediate",
      lookingFor: "",
      githubUrl: "",
      twitterUrl: "",
    },
  });

  const addSkill = () => {
    if (!skillInput.name.trim()) return;
    setSkills([...skills, { name: skillInput.name.trim(), category: skillInput.category as any, proficiency: skillInput.proficiency as any }]);
    setSkillInput({ ...skillInput, name: "" });
  };

  const removeSkill = (i: number) => setSkills(skills.filter((_, idx) => idx !== i));

  const buildPayload = (data: FormValues) => {
    const { confirmPassword: _, ...rest } = data;
    return {
      ...rest,
      githubUrl: rest.githubUrl || undefined,
      twitterUrl: rest.twitterUrl || undefined,
      skills,
    };
  };

  const onSubmit = async (data: FormValues) => {
    if (skills.length === 0) {
      toast({ title: "Skills required", description: "Add at least one skill", variant: "destructive" });
      return;
    }

    const payload = buildPayload(data);

    if (!navigator.onLine) {
      try {
        await queueRegistration(payload);
        setQueuedOffline(true);
      } catch {
        toast({ title: "Error", description: "Failed to save offline. Try again.", variant: "destructive" });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        if (body.error?.toLowerCase().includes("username")) {
          form.setError("username", { message: body.error });
        } else if (body.error?.toLowerCase().includes("email")) {
          form.setError("email", { message: body.error });
        } else {
          toast({ title: "Registration failed", description: body.error ?? "Try again", variant: "destructive" });
        }
        return;
      }

      const user = await res.json();
      await refetchMe();
      toast({ title: "Welcome to DevLink KE!", description: "Your profile is live. Start exploring and connecting." });
      setLocation(`/profile/${user.id}`);
    } catch {
      toast({ title: "Error", description: "Something went wrong. Try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (queuedOffline) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md flex flex-col items-center text-center gap-6">
        <div className="w-20 h-20 border border-primary/30 bg-primary/5 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="font-mono font-bold text-xl text-foreground">PROFILE_QUEUED</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            You're offline right now. Your profile data has been saved to your device.
            As soon as you reconnect, it will be automatically submitted and your account created.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border/40 px-4 py-2">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Will sync when back online</span>
        </div>
        <Button
          variant="outline"
          className="rounded-none font-mono text-xs border-border/60"
          onClick={() => setQueuedOffline(false)}
        >
          Edit Profile
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8 border-b border-border/50 pb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 font-mono uppercase tracking-tight flex items-center gap-3">
          <UserPlus className="h-8 w-8 text-primary" />
          INIT_PROFILE
        </h1>
        <p className="text-muted-foreground">
          Create your builder profile to connect with the network. Your credentials are private — only public profile info is visible.
        </p>
        {!navigator.onLine && (
          <div className="mt-3 flex items-center gap-2 text-xs font-mono text-amber-400 border border-amber-400/20 bg-amber-400/5 px-3 py-2">
            <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
            <span>You're offline — your profile will be saved and submitted automatically when you reconnect.</span>
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

          {/* Account Credentials */}
          <div className="space-y-6">
            <h3 className="font-mono font-bold text-lg text-primary border-l-2 border-primary pl-3">CREDENTIALS</h3>
            <div className="space-y-4 bg-card p-6 border border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Handle *</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe_ke" className="rounded-none font-mono focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormDescription className="text-[10px]">Unique. Letters, numbers, underscores.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" className="rounded-none font-mono focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormDescription className="text-[10px]">Private. Used for account recovery.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Min 8 chars, 1 uppercase, 1 number"
                          className="rounded-none font-mono focus-visible:ring-primary pr-10"
                          autoComplete="new-password"
                          {...field}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Confirm Password *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirm ? "text" : "password"}
                          placeholder="Repeat your password"
                          className="rounded-none font-mono focus-visible:ring-primary pr-10"
                          autoComplete="new-password"
                          {...field}
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="space-y-6">
            <h3 className="font-mono font-bold text-lg text-secondary border-l-2 border-secondary pl-3">IDENTITY</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 border border-border">
              <FormField control={form.control} name="displayName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Display Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" className="rounded-none font-mono focus-visible:ring-primary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="level" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Overall Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-none font-mono focus-visible:ring-primary">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">County / Hub</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="rounded-none font-mono focus-visible:ring-primary">
                        <SelectValue placeholder="Select county…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      {Object.entries(KENYA_COUNTIES).map(([region, counties]) => (
                        <SelectGroup key={region}>
                          <SelectLabel className="font-mono text-[10px] uppercase text-muted-foreground px-2 py-1.5 tracking-widest">
                            {region}
                          </SelectLabel>
                          {counties.map((county) => (
                            <SelectItem key={county} value={county} className="font-mono text-sm">
                              {county}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="lookingFor" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Looking For</FormLabel>
                  <FormControl>
                    <Input placeholder="Looking for a React developer..." className="rounded-none font-mono focus-visible:ring-primary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <h3 className="font-mono font-bold text-lg text-secondary border-l-2 border-secondary pl-3">DETAILS</h3>
            <div className="space-y-4 bg-card p-6 border border-border">
              <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Bio</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Full stack developer obsessed with performance..." className="rounded-none font-mono focus-visible:ring-primary resize-none h-24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="githubUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">GitHub URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://github.com/..." className="rounded-none font-mono focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="twitterUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Twitter / X URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://twitter.com/..." className="rounded-none font-mono focus-visible:ring-primary" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-6">
            <h3 className="font-mono font-bold text-lg text-primary border-l-2 border-primary pl-3 flex justify-between items-center">
              TECHNICAL_ARSENAL
              <span className="text-xs text-muted-foreground font-normal">At least 1 required</span>
            </h3>
            <div className="bg-card p-6 border border-border space-y-6">
              {skills.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {skills.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border border-border bg-background">
                      <div>
                        <div className="font-bold text-sm">{s.name}</div>
                        <div className="flex gap-2 text-[10px] font-mono uppercase text-muted-foreground mt-1">
                          <span className="text-secondary">{s.category}</span>
                          <span>•</span>
                          <span className="text-primary">{s.proficiency}</span>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeSkill(i)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-none">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-3 items-end p-4 border border-dashed border-border bg-muted/5">
                <div className="flex-1 w-full">
                  <p className="font-mono text-[10px] uppercase text-muted-foreground mb-1">Skill Name</p>
                  <Input
                    value={skillInput.name}
                    onChange={(e) => setSkillInput({ ...skillInput, name: e.target.value })}
                    placeholder="e.g. React, PostgreSQL"
                    className="rounded-none font-mono h-9"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  />
                </div>
                <div className="w-full md:w-32">
                  <p className="font-mono text-[10px] uppercase text-muted-foreground mb-1">Category</p>
                  <Select value={skillInput.category} onValueChange={(v) => setSkillInput({ ...skillInput, category: v })}>
                    <SelectTrigger className="rounded-none font-mono h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {skillCategoryEnum.options.map((opt) => (
                        <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-32">
                  <p className="font-mono text-[10px] uppercase text-muted-foreground mb-1">Proficiency</p>
                  <Select value={skillInput.proficiency} onValueChange={(v) => setSkillInput({ ...skillInput, proficiency: v })}>
                    <SelectTrigger className="rounded-none font-mono h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {skillProficiencyEnum.options.map((opt) => (
                        <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" onClick={addSkill} className="rounded-none h-9 font-mono bg-secondary hover:bg-secondary/90 text-secondary-foreground w-full md:w-auto">
                  ADD
                </Button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-none font-mono text-base h-14 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(22,163,74,0.3)]"
          >
            {isSubmitting ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> INITIALIZING...</>
            ) : !navigator.onLine ? (
              <><WifiOff className="h-5 w-5 mr-2" /> SAVE_OFFLINE</>
            ) : (
              "INITIALIZE_PROFILE"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <button type="button" onClick={() => setLocation("/")} className="text-primary hover:underline font-mono">
              Go back and log in →
            </button>
          </p>
        </form>
      </Form>
    </div>
  );
}
