import { useState } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Search, MapPin, X, Users } from "lucide-react";

const COUNTIES_BY_REGION: Record<string, string[]> = {
  "Nairobi": ["Nairobi"],
  "Central": ["Kiambu", "Muranga", "Kirinyaga", "Nyeri", "Nyandarua"],
  "Coast": ["Mombasa", "Kilifi", "Kwale", "Lamu", "Taita-Taveta", "Tana River"],
  "Eastern": ["Machakos", "Makueni", "Kitui", "Embu", "Tharaka-Nithi", "Meru", "Isiolo", "Marsabit"],
  "North Eastern": ["Garissa", "Wajir", "Mandera"],
  "Nyanza": ["Kisumu", "Siaya", "Homa Bay", "Migori", "Kisii", "Nyamira"],
  "Rift Valley": [
    "Nakuru", "Uasin Gishu", "Trans Nzoia", "Nandi", "Kericho", "Bomet",
    "Elgeyo-Marakwet", "West Pokot", "Baringo", "Laikipia", "Samburu",
    "Turkana", "Narok", "Kajiado", "Loitoktok"
  ],
  "Western": ["Kakamega", "Vihiga", "Bungoma", "Busia"],
};

const ALL_COUNTIES = Object.values(COUNTIES_BY_REGION).flat().sort();

