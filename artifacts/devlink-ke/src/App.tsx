import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout/Layout";
import Home from "@/pages/home";
import Explore from "@/pages/explore";
import Rooms from "@/pages/rooms";
import RoomDetail from "@/pages/room-detail";
import Match from "@/pages/match";
import Profile from "@/pages/profile";
import NewProfile from "@/pages/new-profile";
import CreateRoom from "@/pages/create-room";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import VerifyEmail from "@/pages/verify-email";
import InboxPage from "@/pages/inbox";
import NotificationsPage from "@/pages/notifications";
import EditProfile from "@/pages/edit-profile";
import { UserProvider } from "@/contexts/user-context";
import { useOfflineQueueSync } from "@/hooks/use-offline-queue";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/contexts/user-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/explore" component={Explore} />
      <Route path="/rooms" component={Rooms} />
      <Route path="/rooms/:id" component={RoomDetail} />
      <Route path="/match" component={Match} />
      <Route path="/profile/:id" component={Profile} />
      <Route path="/new-profile" component={NewProfile} />
      <Route path="/create-room" component={CreateRoom} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/inbox" component={InboxPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/edit-profile" component={EditProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  useOfflineQueueSync();
  const { refetchMe } = useCurrentUser();
  const { toast } = useToast();

  // Handle OAuth callback redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const googleAuth = params.get("google_auth");
    const githubAuth = params.get("github_auth");

    if (googleAuth === "success") {
      toast({ title: "Welcome!", description: "Signed in with Google successfully." });
      refetchMe();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (googleAuth === "error") {
      const reason = params.get("reason") ?? "unknown";
      toast({ title: "Google sign-in failed", description: reason.replace(/_/g, " "), variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (githubAuth === "success") {
      toast({ title: "Welcome!", description: "Signed in with GitHub successfully." });
      refetchMe();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (githubAuth === "error") {
      const reason = params.get("reason") ?? "unknown";
      toast({ title: "GitHub sign-in failed", description: reason.replace(/_/g, " "), variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  return (
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Layout>
          <Router />
        </Layout>
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <AppInner />
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
