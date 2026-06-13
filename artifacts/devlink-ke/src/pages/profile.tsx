import { useState, useEffect } from "react";
import { useGetUser } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/contexts/user-context";
import {
  Github, Twitter, MapPin, Calendar, Terminal, Hash, MessageSquare,
  Zap, Share2, Check, Loader2, Edit, ExternalLink, Users, ArrowLeft, Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { format } from "date-fns";

const SKILL_CATEGORY_COLORS: Record<string, string> = {
  backend:    "text-blue-400 border-blue-400/30 bg-blue-400/5",
  frontend:   "text-violet-400 border-violet-400/30 bg-violet-400/5",
  mobile:     "text-orange-400 border-orange-400/30 bg-orange-400/5",
  ai:         "text-pink-400 border-pink-400/30 bg-pink-400/5",
  networking: "text-cyan-400 border-cyan-400/30 bg-cyan-400/5",
  design:     "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
  devops:     "text-red-400 border-red-400/30 bg-red-400/5",
  other:      "text-muted-foreground border-border bg-muted/20",
};

function HookUpModal({ toUserId, toName, onClose }: { toUserId: number; toName: string; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const { toast } = useToast();

  const send = async () => {
    setStatus("sending");
    try {
      const res = await fetch("/api/collab-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId, message: message.trim() || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrorMsg(body.error ?? "Something went wrong");
        setStatus("error");
        return;
      }
      setStatus("sent");
      toast({ title: "Request sent!", description: `${toName} will be notified.` });
    } catch {
      setErrorMsg("Network error. Try again.");
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-md bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-border/50 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-mono text-primary tracking-widest">HOOK_UP_REQUEST</span>
          </div>
          <p className="font-bold text-foreground">Connect with {toName}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Send a collab request. They'll get a notification.
          </p>
        </div>

        {status === "sent" ? (
          <div className="p-8 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <p className="font-mono font-bold text-foreground">REQUEST_SENT</p>
            <p className="text-sm text-muted-foreground">Your collab request is on its way to {toName}.</p>
            <Button onClick={onClose} className="mt-2 rounded-none font-mono text-xs bg-primary text-primary-foreground w-full">
              CLOSE
            </Button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[10px] font-mono text-muted-foreground tracking-wider block mb-1.5">
                MESSAGE <span className="text-muted-foreground/50">(optional, max 400 chars)</span>
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 400))}
                placeholder={`Hey ${toName.split(" ")[0]}, I'd love to collaborate on…`}
                className="rounded-none border-border bg-background font-mono text-sm resize-none focus-visible:ring-primary focus-visible:border-primary"
                rows={4}
              />
              <p className="text-[10px] font-mono text-muted-foreground/50 text-right mt-1">{message.length}/400</p>
            </div>

            {status === "error" && (
              <p className="text-xs font-mono text-destructive border border-destructive/20 bg-destructive/5 px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 rounded-none font-mono text-xs border border-border/60"
                onClick={onClose}
              >
                CANCEL
              </Button>
              <Button
                className="flex-1 rounded-none font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={send}
                disabled={status === "sending"}
              >
                {status === "sending" ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending…</>
                ) : (
                  <><Zap className="h-3.5 w-3.5 mr-1.5" /> SEND_REQUEST</>
                )}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function Profile() {
  const params = useParams();
  const userId = parseInt(params.id || "0");
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();

  const { data: user, isLoading } = useGetUser(userId, {
    query: { enabled: !!userId, queryKey: ["/api/users", userId] },
  });

  const [copied, setCopied] = useState(false);
  const [hookUpOpen, setHookUpOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState<{ sent: boolean; status: string | null } | null>(null);
  const [profileViewers, setProfileViewers] = useState<{
    viewerId: number;
    viewedAt: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    level: string;
  }[]>([]);

  const isOwnProfile = currentUser?.id === userId;
  const isLoggedIn = !!currentUser;

  useEffect(() => {
    if (!isLoggedIn || isOwnProfile || !userId) return;
    fetch(`/api/collab-requests/check/${userId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRequestStatus(d))
      .catch(() => {});
  }, [userId, isLoggedIn, isOwnProfile]);

  useEffect(() => {
    if (!isLoggedIn || isOwnProfile || !userId) return;
    fetch(`/api/profile-views/${userId}`, { method: "POST", credentials: "include" }).catch(() => {});
  }, [userId, isLoggedIn, isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile || !userId) return;
    fetch("/api/me/profile-views", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setProfileViewers(d.viewers ?? []))
      .catch(() => {});
  }, [isOwnProfile, userId]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${user?.displayName} — DevLink KE`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Link copied!", description: "Profile URL copied to clipboard." });
      }
    } catch {
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <Skeleton className="w-full h-72" />
          <Skeleton className="w-full h-24" />
        </div>
        <div className="md:col-span-2 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="w-full h-32" />
          <Skeleton className="w-full h-48" />
        </div>
      </div>
    </div>
  );

  if (!user) return (
    <div className="container mx-auto px-4 py-20 text-center max-w-md">
      <div className="w-16 h-16 bg-muted border border-border flex items-center justify-center mx-auto mb-6">
        <Users className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <h1 className="text-2xl font-black font-mono mb-2">USER_NOT_FOUND</h1>
      <p className="text-muted-foreground text-sm mb-6">This builder profile doesn't exist or was removed.</p>
      <Link href="/explore">
        <Button className="rounded-none font-mono text-xs bg-primary text-primary-foreground">
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> BACK_TO_DIRECTORY
        </Button>
      </Link>
    </div>
  );

  const levelConfig = {
    pro:          { bar: "bg-primary", badge: "border-primary/50 text-primary bg-primary/8" },
    intermediate: { bar: "bg-secondary", badge: "border-secondary/50 text-secondary bg-secondary/8" },
    beginner:     { bar: "bg-muted-foreground/50", badge: "border-border text-muted-foreground" },
  }[user.level] ?? { bar: "bg-muted", badge: "border-border text-muted-foreground" };

  const groupedSkills = user.skills.reduce<Record<string, typeof user.skills>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <>
      <AnimatePresence>
        {hookUpOpen && (
          <HookUpModal
            toUserId={userId}
            toName={user.displayName}
            onClose={() => setHookUpOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-10 md:py-14 max-w-5xl">
        {/* Back breadcrumb */}
        <div className="mb-6">
          <Link href="/explore">
            <button className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-3 w-3" /> BUILDER_DIRECTORY
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* ── Left: Identity card ── */}
          <div className="md:col-span-1 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border relative overflow-hidden"
            >
              {/* Level accent bar */}
              <div className={`absolute top-0 inset-x-0 h-0.5 ${levelConfig.bar}`} />

              <div className="p-6 flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="w-24 h-24 mb-5 border-2 border-border bg-muted flex items-center justify-center overflow-hidden relative">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-mono font-black text-muted-foreground/50 uppercase">
                      {user.displayName.substring(0, 2)}
                    </span>
                  )}
                </div>

                <h1 className="text-xl font-black text-foreground mb-0.5 leading-tight">{user.displayName}</h1>
                <p className="text-xs font-mono text-muted-foreground mb-3">@{user.username}</p>

                <span className={`text-[10px] font-mono font-bold uppercase border px-3 py-1 mb-5 ${levelConfig.badge}`}>
                  {user.level} Builder
                </span>

                {/* Meta */}
                <div className="w-full space-y-2.5 pt-4 border-t border-border/40 text-left">
                  {user.location && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" />
                      <span>{user.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Joined {format(new Date(user.createdAt), "MMM yyyy")}</span>
                  </div>
                </div>

                {/* Social links */}
                {(user.githubUrl || user.twitterUrl) && (
                  <div className="w-full flex gap-2 mt-4">
                    {user.githubUrl && (
                      <a href={user.githubUrl} target="_blank" rel="noreferrer" className="flex-1">
                        <Button variant="outline" className="w-full rounded-none h-8 border-border/60 hover:bg-foreground hover:text-background hover:border-foreground transition-all text-xs font-mono gap-1.5">
                          <Github className="h-3.5 w-3.5" /> GitHub
                        </Button>
                      </a>
                    )}
                    {user.twitterUrl && (
                      <a href={user.twitterUrl} target="_blank" rel="noreferrer" className="flex-1">
                        <Button variant="outline" className="w-full rounded-none h-8 border-border/60 hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2] transition-all text-xs font-mono gap-1.5">
                          <Twitter className="h-3.5 w-3.5" /> X
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-card border border-border text-center">
                <Hash className="h-4 w-4 mx-auto text-primary/60 mb-1.5" />
                <div className="text-2xl font-mono font-black text-foreground">{user.roomsJoined}</div>
                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Rooms</div>
              </div>
              <div className="p-4 bg-card border border-border text-center">
                <MessageSquare className="h-4 w-4 mx-auto text-primary/60 mb-1.5" />
                <div className="text-2xl font-mono font-black text-foreground">{user.postsCount}</div>
                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Posts</div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {isOwnProfile ? (
                <>
                  <Link href="/edit-profile">
                    <Button className="w-full rounded-none font-mono text-xs border border-border/60 text-muted-foreground hover:text-foreground" variant="ghost">
                      <Edit className="h-3.5 w-3.5 mr-1.5" /> EDIT_PROFILE
                    </Button>
                  </Link>
                  <Button
                    className="w-full rounded-none font-mono text-xs border border-border/40 text-muted-foreground hover:text-foreground"
                    variant="ghost"
                    onClick={handleShare}
                  >
                    {copied ? (
                      <><Check className="h-3.5 w-3.5 mr-1.5 text-primary" /> COPIED</>
                    ) : (
                      <><Share2 className="h-3.5 w-3.5 mr-1.5" /> SHARE_PROFILE</>
                    )}
                  </Button>
                </>
              ) : isLoggedIn ? (
                <>
                  {requestStatus?.sent ? (
                    <Button
                      disabled
                      className="w-full rounded-none font-mono text-xs bg-muted text-muted-foreground border border-border"
                      variant="ghost"
                    >
                      <Check className="h-3.5 w-3.5 mr-1.5 text-primary" />
                      REQUEST_{(requestStatus.status ?? "sent").toUpperCase()}
                    </Button>
                  ) : (
                    <Button
                      className="w-full rounded-none font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => setHookUpOpen(true)}
                    >
                      <Zap className="h-3.5 w-3.5 mr-1.5" /> HOOK_UP
                    </Button>
                  )}
                  <Button
                    className="w-full rounded-none font-mono text-xs border border-border/40 text-muted-foreground hover:text-foreground"
                    variant="ghost"
                    onClick={handleShare}
                  >
                    {copied ? (
                      <><Check className="h-3.5 w-3.5 mr-1.5 text-primary" /> COPIED</>
                    ) : (
                      <><Share2 className="h-3.5 w-3.5 mr-1.5" /> SHARE</>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/new-profile">
                    <Button className="w-full rounded-none font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                      <Zap className="h-3.5 w-3.5 mr-1.5" /> JOIN_TO_HOOK_UP
                    </Button>
                  </Link>
                  <Button
                    className="w-full rounded-none font-mono text-xs border border-border/40 text-muted-foreground hover:text-foreground"
                    variant="ghost"
                    onClick={handleShare}
                  >
                    {copied ? (
                      <><Check className="h-3.5 w-3.5 mr-1.5 text-primary" /> COPIED</>
                    ) : (
                      <><Share2 className="h-3.5 w-3.5 mr-1.5" /> SHARE</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* ── Right: Details ── */}
          <div className="md:col-span-2 space-y-6">

            {/* Bio */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <h2 className="flex items-center gap-2 font-mono font-bold text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                <Terminal className="h-4 w-4 text-primary" /> About
              </h2>
              <div className="p-5 bg-card border border-border min-h-[100px]">
                {user.bio ? (
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{user.bio}</p>
                ) : (
                  <p className="text-sm text-muted-foreground/50 font-mono italic">No bio provided.</p>
                )}
              </div>
            </motion.div>

            {/* Looking for */}
            {user.lookingFor && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <h2 className="flex items-center gap-2 font-mono font-bold text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                  <ExternalLink className="h-4 w-4 text-secondary" /> Looking For
                </h2>
                <div className="p-5 bg-secondary/5 border border-secondary/20 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-secondary" />
                  <p className="text-sm text-foreground/90 italic pl-1">{user.lookingFor}</p>
                </div>
              </motion.div>
            )}

            {/* Skills */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <h2 className="flex items-center gap-2 font-mono font-bold text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                <div className="flex gap-0.5">
                  <div className="w-1 h-4 bg-primary" />
                  <div className="w-1 h-4 bg-primary/50" />
                  <div className="w-1 h-4 bg-primary/20" />
                </div>
                Technical Arsenal
              </h2>

              {user.skills.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(groupedSkills).map(([category, skills]) => (
                    <div key={category}>
                      <p className="text-[9px] font-mono text-muted-foreground/60 tracking-widest mb-2 uppercase">
                        {category}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {skills.map((skill, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2.5 border border-border bg-card hover:bg-muted/30 transition-colors"
                          >
                            <span className="font-bold text-sm text-foreground">{skill.name}</span>
                            <span className={`text-[9px] font-mono uppercase px-2 py-0.5 border ${
                              SKILL_CATEGORY_COLORS[category] ?? "text-muted-foreground border-border"
                            }`}>
                              {skill.proficiency}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-card border border-dashed border-border text-center">
                  <p className="text-sm text-muted-foreground/50 font-mono">No skills listed yet.</p>
                </div>
              )}
            </motion.div>

            {/* Who viewed my profile — own profile only */}
            {isOwnProfile && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <h2 className="flex items-center gap-2 font-mono font-bold text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                  <Eye className="h-4 w-4 text-primary" /> Who Viewed Your Profile
                </h2>

                {profileViewers.length === 0 ? (
                  <div className="p-8 bg-card border border-dashed border-border text-center">
                    <Eye className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground/50 font-mono">No views in the last 30 days.</p>
                    <p className="text-xs text-muted-foreground/40 mt-1">Share your profile to get noticed.</p>
                  </div>
                ) : (
                  <div className="bg-card border border-border">
                    <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground tracking-wider">
                        {profileViewers.length} BUILDER{profileViewers.length !== 1 ? "S" : ""} · LAST 30 DAYS
                      </span>
                    </div>
                    <div className="divide-y divide-border/30">
                      {profileViewers.map((viewer) => (
                        <Link key={viewer.viewerId} href={`/profile/${viewer.viewerId}`}>
                          <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                            <div className="w-9 h-9 border border-border bg-muted flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {viewer.avatarUrl ? (
                                <img src={viewer.avatarUrl} alt={viewer.displayName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-mono font-black text-muted-foreground/60 uppercase">
                                  {viewer.displayName.substring(0, 2)}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">{viewer.displayName}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">@{viewer.username}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={`text-[9px] font-mono uppercase px-2 py-0.5 border ${
                                viewer.level === "pro"
                                  ? "border-primary/50 text-primary bg-primary/8"
                                  : viewer.level === "intermediate"
                                  ? "border-secondary/50 text-secondary bg-secondary/8"
                                  : "border-border text-muted-foreground"
                              }`}>
                                {viewer.level}
                              </span>
                              <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">
                                {formatDistanceToNow(new Date(viewer.viewedAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
