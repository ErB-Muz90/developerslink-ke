import { useState, useEffect, useRef } from "react";
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
import { Edit, Code2, Trash2, Loader2, Save, Plus, Camera, Wand2, RefreshCw } from "lucide-react";

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

const SKILL_CATEGORIES = ["backend", "frontend", "mobile", "ai", "networking", "design", "devops", "other"] as const;
const SKILL_PROFICIENCIES = ["beginner", "intermediate", "pro"] as const;

const editSchema = z.object({
  displayName: z.string().min(2, "At least 2 characters").max(60),
  bio: z.string().max(500, "Max 500 characters").optional(),
  location: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "pro"]),
  lookingFor: z.string().max(300).optional(),
  githubUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  twitterUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof editSchema>;
type Skill = { name: string; category: typeof SKILL_CATEGORIES[number]; proficiency: typeof SKILL_PROFICIENCIES[number] };

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner — learning the ropes",
  intermediate: "Intermediate — shipping things",
  pro: "Pro — been around the block",
};

export default function EditProfile() {
  const [, navigate] = useLocation();
  const { currentUser, refetchMe } = useCurrentUser();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarGenerating, setAvatarGenerating] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState("avataaars");

  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillInput, setSkillInput] = useState<{ name: string; category: typeof SKILL_CATEGORIES[number]; proficiency: typeof SKILL_PROFICIENCIES[number] }>({
    name: "", category: "frontend", proficiency: "intermediate",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      location: "",
      level: "intermediate",
      lookingFor: "",
      githubUrl: "",
      twitterUrl: "",
    },
  });

  useEffect(() => {
    if (currentUser && !initialized) {
      form.reset({
        displayName: currentUser.displayName ?? "",
        bio: (currentUser as any).bio ?? "",
        location: (currentUser as any).location ?? "",
        level: (currentUser as any).level ?? "intermediate",
        lookingFor: (currentUser as any).lookingFor ?? "",
        githubUrl: (currentUser as any).githubUrl ?? "",
        twitterUrl: (currentUser as any).twitterUrl ?? "",
      });
      setAvatarUrl(currentUser.avatarUrl ?? null);
      setSkills((currentUser as any).skills ?? []);
      setInitialized(true);
    }
  }, [currentUser, form, initialized]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch(`/api/users/${currentUser.id}/avatar`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        toast({ title: "Upload failed", description: "Please try a different image.", variant: "destructive" });
        return;
      }
      const user = await res.json();
      setAvatarUrl(user.avatarUrl);
      await refetchMe();
      toast({ title: "Avatar updated" });
    } catch {
      toast({ title: "Upload failed", description: "Network error.", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleGenerateAvatar = async () => {
    if (!currentUser) return;
    setAvatarGenerating(true);
    try {
      const res = await fetch(`/api/users/${currentUser.id}/avatar/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: avatarStyle }),
      });
      if (!res.ok) {
        toast({ title: "Generation failed", description: "Please try again.", variant: "destructive" });
        return;
      }
      const user = await res.json();
      setAvatarUrl(user.avatarUrl);
      await refetchMe();
      toast({ title: "Avatar generated!" });
    } catch {
      toast({ title: "Generation failed", description: "Network error.", variant: "destructive" });
    } finally {
      setAvatarGenerating(false);
    }
  };

  const addSkill = () => {
    if (!skillInput.name.trim()) return;
    if (skills.some((s) => s.name.toLowerCase() === skillInput.name.toLowerCase())) return;
    setSkills([...skills, { name: skillInput.name.trim(), category: skillInput.category, proficiency: skillInput.proficiency }]);
    setSkillInput({ ...skillInput, name: "" });
  };

  const removeSkill = (i: number) => setSkills(skills.filter((_, idx) => idx !== i));

  const onSubmit = async (data: FormValues) => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const payload = {
        displayName: data.displayName,
        bio: data.bio || undefined,
        location: data.location || undefined,
        level: data.level,
        lookingFor: data.lookingFor || undefined,
        githubUrl: data.githubUrl || undefined,
        twitterUrl: data.twitterUrl || undefined,
        skills,
      };
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json();
        toast({ title: "Error", description: body.error ?? "Failed to save", variant: "destructive" });
        return;
      }
      await refetchMe();
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      navigate(`/profile/${currentUser.id}`);
    } catch {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <p className="font-mono text-muted-foreground">You must be logged in to edit your profile.</p>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono text-primary tracking-widest border border-primary/30 px-2 py-0.5 bg-primary/5">EDIT_PROFILE</span>
        </div>
        <h1 className="text-3xl font-black font-mono tracking-tight flex items-center gap-3">
          <Edit className="h-7 w-7 text-primary" />
          Update_<span className="text-primary">Profile</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-2">Changes are immediately visible on your public profile.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          {/* Avatar */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-[10px] font-mono text-primary tracking-widest">AVATAR</span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <div className="p-5 border border-border bg-card/50">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-24 h-24 bg-muted border-2 border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-mono font-black text-muted-foreground/50 uppercase">
                      {currentUser?.displayName?.substring(0, 2) ?? "?"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-none font-mono text-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      {avatarUploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Camera className="h-3 w-3 mr-1" />}
                      {avatarUploading ? "UPLOADING..." : "UPLOAD"}
                    </Button>
                    <div className="flex gap-1">
                      <Select value={avatarStyle} onValueChange={setAvatarStyle}>
                        <SelectTrigger className="rounded-none font-mono text-xs h-8 w-[120px] border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="avataaars" className="font-mono text-xs">Avataaars</SelectItem>
                          <SelectItem value="bottts" className="font-mono text-xs">Bottts</SelectItem>
                          <SelectItem value="initials" className="font-mono text-xs">Initials</SelectItem>
                          <SelectItem value="identicon" className="font-mono text-xs">Identicon</SelectItem>
                          <SelectItem value="lorelei" className="font-mono text-xs">Lorelei</SelectItem>
                          <SelectItem value="thumbs" className="font-mono text-xs">Thumbs</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-none font-mono text-xs"
                        onClick={handleGenerateAvatar}
                        disabled={avatarGenerating}
                      >
                        {avatarGenerating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                        {avatarGenerating ? "..." : "GENERATE"}
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    Upload a photo or generate a unique avatar. Max 5MB.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Identity */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-[10px] font-mono text-primary tracking-widest">IDENTITY</span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 border border-border bg-card/50">
              <FormField control={form.control} name="displayName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-mono tracking-wider text-muted-foreground">DISPLAY NAME *</FormLabel>
                  <FormControl><Input {...field} className="rounded-none border-border bg-background font-mono focus-visible:ring-primary focus-visible:border-primary" /></FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="level" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-mono tracking-wider text-muted-foreground">LEVEL</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="rounded-none border-border bg-background font-mono focus:ring-primary">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(["beginner", "intermediate", "pro"] as const).map((l) => (
                        <SelectItem key={l} value={l} className="font-mono text-sm">{LEVEL_LABELS[l]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
              <div className="sm:col-span-2">
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-mono tracking-wider text-muted-foreground">COUNTY</FormLabel>
                    <Select value={field.value || "__no_county"} onValueChange={(v) => field.onChange(v === "__no_county" ? "" : v)}>
                      <FormControl>
                        <SelectTrigger className="rounded-none border-border bg-background font-mono focus:ring-primary">
                          <SelectValue placeholder="Select county…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[260px]">
                        <SelectItem value="__no_county">No county set</SelectItem>
                        {Object.entries(KENYA_COUNTIES).map(([region, counties]) => (
                          <SelectGroup key={region}>
                            <SelectLabel className="text-[10px] font-mono text-primary tracking-wider">{region.toUpperCase()}</SelectLabel>
                            {counties.map((c) => <SelectItem key={c} value={c} className="font-mono text-sm">{c}</SelectItem>)}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )} />
              </div>
            </div>
          </section>

          {/* Bio */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-[10px] font-mono text-primary tracking-widest">BIO</span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <div className="p-5 border border-border bg-card/50 space-y-4">
              <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-mono tracking-wider text-muted-foreground">ABOUT YOU</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} placeholder="What are you building? What drives you?" className="rounded-none border-border bg-background font-mono text-sm resize-none focus-visible:ring-primary focus-visible:border-primary" />
                  </FormControl>
                  <FormDescription className="text-[10px] font-mono">{(field.value ?? "").length}/500</FormDescription>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="lookingFor" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-mono tracking-wider text-muted-foreground">CURRENTLY LOOKING FOR</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder="e.g. Co-founder for a fintech app, backend dev for side project…" className="rounded-none border-border bg-background font-mono text-sm resize-none focus-visible:ring-primary focus-visible:border-primary" />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
            </div>
          </section>

          {/* Skills */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-[10px] font-mono text-primary tracking-widest">SKILLS</span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <div className="p-5 border border-border bg-card/50">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                <Input value={skillInput.name} onChange={(e) => setSkillInput({ ...skillInput, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  placeholder="e.g. React, Go, Figma" className="rounded-none border-border bg-background font-mono text-sm focus-visible:ring-primary focus-visible:border-primary" />
                <Select value={skillInput.category} onValueChange={(v) => setSkillInput({ ...skillInput, category: v as any })}>
                  <SelectTrigger className="rounded-none border-border bg-background font-mono text-sm focus:ring-primary"><SelectValue /></SelectTrigger>
                  <SelectContent>{SKILL_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="font-mono text-sm capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Select value={skillInput.proficiency} onValueChange={(v) => setSkillInput({ ...skillInput, proficiency: v as any })}>
                    <SelectTrigger className="rounded-none border-border bg-background font-mono text-sm focus:ring-primary flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{SKILL_PROFICIENCIES.map((p) => <SelectItem key={p} value={p} className="font-mono text-sm capitalize">{p}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button type="button" size="sm" onClick={addSkill} className="rounded-none h-9 w-9 p-0 bg-primary text-primary-foreground flex-shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/40">
                  {skills.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono bg-muted/40 border border-border px-2 py-1">
                      <Code2 className="h-2.5 w-2.5 text-primary/60" />
                      <span>{s.name}</span>
                      <span className="text-muted-foreground/50">·{s.category}·{s.proficiency}</span>
                      <button type="button" onClick={() => removeSkill(i)} className="text-muted-foreground hover:text-destructive transition-colors ml-0.5">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Links */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-[10px] font-mono text-primary tracking-widest">LINKS</span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 border border-border bg-card/50">
              <FormField control={form.control} name="githubUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-mono tracking-wider text-muted-foreground">GITHUB URL</FormLabel>
                  <FormControl><Input {...field} placeholder="https://github.com/…" className="rounded-none border-border bg-background font-mono text-sm focus-visible:ring-primary focus-visible:border-primary" /></FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="twitterUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-mono tracking-wider text-muted-foreground">X / TWITTER URL</FormLabel>
                  <FormControl><Input {...field} placeholder="https://x.com/…" className="rounded-none border-border bg-background font-mono text-sm focus-visible:ring-primary focus-visible:border-primary" /></FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
            </div>
          </section>

          {/* Save */}
          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1 rounded-none font-mono text-xs border border-border/50 text-muted-foreground hover:text-foreground"
              onClick={() => navigate(`/profile/${currentUser.id}`)}>
              CANCEL
            </Button>
            <Button type="submit" disabled={isSaving} className="flex-[2] rounded-none font-mono text-sm bg-primary text-primary-foreground hover:bg-primary/90 h-11">
              {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Save className="h-4 w-4 mr-2" /> SAVE_CHANGES</>}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
