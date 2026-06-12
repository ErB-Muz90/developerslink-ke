import { useState } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { useCurrentUser, ActiveUser } from "@/contexts/user-context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LogIn, LogOut, ChevronDown } from "lucide-react";

export function UserSelector() {
  const { currentUser, setCurrentUser } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const { data: users } = useListUsers({ limit: 20 }, { query: { staleTime: 60_000, queryKey: ["users-for-selector"] } });

  const handleSelect = (user: any) => {
    const activeUser: ActiveUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      level: user.level,
    };
    setCurrentUser(activeUser);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {currentUser ? (
          <button
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors h-9 px-2"
            data-testid="button-user-selector"
          >
            <div className="w-5 h-5 bg-muted flex items-center justify-center flex-shrink-0 border border-border/40">
              <span className="text-[8px] font-mono">
                {currentUser.displayName.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="hidden sm:block max-w-[80px] truncate">{currentUser.displayName.split(" ")[0]}</span>
            <ChevronDown className="h-3 w-3 flex-shrink-0" />
          </button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-xs font-mono text-muted-foreground hover:text-primary rounded-none"
            data-testid="button-sign-in-as"
          >
            <LogIn className="h-3.5 w-3.5 mr-1.5" />
            <span className="hidden sm:inline">Sign in as</span>
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent
        className="w-64 p-0 rounded-none border-border bg-background"
        align="end"
        sideOffset={8}
      >
        <div className="px-4 py-3 border-b border-border/40">
          <p className="text-[10px] font-mono text-muted-foreground tracking-wider">
            {currentUser ? "SWITCH PROFILE" : "SIGN IN AS"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select your developer profile
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {users?.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelect(user)}
              data-testid={`button-select-user-${user.id}`}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors ${
                currentUser?.id === user.id ? "bg-primary/5 border-l-2 border-primary" : ""
              }`}
            >
              <div className="w-7 h-7 bg-muted flex-shrink-0 flex items-center justify-center">
                <span className="text-[9px] font-mono text-muted-foreground">
                  {user.displayName.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{user.displayName}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{user.level}</p>
              </div>
              {currentUser?.id === user.id && (
                <span className="text-[9px] font-mono text-primary bg-primary/10 px-1 py-0.5 flex-shrink-0">
                  YOU
                </span>
              )}
            </button>
          ))}
        </div>

        {currentUser && (
          <div className="border-t border-border/40 p-2">
            <button
              onClick={() => { setCurrentUser(null); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-muted-foreground hover:text-destructive transition-colors"
              data-testid="button-sign-out"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
