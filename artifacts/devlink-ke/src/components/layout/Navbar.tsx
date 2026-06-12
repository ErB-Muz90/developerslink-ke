import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [location] = useLocation();

  const links = [
    { href: "/explore", label: "Explore" },
    { href: "/rooms", label: "Rooms" },
    { href: "/match", label: "Hook Up" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-mono font-bold text-xl tracking-tighter text-primary">DL_KE</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {links.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`transition-colors hover:text-primary ${location === link.href ? "text-primary" : "text-muted-foreground"}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/new-profile">
            <Button variant="outline" className="font-mono text-xs">Join</Button>
          </Link>
          <Link href="/create-room">
            <Button className="font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90">Create Room</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
