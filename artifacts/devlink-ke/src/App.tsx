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
import { UserProvider } from "@/contexts/user-context";
import { useOfflineQueueSync } from "@/hooks/use-offline-queue";

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
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  useOfflineQueueSync();
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
