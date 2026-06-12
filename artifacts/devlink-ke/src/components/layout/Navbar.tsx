import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Code2, Cpu, Wifi, Users, Zap, Home, PlusSquare, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserSelector } from "@/components/layout/UserSelector";
import { useCurrentUser } from "@/contexts/user-context";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Users },
  { href: "/rooms", label: "Rooms", icon: Wifi },
  { href: "/match", label: "Hook Up", icon: Zap },
];

const ACTION_LINKS = [
  { href: "/new-profile", label: "Join Network", icon: UserPlus },
  { href: "/create-room", label: "Create Room", icon: PlusSquare },
];

const SKILL_PILLS = ["Node.js", "Flutter", "AI/ML", "React", "DevOps", "Mikrotik"];

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentUser } = useCurrentUser();

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
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
          {/* User selector */}
          <UserSelector />

          {/* Notification bell — only when signed in */}
          <NotificationBell />

          <div className="w-px h-5 bg-border/50 mx-1" />

          {!currentUser && (
            <Link href="/new-profile" data-testid="link-join-desktop">
              <Button variant="outline" size="sm" className="font-mono text-xs rounded-none border-border/60 hover:border-primary/50">
                <UserPlus className="h-3 w-3 mr-1.5" /> Join
              </Button>
            </Link>
          )}
          <Link href="/create-room" data-testid="link-create-room-desktop">
            <Button size="sm" className="font-mono text-xs rounded-none bg-primary text-primary-foreground hover:bg-primary/90">
              <PlusSquare className="h-3 w-3 mr-1.5" /> Create Room
            </Button>
          </Link>
        </div>

        {/* Mobile right side */}
        <div className="md:hidden flex items-center gap-1">
          <NotificationBell />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-none"
                data-testid="button-mobile-menu"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {mobileOpen ? (
                    <motion.span
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <X className="h-5 w-5" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="open"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Menu className="h-5 w-5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-[280px] sm:w-[320px] bg-background border-l border-border/40 p-0 flex flex-col"
            >
              <SheetHeader className="p-6 pb-4 border-b border-border/30">
                <SheetTitle className="text-left">
                  <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-primary" />
                    <span className="font-mono font-bold text-lg tracking-tighter">
                      DL<span className="text-primary">_KE</span>
                    </span>
                  </Link>
                </SheetTitle>
                <div className="mt-3">
                  <UserSelector />
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto">
                {/* Main links */}
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3 px-2">NAVIGATE</p>
                  <nav className="space-y-1">
                    {NAV_LINKS.map((link, i) => {
                      const active = isActive(link.href);
                      const Icon = link.icon;
                      return (
                        <motion.div
                          key={link.href}
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <Link
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            data-testid={`link-mobile-${link.label.toLowerCase().replace(/\s/g, "-")}`}
                            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                              active
                                ? "text-primary bg-primary/8 border-l-2 border-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            }`}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            {link.label}
                            {active && (
                              <span className="ml-auto text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5">
                                HERE
                              </span>
                            )}
                          </Link>
                        </motion.div>
                      );
                    })}
                  </nav>
                </div>

                <div className="px-4 py-2 border-t border-border/20 mt-2">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3 px-2">ACTIONS</p>
                  <div className="space-y-2">
                    {ACTION_LINKS.map((link, i) => {
                      const Icon = link.icon;
                      return (
                        <motion.div
                          key={link.href}
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: (NAV_LINKS.length + i) * 0.05 }}
                        >
                          <Link
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            data-testid={`link-mobile-${link.label.toLowerCase().replace(/\s/g, "-")}`}
                          >
                            <Button
                              className={`w-full rounded-none font-mono text-xs justify-start ${
                                link.href === "/create-room"
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "bg-transparent border border-border/60 text-foreground hover:border-primary/50 hover:text-primary"
                              }`}
                              variant={link.href === "/create-room" ? "default" : "outline"}
                            >
                              <Icon className="h-3.5 w-3.5 mr-2" />
                              {link.label}
                            </Button>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Skill pills */}
                <div className="px-6 py-4 border-t border-border/20 mt-2">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">POPULAR SKILLS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SKILL_PILLS.map((skill) => (
                      <Link
                        key={skill}
                        href={`/explore?skill=${encodeURIComponent(skill)}`}
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className="text-[10px] px-2 py-1 font-mono border border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer">
                          {skill}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
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
  );
}
