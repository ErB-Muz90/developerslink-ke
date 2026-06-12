import { useState } from "react";
import { useCreateUser } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Code2, Trash2 } from "lucide-react";
import { Label } from "recharts";

// Helper schemas
const skillCategoryEnum = z.enum(["backend", "frontend", "mobile", "ai", "networking", "design", "devops", "other"]);
const skillProficiencyEnum = z.enum(["beginner", "intermediate", "pro"]);

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20).regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric only"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  bio: z.string().max(500, "Bio too long").optional(),
  location: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "pro"]),
  lookingFor: z.string().optional(),
  githubUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  twitterUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export default function NewProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Custom skills state since nested dynamic arrays in react-hook-form can be overkill for this aesthetic
  const [skills, setSkills] = useState<Array<{name: string, category: any, proficiency: any}>>([]);
  const [skillInput, setSkillInput] = useState({ name: "", category: "frontend", proficiency: "intermediate" });

  const form = useForm<z.input<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      displayName: "",
      bio: "",
      location: "",
      level: "intermediate",
      lookingFor: "",
      githubUrl: "",
      twitterUrl: "",
    }
  });

  const createUser = useCreateUser({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Profile created!", description: "Welcome to DevLink KE." });
        setLocation(`/profile/${data.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create profile. Username might be taken.", variant: "destructive" });
      }
    }
  });

  const addSkill = () => {
    if (!skillInput.name.trim()) return;
    setSkills([...skills, { 
      name: skillInput.name.trim(), 
      category: skillInput.category as any, 
      proficiency: skillInput.proficiency as any 
    }]);
    setSkillInput({ ...skillInput, name: "" }); // Reset name
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const onSubmit = (data: z.output<typeof profileSchema>) => {
    if (skills.length === 0) {
      toast({ title: "Skills required", description: "Please add at least one skill", variant: "destructive" });
      return;
    }
    
    createUser.mutate({
      data: {
        ...data,
        githubUrl: data.githubUrl || undefined,
        twitterUrl: data.twitterUrl || undefined,
        skills: skills as any
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8 border-b border-border/50 pb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 font-mono uppercase tracking-tight flex items-center gap-3">
          <UserPlus className="h-8 w-8 text-primary" />
          INIT_PROFILE
        </h1>
        <p className="text-muted-foreground">
          Create your builder profile to connect with the network. Be precise about your skills and goals.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          
          {/* Identity Section */}
          <div className="space-y-6">
            <h3 className="font-mono font-bold text-lg text-secondary border-l-2 border-secondary pl-3">IDENTITY</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 border border-border">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Handle</FormLabel>
                  <FormControl>
                    <Input placeholder="johndoe_ke" className="rounded-none font-mono focus-visible:ring-primary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="displayName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Display Name</FormLabel>
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
                        <SelectValue placeholder="Select level" />
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
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">City / Hub</FormLabel>
                  <FormControl>
                    <Input placeholder="Nairobi" className="rounded-none font-mono focus-visible:ring-primary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <h3 className="font-mono font-bold text-lg text-secondary border-l-2 border-secondary pl-3">DETAILS</h3>
            
            <div className="space-y-6 bg-card p-6 border border-border">
              <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Bio</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Full stack developer obsessed with performance..." className="rounded-none font-mono focus-visible:ring-primary resize-none h-24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="lookingFor" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Current Objective / Looking For</FormLabel>
                  <FormDescription className="text-[10px] font-mono">What are you trying to achieve on DevLink KE?</FormDescription>
                  <FormControl>
                    <Input placeholder="Looking for a frontend dev to help build a fintech MVP" className="rounded-none font-mono focus-visible:ring-primary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Skills Section */}
          <div className="space-y-6">
            <h3 className="font-mono font-bold text-lg text-primary border-l-2 border-primary pl-3 flex justify-between items-center">
              TECHNICAL_ARSENAL
              <span className="text-xs text-muted-foreground font-normal">At least 1 required</span>
            </h3>
            
            <div className="bg-card p-6 border border-border space-y-6">
              
              {/* Added Skills */}
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

              {/* Add Skill Form */}
              <div className="flex flex-col md:flex-row gap-3 items-end p-4 border border-dashed border-border bg-muted/5">
                <div className="flex-1 w-full">
                  <Label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Skill Name</Label>
                  <Input 
                    value={skillInput.name} 
                    onChange={e => setSkillInput({...skillInput, name: e.target.value})} 
                    placeholder="e.g. React, PostgreSQL" 
                    className="rounded-none font-mono h-9"
                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                  />
                </div>
                <div className="w-full md:w-32">
                  <Label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Category</Label>
                  <Select value={skillInput.category} onValueChange={v => setSkillInput({...skillInput, category: v})}>
                    <SelectTrigger className="rounded-none font-mono h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {skillCategoryEnum.options.map(opt => (
                        <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-32">
                  <Label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Proficiency</Label>
                  <Select value={skillInput.proficiency} onValueChange={v => setSkillInput({...skillInput, proficiency: v})}>
                    <SelectTrigger className="rounded-none font-mono h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {skillProficiencyEnum.options.map(opt => (
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
            className="w-full rounded-none font-mono text-base h-14 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(22,163,74,0.3)] transition-all"
            disabled={createUser.isPending}
          >
            {createUser.isPending ? "INITIALIZING..." : "INITIALIZE_PROFILE"}
          </Button>

        </form>
      </Form>
    </div>
  );
}