export default function Explore() {
  const [skill, setSkill] = useState("");
  const [level, setLevel] = useState("all");
  const [county, setCounty] = useState("all");

  const { data: users, isLoading } = useListUsers({
    skill: skill || undefined,
    level: (level && level !== "all") ? level as any : undefined,
    location: (county && county !== "all") ? county : undefined,
  });

  const hasFilters = skill || (level && level !== "all") || (county && county !== "all");

  const clearAll = () => {
    setSkill("");
    setLevel("all");
    setCounty("all");
  };

  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono text-primary tracking-widest border border-primary/30 px-2 py-0.5 bg-primary/5">
            BUILDER_DIRECTORY
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black font-mono uppercase tracking-tight text-foreground mb-3">
          Explore_<span className="text-primary">Builders</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Find developers, designers, and tech builders across Kenya's 47 counties. Filter by skill, level, or location.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="border border-border bg-card/50 p-4 md:p-5 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          {/* Skill */}
          <div>
            <label className="text-[10px] font-mono text-muted-foreground mb-1.5 block tracking-wider">SKILL</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="React, Python, Flutter…"
                className="pl-8 rounded-none border-border bg-background font-mono text-sm focus-visible:ring-primary focus-visible:border-primary"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
              />
            </div>
          </div>

          {/* Level */}
          <div>
            <label className="text-[10px] font-mono text-muted-foreground mb-1.5 block tracking-wider">LEVEL</label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="rounded-none border-border bg-background font-mono text-sm focus:ring-primary">
                <SelectValue placeholder="Any Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Level</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* County */}
          <div>
            <label className="text-[10px] font-mono text-muted-foreground mb-1.5 block tracking-wider">COUNTY</label>
            <Select value={county} onValueChange={setCounty}>
              <SelectTrigger className="rounded-none border-border bg-background font-mono text-sm focus:ring-primary">
                <SelectValue placeholder="All Counties">
                  {county && county !== "all" ? (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-primary" />
                      {county}
                    </span>
                  ) : "All Counties"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                <SelectItem value="all">All Counties</SelectItem>
                {Object.entries(COUNTIES_BY_REGION).map(([region, counties]) => (
                  <SelectGroup key={region}>
                    <SelectLabel className="text-[10px] font-mono text-primary tracking-wider px-2">
                      {region.toUpperCase()}
                    </SelectLabel>
                    {counties.map((c) => (
                      <SelectItem key={c} value={c} className="font-mono text-sm">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear */}
          <div>
            <Button
              className="w-full rounded-none font-mono text-xs border border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
              variant="ghost"
              onClick={clearAll}
              disabled={!hasFilters}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              CLEAR_FILTERS
            </Button>
          </div>
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/40">
            <span className="text-[10px] font-mono text-muted-foreground">Active:</span>
            {skill && (
              <span className="flex items-center gap-1 text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5">
                skill:{skill}
                <button onClick={() => setSkill("")} className="ml-1 hover:text-primary/70"><X className="h-2.5 w-2.5" /></button>
              </span>
            )}
            {level && level !== "all" && (
              <span className="flex items-center gap-1 text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5">
                level:{level}
                <button onClick={() => setLevel("all")} className="ml-1 hover:text-primary/70"><X className="h-2.5 w-2.5" /></button>
              </span>
            )}
            {county && county !== "all" && (
              <span className="flex items-center gap-1 text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5">
                <MapPin className="h-2.5 w-2.5" />{county}
                <button onClick={() => setCounty("all")} className="ml-1 hover:text-primary/70"><X className="h-2.5 w-2.5" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results header */}
      {!isLoading && users && (
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>
              <span className="text-foreground font-bold">{users.length}</span>
              {" "}builder{users.length !== 1 ? "s" : ""} found
              {hasFilters && " matching filters"}
            </span>
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-52 border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : users?.length === 0 ? (
        <div className="py-20 border border-dashed border-border bg-muted/5 flex flex-col items-center justify-center text-center">
          <Search className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-black font-mono mb-1">NO_BUILDERS_FOUND</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            No one matches your filters right now. Try broadening your search or{" "}
            <button onClick={clearAll} className="text-primary underline-offset-2 hover:underline">clear all filters</button>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users?.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className="flex flex-col bg-card border border-border hover:border-primary/50 transition-all duration-200 group relative overflow-hidden"
            >
              {/* Top accent line on hover */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

              <div className="p-5 flex flex-col flex-1">
                {/* Avatar + name row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-muted/60 border border-border flex items-center justify-center flex-shrink-0 group-hover:border-primary/30 transition-colors">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base font-mono font-bold text-muted-foreground/60 uppercase">
                          {user.displayName.substring(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-foreground text-sm leading-tight truncate">{user.displayName}</h2>
                      <p className="text-[11px] font-mono text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 px-2 py-0.5 text-[9px] font-mono uppercase font-bold border ${
                    user.level === "pro"
                      ? "border-primary/50 text-primary bg-primary/8"
                      : user.level === "intermediate"
                      ? "border-secondary/50 text-secondary bg-secondary/8"
                      : "border-border text-muted-foreground"
                  }`}>
                    {user.level}
                  </span>
                </div>

                {/* Bio */}
                <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed flex-none min-h-[2.5rem]">
                  {user.bio || "No bio yet."}
                </p>

                {/* Skills */}
                <div className="mb-4 flex-1">
                  <p className="text-[9px] font-mono text-muted-foreground/60 tracking-wider mb-1.5">TOP_SKILLS</p>
                  <div className="flex flex-wrap gap-1">
                    {user.skills.slice(0, 4).map(s => (
                      <span
                        key={s.name}
                        className="text-[10px] px-1.5 py-0.5 bg-muted/40 border border-border/60 text-muted-foreground font-mono"
                      >
                        {s.name}
                      </span>
                    ))}
                    {user.skills.length > 4 && (
                      <span className="text-[10px] px-1.5 py-0.5 border border-dashed border-border text-muted-foreground/60 font-mono">
                        +{user.skills.length - 4}
                      </span>
                    )}
                    {user.skills.length === 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground/40">—</span>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border/40">
                  {user.location ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                      <MapPin className="h-2.5 w-2.5 text-primary/60" />
                      {user.location}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-muted-foreground/40">—</span>
                  )}
                  <Link href={`/profile/${user.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-3 rounded-none font-mono text-[10px] border border-transparent group-hover:border-primary/30 group-hover:text-primary group-hover:bg-primary/5 transition-all"
                    >
                      PROFILE →
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
