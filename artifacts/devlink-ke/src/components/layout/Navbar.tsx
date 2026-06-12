import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Code2, Cpu, Wifi, Users, Zap, Home, PlusSquare, UserPlus, LogIn, LogOut, User, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useCurrentUser } from "@/contexts/user-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Users },
  { href: "/rooms", label: "Rooms", icon: Wifi },
  { href: "/match", label: "Hook Up", icon: Zap },
];

const SKILL_PILLS = ["Node.js", "Flutter", "AI/ML", "React", "DevOps", "Mikrotik"];

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { currentUser, isLoading, setCurrentUser } = useCurrentUser();
  const { toast } = useToast();

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setCurrentUser(null);
      setProfileOpen(false);
      toast({ title: "Logged out", description: "See you next time." });
    } catch {
      toast({ title: "Error", description: "Failed to log out", variant: "destructive" });
    }
  };

  const UserMenu = () => (
    <Popover open={profileOpen} onOpenChange={setProfileOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 h-9 px-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-user-menu"
        >
          <div className="w-6 h-6 bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] font-mono font-bold text-primary">
              {currentUser!.displayName.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <span className="hidden sm:block max-w-[90px] truncate font-medium text-foreground">
            {currentUser!.displayName.split(" ")[0]}
          </span>
          <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-0 rounded-none border-border bg-background" align="end" sideOffset={8}>
        <div className="px-4 py-3 border-b border-border/40">
          <p className="font-semibold text-sm text-foreground">{currentUser!.displayName}</p>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">@{currentUser!.username}</p>
          <span className={`mt-1.5 inline-block text-[9px] px-1.5 py-0.5 border font-mono ${
            currentUser!.level === "pro"
              ? "text-primary border-primary/30 bg-primary/5"
              : currentUser!.level === "intermediate"
              ? "text-secondary border-secondary/30 bg-secondary/5"
              : "text-muted-foreground border-border"
          }`}>
            {currentUser!.level.toUpperCase()}
          </span>
        </div>
        <div className="p-1">
          <Link href={`/profile/${currentUser!.id}`} onClick={() => setProfileOpen(false)}>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              data-testid="link-my-profile"
            >
              <User className="h-3.5 w-3.5" />
              My Profile
            </button>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
          {/* Logo + Desktop nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group" data-testid="link-home-logo">
              <Code2 className="h-4 w-4 text-primary group-hover:rotate-12 transition-transform duration-200" />
              <span className="font-mono font-bold text-lg tracking-tighter text-foreground">
                DL<span className="text-primary">_KE</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    data-testid={`link-nav-${link.label.toLowerCase().replace(/\s/g, "-")}`}
                    className={`relative px-3 py-1.5 text-sm font-medium transition-colors hover:text-primary ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
                      />
                    )}
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-2">
            {isLoading ? (
              <div className="h-8 w-24 bg-muted/30 animate-pulse" />
            ) : currentUser ? (
              <>
                <NotificationBell />
                <div className="w-px h-5 bg-border/50 mx-1" />
                <UserMenu />
                <Link href="/create-room" data-testid="link-create-room-desktop">
                  <Button size="sm" className="font-mono text-xs rounded-none bg-primary text-primary-foreground hover:bg-primary/90 ml-1">
                    <PlusSquare className="h-3 w-3 mr-1.5" /> Create Room
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-mono text-xs rounded-none text-muted-foreground hover:text-primary"
                  onClick={() => setAuthOpen(true)}
                  data-testid="button-login"
                >
                  <LogIn className="h-3.5 w-3.5 mr-1.5" />
                  Log in
                </Button>
                <Link href="/new-profile" data-testid="link-join-desktop">
                  <Button size="sm" className="font-mono text-xs rounded-none bg-primary text-primary-foreground hover:bg-primary/90">
                    <UserPlus className="h-3 w-3 mr-1.5" /> Join
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile right side */}
          <div className="md:hidden flex items-center gap-1">
            {currentUser && <NotificationBell />}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-none" data-testid="button-mobile-menu">
                  <AnimatePresence mode="wait" initial={false}>
                    {mobileOpen ? (
                      <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                        <X className="h-5 w-5" />
                      </motion.span>
                    ) : (
                      <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                        <Menu className="h-5 w-5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-background border-l border-border/40 p-0 flex flex-col">
                <SheetHeader className="p-6 pb-4 border-b border-border/30">
                  <SheetTitle className="text-left">
                    <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-primary" />
                      <span className="font-mono font-bold text-lg tracking-tighter">DL<span className="text-primary">_KE</span></span>
                    </Link>
                  </SheetTitle>

                  {/* Mobile auth state */}
                  {currentUser ? (
                    <div className="mt-3 flex items-center gap-3 p-3 bg-muted/20 border border-border/40">
                      <div className="w-8 h-8 bg-primary/10 border border-primary/30 flex items-center justify-center">
                        <span className="text-[10px] font-mono font-bold text-primary">
                          {currentUser.displayName.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{currentUser.displayName}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">@{currentUser.username}</p>
                      </div>
                      <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="text-muted-foreground hover:text-destructive transition-colors">
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="rounded-none font-mono text-xs border-border/60" onClick={() => { setMobileOpen(false); setAuthOpen(true); }}>
                        <LogIn className="h-3 w-3 mr-1" /> Log in
                      </Button>
                      <Link href="/new-profile" onClick={() => setMobileOpen(false)}>
                        <Button size="sm" className="w-full rounded-none font-mono text-xs bg-primary text-primary-foreground">
                          <UserPlus className="h-3 w-3 mr-1" /> Join
                        </Button>
                      </Link>
                    </div>
                  )}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                  <div className="px-4 pt-4 pb-2">
                    <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3 px-2">NAVIGATE</p>
                    <nav className="space-y-1">
                      {NAV_LINKS.map((link, i) => {
                        const active = isActive(link.href);
                        const Icon = link.icon;
                        return (
                          <motion.div key={link.href} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                            <Link
                              href={link.href}
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                                active ? "text-primary bg-primary/8 border-l-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                              }`}
                            >
                              <Icon className="h-4 w-4 flex-shrink-0" />
                              {link.label}
                              {active && <span className="ml-auto text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5">HERE</span>}
                            </Link>
                          </motion.div>
                        );
                      })}
                    </nav>
                  </div>

                  {currentUser && (
                    <div className="px-4 py-2 border-t border-border/20 mt-2">
                      <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3 px-2">ACTIONS</p>
                      <div className="space-y-2">
                        <Link href={`/profile/${currentUser.id}`} onClick={() => setMobileOpen(false)}>
                          <Button variant="outline" className="w-full rounded-none font-mono text-xs justify-start border-border/60">
                            <User className="h-3.5 w-3.5 mr-2" /> My Profile
                          </Button>
                        </Link>
                        <Link href="/create-room" onClick={() => setMobileOpen(false)}>
                          <Button className="w-full rounded-none font-mono text-xs justify-start bg-primary text-primary-foreground">
                            <PlusSquare className="h-3.5 w-3.5 mr-2" /> Create Room
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="px-6 py-4 border-t border-border/20 mt-2">
                    <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">POPULAR SKILLS</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SKILL_PILLS.map((skill) => (
                        <Link key={skill} href={`/explore?skill=${encodeURIComponent(skill)}`} onClick={() => setMobileOpen(false)}>
                          <span className="text-[10px] px-2 py-1 font-mono border border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer">
                            {skill}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-border/30 bg-muted/10">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                    <Cpu className="h-3 w-3 text-primary" />
                    <span>Kenya's structured tech network</span>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
