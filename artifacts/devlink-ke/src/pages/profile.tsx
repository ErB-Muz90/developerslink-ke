import { useGetUser } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Github, Twitter, MapPin, Calendar, Terminal, Hash, MessageSquare } from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const params = useParams();
  const userId = parseInt(params.id || "0");
  const { data: user, isLoading } = useGetUser(userId, { query: { enabled: !!userId } });

  if (isLoading) return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <Skeleton className="w-32 h-32" />
        <div className="flex-1 space-y-4 w-full">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full mt-8" />
        </div>
      </div>
    </div>
  );
  
  if (!user) return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold font-mono">USER_NOT_FOUND</h1>
      <p className="text-muted-foreground mt-2 mb-6">This builder profile does not exist.</p>
      <Link href="/explore">
        <Button className="rounded-none font-mono">EXPLORE_BUILDERS</Button>
      </Link>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column - Identity */}
        <div className="md:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-card border border-border flex flex-col items-center text-center relative overflow-hidden"
          >
            {/* Level Banner */}
            <div className={`absolute top-0 inset-x-0 h-1 ${
              user.level === 'pro' ? 'bg-primary' : 
              user.level === 'intermediate' ? 'bg-secondary' : 
              'bg-muted-foreground'
            }`}></div>
            
            <div className="w-32 h-32 mb-6 rounded-none border-4 border-background outline outline-1 outline-border bg-muted flex items-center justify-center overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-mono text-muted-foreground font-bold">{user.displayName.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-1">{user.displayName}</h1>
            <p className="text-muted-foreground font-mono text-sm mb-4">@{user.username}</p>
            
            <div className={`px-3 py-1 text-xs font-mono uppercase font-bold border mb-6 w-full ${
              user.level === 'pro' ? 'border-primary text-primary bg-primary/10' : 
              user.level === 'intermediate' ? 'border-secondary text-secondary bg-secondary/10' : 
              'border-muted-foreground text-muted-foreground bg-muted'
            }`}>
              {user.level} Builder
            </div>
            
            <div className="w-full space-y-3 pt-4 border-t border-border/50 text-left">
              {user.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> <span>{user.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" /> <span>Joined {format(new Date(user.createdAt), 'MMM yyyy')}</span>
              </div>
              
              <div className="flex gap-2 pt-4">
                {user.githubUrl && (
                  <a href={user.githubUrl} target="_blank" rel="noreferrer" className="flex-1">
                    <Button variant="outline" className="w-full rounded-none h-9 hover:bg-foreground hover:text-background">
                      <Github className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {user.twitterUrl && (
                  <a href={user.twitterUrl} target="_blank" rel="noreferrer" className="flex-1">
                    <Button variant="outline" className="w-full rounded-none h-9 hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2]">
                      <Twitter className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-card border border-border text-center">
              <Hash className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <div className="text-2xl font-mono font-bold text-foreground">{user.roomsJoined}</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase">Rooms</div>
            </div>
            <div className="p-4 bg-card border border-border text-center">
              <MessageSquare className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <div className="text-2xl font-mono font-bold text-foreground">{user.postsCount}</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase">Posts</div>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="md:col-span-2 space-y-8">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="font-mono font-bold text-lg mb-4 text-foreground flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" /> ABOUT
            </h2>
            <div className="p-6 bg-card border border-border min-h-[120px]">
              {user.bio ? (
                <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{user.bio}</p>
              ) : (
                <p className="text-muted-foreground italic font-mono text-sm">No bio provided.</p>
              )}
            </div>
          </motion.div>

          {user.lookingFor && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="font-mono font-bold text-lg mb-4 text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center text-secondary border border-secondary/50 text-xs font-bold">!</span> 
                CURRENTLY_LOOKING_FOR
              </h2>
              <div className="p-6 bg-secondary/5 border border-secondary/30 relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
                <p className="text-foreground/90 italic">{user.lookingFor}</p>
              </div>
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="font-mono font-bold text-lg mb-4 text-foreground flex items-center gap-2">
              <div className="flex gap-0.5"><div className="w-1.5 h-5 bg-primary"></div><div className="w-1.5 h-5 bg-primary opacity-50"></div><div className="w-1.5 h-5 bg-primary opacity-20"></div></div>
              TECHNICAL_ARSENAL
            </h2>
            
            {user.skills.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user.skills.map((skill, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-border bg-card hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="font-bold text-foreground">{skill.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">{skill.category}</div>
                    </div>
                    <div className={`text-[10px] font-mono uppercase px-2 py-1 border ${
                      skill.proficiency === 'pro' ? 'border-primary text-primary' : 
                      skill.proficiency === 'intermediate' ? 'border-secondary text-secondary' : 
                      'border-muted-foreground text-muted-foreground'
                    }`}>
                      {skill.proficiency}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-card border border-dashed border-border text-center">
                <p className="text-muted-foreground font-mono text-sm">No specific skills listed.</p>
              </div>
            )}
          </motion.div>

        </div>

      </div>
    </div>
  );
}
