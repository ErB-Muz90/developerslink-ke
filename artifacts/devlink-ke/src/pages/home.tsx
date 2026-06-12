import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { NetworkGraph } from "@/components/NetworkGraph";
import { useGetUserStats, useGetTopBuilders, useGetLiveRoomActivity } from "@workspace/api-client-react";
import { motion } from "framer-motion";

export default function Home() {
  const { data: stats } = useGetUserStats();
  const { data: topBuilders } = useGetTopBuilders({ limit: 4 });
  const { data: liveActivity } = useGetLiveRoomActivity({ limit: 4 });

  const categories = [
    { name: "Backend", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { name: "Mobile", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    { name: "AI/ML", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
    { name: "Networking", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    { name: "Design", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
    { name: "DevOps", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  ];

  return (
    <div className="flex flex-col flex-1 pb-16">
      {/* Hero Section */}
      <section className="relative w-full pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden flex flex-col items-center justify-center min-h-[70vh]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0" />
        <NetworkGraph />
        
        <div className="container px-4 md:px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4 font-mono">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Nairobi's Tech Hub, Digitized
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter sm:text-6xl text-foreground">
              Find Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Tech Circle</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-[42rem] mx-auto leading-relaxed">
              A tight, vibrant network for Kenya's tech builders. Level up your craft, find your team, and actually ship things together.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-8">
              <Link href="/explore">
                <Button size="lg" className="w-full sm:w-auto font-mono text-base h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 rounded-none border border-primary shadow-[0_0_15px_rgba(22,163,74,0.5)] transition-all hover:shadow-[0_0_25px_rgba(22,163,74,0.7)]">
                  Explore Builders
                </Button>
              </Link>
              <Link href="/rooms">
                <Button size="lg" variant="outline" className="w-full sm:w-auto font-mono text-base h-12 px-8 rounded-none border-border hover:bg-muted text-foreground transition-all">
                  Join a Room
                </Button>
              </Link>
            </div>

            {stats && (
              <div className="flex items-center justify-center gap-8 mt-12 pt-8 border-t border-border/50 text-sm font-mono text-muted-foreground w-full max-w-lg">
                <div className="flex flex-col items-center"><span className="text-2xl font-bold text-foreground">{stats.totalUsers}</span> Builders</div>
                <div className="flex flex-col items-center"><span className="text-2xl font-bold text-foreground">{stats.totalRooms}</span> Rooms</div>
                <div className="flex flex-col items-center"><span className="text-2xl font-bold text-foreground">{stats.totalPosts}</span> Collabs</div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Skills Grid */}
      <section className="py-16 bg-muted/20 border-y border-border/50">
        <div className="container px-4 md:px-6">
          <div className="mb-10 flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-mono text-foreground">EXPLORE_BY_CRAFT</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat, i) => (
              <motion.div 
                key={cat.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/explore?skill=${cat.name}`} className={`block p-4 border rounded-none text-center transition-transform hover:-translate-y-1 ${cat.color}`}>
                  <span className="font-mono font-bold text-sm">{cat.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Rooms */}
      <section className="py-16">
        <div className="container px-4 md:px-6">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-mono text-foreground flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-secondary animate-pulse"></span>
                LIVE_ROOMS
              </h2>
              <p className="text-muted-foreground mt-2">Active discussions happening right now</p>
            </div>
            <Link href="/rooms" className="hidden md:inline-flex text-primary font-mono text-sm hover:underline">VIEW_ALL</Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {liveActivity?.map((activity, i) => (
              <motion.div 
                key={activity.room.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative flex flex-col p-6 bg-card border border-border hover:border-secondary/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold font-mono text-muted-foreground uppercase">
                    {activity.room.type}
                  </div>
                  <div className="flex items-center text-xs font-mono text-secondary">
                    <span className="h-1.5 w-1.5 rounded-full bg-secondary mr-1.5"></span>
                    {activity.recentPostCount} recent
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-secondary transition-colors line-clamp-1">{activity.room.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">{activity.room.description}</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                  <span className="text-xs font-mono text-muted-foreground">{activity.room.memberCount} members</span>
                  <Link href={`/rooms/${activity.room.id}`} className="text-secondary font-mono text-sm group-hover:underline">ENTER &rarr;</Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Builders */}
      <section className="py-16 bg-muted/10 border-t border-border/50">
        <div className="container px-4 md:px-6">
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-mono text-foreground text-center">TOP_BUILDERS</h2>
            <p className="text-muted-foreground mt-2 text-center">The most active collaborators in the network</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topBuilders?.map((user, i) => (
              <motion.div 
                key={user.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center p-6 bg-card border border-border hover:border-primary/50 transition-colors text-center group"
              >
                <div className="w-20 h-20 rounded-full bg-muted border-2 border-border group-hover:border-primary transition-colors flex items-center justify-center overflow-hidden mb-4 relative">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-mono text-muted-foreground uppercase">{user.displayName.substring(0, 2)}</span>
                  )}
                  {user.level === 'pro' && (
                    <div className="absolute bottom-0 inset-x-0 bg-primary/90 text-primary-foreground text-[10px] font-bold font-mono py-0.5">PRO</div>
                  )}
                </div>
                <h3 className="text-lg font-bold">{user.displayName}</h3>
                <p className="text-sm font-mono text-muted-foreground mb-3">@{user.username}</p>
                <div className="flex flex-wrap justify-center gap-1 mb-4">
                  {user.skills.slice(0, 3).map(s => (
                    <span key={s.name} className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground border border-border font-mono">{s.name}</span>
                  ))}
                  {user.skills.length > 3 && <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground border border-border font-mono">+{user.skills.length - 3}</span>}
                </div>
                <Link href={`/profile/${user.id}`} className="mt-auto w-full">
                  <Button variant="outline" className="w-full rounded-none font-mono text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                    VIEW_PROFILE
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
