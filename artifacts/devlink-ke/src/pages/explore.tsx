import { useState } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

export default function Explore() {
  const [skill, setSkill] = useState("");
  const [level, setLevel] = useState<string>("");
  const [location, setLocationQuery] = useState("");

  const { data: users, isLoading } = useListUsers({ 
    skill: skill || undefined, 
    level: level as any || undefined, 
    location: location || undefined 
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-mono uppercase tracking-tight">
          Explore_Builders
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Search the network for specific skills, experience levels, or locations to find the right people for your team.
        </p>
      </div>

      <div className="bg-card border border-border p-4 mb-8 flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-1/3">
          <label className="text-xs font-mono text-muted-foreground mb-1 block">SKILL</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="e.g. React, Python, UI/UX" 
              className="pl-9 rounded-none border-border bg-background font-mono focus-visible:ring-primary focus-visible:border-primary"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
            />
          </div>
        </div>
        
        <div className="w-full md:w-1/4">
          <label className="text-xs font-mono text-muted-foreground mb-1 block">LEVEL</label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="rounded-none border-border bg-background font-mono focus:ring-primary">
              <SelectValue placeholder="Any Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Level</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-1/3">
          <label className="text-xs font-mono text-muted-foreground mb-1 block">LOCATION</label>
          <Input 
            placeholder="e.g. Nairobi, Mombasa" 
            className="rounded-none border-border bg-background font-mono focus-visible:ring-primary focus-visible:border-primary"
            value={location}
            onChange={(e) => setLocationQuery(e.target.value)}
          />
        </div>

        <div className="w-full md:w-auto">
          <Button 
            className="w-full rounded-none font-mono bg-primary hover:bg-primary/90 text-primary-foreground border border-primary px-8"
            onClick={() => { setSkill(""); setLevel(""); setLocationQuery(""); }}
            variant="outline"
          >
            CLEAR
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 border border-border bg-card animate-pulse"></div>
          ))}
        </div>
      ) : users?.length === 0 ? (
        <div className="p-12 border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2 font-mono text-foreground">NO_BUILDERS_FOUND</h3>
          <p className="text-muted-foreground max-w-md">
            We couldn't find anyone matching your exact criteria. Try broadening your search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users?.map((user, i) => (
            <motion.div 
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col p-5 bg-card border border-border hover:border-primary/50 transition-colors group relative"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-none bg-muted border border-border flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-mono text-muted-foreground uppercase">{user.displayName.substring(0, 2)}</span>
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground line-clamp-1">{user.displayName}</h2>
                    <p className="text-xs font-mono text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
                <div className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold border ${
                  user.level === 'pro' ? 'border-primary text-primary bg-primary/10' : 
                  user.level === 'intermediate' ? 'border-secondary text-secondary bg-secondary/10' : 
                  'border-muted-foreground text-muted-foreground bg-muted'
                }`}>
                  {user.level}
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 h-10">
                {user.bio || "No bio provided."}
              </p>
              
              <div className="mb-5 flex-1">
                <div className="text-[10px] font-mono text-muted-foreground mb-2 uppercase">Top Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {user.skills.slice(0, 4).map(s => (
                    <span key={s.name} className="text-[10px] px-1.5 py-0.5 bg-muted/50 border border-border text-foreground hover:bg-muted transition-colors cursor-default">
                      {s.name}
                    </span>
                  ))}
                  {user.skills.length > 4 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-background border border-dashed border-muted-foreground text-muted-foreground">
                      +{user.skills.length - 4}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="text-xs font-mono text-muted-foreground">
                  {user.location || "Location hidden"}
                </div>
                <Link href={`/profile/${user.id}`}>
                  <Button variant="ghost" size="sm" className="h-8 rounded-none font-mono text-xs group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary border border-transparent">
                    PROFILE &rarr;
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
