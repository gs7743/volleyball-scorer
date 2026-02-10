import { Switch, Route, Redirect } from "wouter";
import { queryClient, getQueryFn } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import TournamentDetailPage from "@/pages/tournament-detail";
import MatchSetupPage from "@/pages/match-setup";
import ScoringPage from "@/pages/scoring";
import TeamDetailPage from "@/pages/team-detail";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/app/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/app/login" component={LoginPage} />
      <Route path="/app/dashboard">{() => <ProtectedRoute component={DashboardPage} />}</Route>
      <Route path="/app/team/:id">{() => <ProtectedRoute component={TeamDetailPage} />}</Route>
      <Route path="/app/tournament/:id">{() => <ProtectedRoute component={TournamentDetailPage} />}</Route>
      <Route path="/app/tournament/:tournamentId/match/new">{() => <ProtectedRoute component={MatchSetupPage} />}</Route>
      <Route path="/app/match/:id/score">{() => <ProtectedRoute component={ScoringPage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nProvider>
          <Toaster />
          <Router />
        </I18nProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
