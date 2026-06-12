import { useState } from "react";
import { useListRooms } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { MessageSquare, Code, Lightbulb, Users, Activity } from "lucide-react";

export default function Rooms() {
  const [filterType, setFilterType] = useState<string>("");
  
  const { data: rooms, isLoading } = useListRooms({
    type: filterType as any || undefined
  });

  const getRoomIcon = (type: string) => {
    switch(type) {
      case 'discussion': return <MessageSquare className="h-4 w-4" />;
      case 'project': return <Code className="h-4 w-4" />;
      case 'learning': return <Lightbulb className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoomColor = (type: string) => {
    switch(type) {
      case 'discussion': return 'border-secondary text-secondary bg-secondary/10';
      case 'project': return 'border-primary text-primary bg-primary/10';
      case 'learning': return 'border-purple-500 text-purple-400 bg-purple-500/10';
      default: return 'border-muted-foreground text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 font-mono uppercase tracking-tight">
            Active_Rooms
          </h1>
          <p className="text-muted-foreground">
            Join focused spaces to discuss tech, collaborate on projects, or learn together.
          </p>
        </div>
        <Link href="/create-room">
          <Button className="rounded-none font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_10px_rgba(22,163,74,0.3)]">
            + CREATE_ROOM
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 border-b border-border/50">
        <Button 
          variant={filterType === "" ? "default" : "ghost"} 
          className={`rounded-none font-mono text-xs h-8 ${filterType === "" ? "bg-foreground text-background" : "text-muted-foreground"}`}
          onClick={() => setFilterType("")}
        >
          ALL
        </Button>
        <Button 
          variant={filterType === "discussion" ? "default" : "ghost"} 
          className={`rounded-none font-mono text-xs h-8 ${filterType === "discussion" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}
          onClick={() => setFilterType("discussion")}
        >
          DISCUSSION
        </Button>
        <Button 
          variant={filterType === "project" ? "default" : "ghost"} 
          className={`rounded-none font-mono text-xs h-8 ${filterType === "project" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => setFilterType("project")}
        >
          PROJECT
        </Button>
        <Button 
          variant={filterType === "learning" ? "default" : "ghost"} 
          className={`rounded-none font-mono text-xs h-8 ${filterType === "learning" ? "bg-purple-600 text-white" : "text-muted-foreground"}`}
          onClick={() => setFilterType("learning")}
        >
          LEARNING
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-40 border border-border bg-card animate-pulse"></div>
          ))}
        </div>
      ) : rooms?.length === 0 ? (
        <div className="p-12 border border-dashed border-border bg-muted/10 flex flex-col items-center justify-center text-center">
          <Activity className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2 font-mono text-foreground">NO_ROOMS_FOUND</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            There are no active rooms matching this category right now.
          </p>
          <Link href="/create-room">
            <Button variant="outline" className="rounded-none font-mono border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              BE_THE_FIRST
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms?.map((room, i) => (
            <motion.div 
              key={room.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col p-6 bg-card border border-border hover:border-foreground/30 transition-colors group relative"
            >
              {room.isPinned && (
                <div className="absolute top-0 right-0 w-0 h-0 border-t-[30px] border-r-[30px] border-t-primary border-r-transparent"></div>
              )}
              
              <div className="flex items-start justify-between mb-3">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 border text-[10px] font-mono uppercase font-bold ${getRoomColor(room.type)}`}>
                  {getRoomIcon(room.type)}
                  {room.type}
                </div>
                {room.isPrivate && (
                  <Badge variant="outline" className="rounded-none text-[10px] font-mono">PRIVATE</Badge>
                )}
              </div>
              
              <h2 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">{room.name}</h2>
              <p className="text-sm text-muted-foreground mb-5 line-clamp-2 flex-1">
                {room.description || "No description provided."}
              </p>
              
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {room.skills.slice(0, 3).map(skill => (
                    <span key={skill} className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground border border-border font-mono">
                      {skill}
                    </span>
                  ))}
                  {room.skills.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-background border border-dashed border-muted-foreground text-muted-foreground font-mono">
                      +{room.skills.length - 3}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {room.memberCount}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {room.postCount}</span>
                </div>
                <Link href={`/rooms/${room.id}`}>
                  <Button variant="ghost" size="sm" className="h-8 rounded-none font-mono text-xs group-hover:bg-primary group-hover:text-primary-foreground hover:bg-primary/90">
                    ENTER &rarr;
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
