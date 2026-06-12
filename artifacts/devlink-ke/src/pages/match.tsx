import { useState } from "react";
import { useMatchDevelopers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { motion } from "framer-motion";
import { Zap, Target, Search, User as UserIcon } from "lucide-react";

const matchSchema = z.object({
  skills: z.string().min(1, "Enter at least one skill").transform(v => v.split(',').map(s => s.trim()).filter(Boolean)),
  level: z.enum(["beginner", "intermediate", "pro"]).optional(),
  location: z.string().optional(),
  lookingFor: z.string().optional(),
});

export default function Match() {
  const [hasSearched, setHasSearched] = useState(false);
  
  const form = useForm<z.input<typeof matchSchema>>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      skills: "",
      location: "",
      lookingFor: "",
    }
  });

  const matchDevelopers = useMatchDevelopers({
    mutation: {
      onSuccess: () => {
        setHasSearched(true);
      }
    }
  });

  const onSubmit = (data: z.output<typeof matchSchema>) => {
    matchDevelopers.mutate({ 
      data: {
        skills: data.skills,
        level: data.level,
        location: data.location,
        lookingFor: data.lookingFor,
        limit: 10
      }
    });
  };

  const results = matchDevelopers.data || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-mono uppercase tracking-tight flex items-center gap-3">
          <Zap className="h-8 w-8 text-primary" />
          Hook_Up
        </h1>
        <p className="text-muted-foreground">
          Our smart matching algorithm connects you with builders who complement your skills and share your goals. Describe what you're looking for, and we'll find your perfect technical co-founder, mentor, or team member.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <div className="bg-card border border-border p-6 shadow-sm">
            <h2 className="font-mono font-bold text-xl mb-6 pb-4 border-b border-border/50 text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 text-secondary" />
              MATCH_CRITERIA
            </h2>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Required Skills (Comma separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="React, Node.js, System Design" className="rounded-none font-mono focus-visible:ring-primary" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Minimum Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-none font-mono focus-visible:ring-primary">
                              <SelectValue placeholder="Any Level" />
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
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Nairobi" className="rounded-none font-mono focus-visible:ring-primary" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="lookingFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Project Context</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="I'm building a fintech app and need someone strong in backend architecture..." 
                          className="rounded-none font-mono focus-visible:ring-primary resize-none min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full rounded-none font-mono bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base shadow-[0_0_15px_rgba(22,163,74,0.3)] transition-all hover:shadow-[0_0_20px_rgba(22,163,74,0.5)]"
                  disabled={matchDevelopers.isPending}
                >
                  {matchDevelopers.isPending ? "SEARCHING_NETWORK..." : "FIND_MATCHES"}
                </Button>
              </form>
            </Form>
          </div>
        </div>

        <div className="lg:col-span-7">
          {matchDevelopers.isPending ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-card border border-border animate-pulse"></div>
              ))}
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div className="h-64 border border-dashed border-border bg-muted/5 flex flex-col items-center justify-center p-6 text-center">
              <Search className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
              <h3 className="font-mono font-bold text-lg mb-2">NO_MATCHES_FOUND</h3>
              <p className="text-muted-foreground max-w-sm">
                Try loosening your criteria. The network is growing, but highly specific combinations might not be available yet.
              </p>
            </div>
          ) : hasSearched && results.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-mono font-bold text-sm text-muted-foreground uppercase mb-4">
                Found {results.length} Potential {results.length === 1 ? 'Match' : 'Matches'}
              </h3>
              
              {results.map((match, i) => (
                <motion.div 
                  key={match.user.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-5 bg-card border border-border hover:border-primary/50 transition-colors relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 bottom-0 w-1 bg-gradient-to-b from-primary to-secondary opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-none bg-muted border border-border flex items-center justify-center overflow-hidden">
                        {match.user.avatarUrl ? (
                          <img src={match.user.avatarUrl} alt={match.user.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-mono text-muted-foreground"><UserIcon className="h-6 w-6" /></span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {match.user.displayName}
                        </h3>
                        <p className="text-xs font-mono text-muted-foreground">@{match.user.username}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="text-2xl font-bold font-mono text-primary">
                        {Math.round(match.matchScore * 100)}%
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Match Score</div>
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 border border-border/50 p-3 mb-4">
                    <div className="text-[10px] font-mono text-secondary uppercase mb-2 font-bold flex items-center gap-1">
                      <SparkleIcon className="h-3 w-3" /> Why it's a match
                    </div>
                    <ul className="space-y-1">
                      {match.matchReasons.map((reason, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">-</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                    <div className="flex gap-2">
                      <div className="px-2 py-0.5 text-[10px] font-mono uppercase border border-border bg-background text-muted-foreground">
                        {match.user.level}
                      </div>
                      {match.user.location && (
                        <div className="px-2 py-0.5 text-[10px] font-mono uppercase border border-border bg-background text-muted-foreground">
                          {match.user.location}
                        </div>
                      )}
                    </div>
                    
                    <Link href={`/profile/${match.user.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 rounded-none font-mono text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary border border-transparent">
                        VIEW_PROFILE &rarr;
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="h-full min-h-[300px] border border-border bg-card/30 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>
              <Target className="h-16 w-16 text-primary/40 mb-6" />
              <h3 className="font-mono font-bold text-xl mb-3 text-foreground">AWAITING_CRITERIA</h3>
              <p className="text-muted-foreground max-w-md">
                Fill out the criteria on the left to scan the network. Our algorithm analyzes skills, experience levels, and stated goals to find the best possible collaborators.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SparkleIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
