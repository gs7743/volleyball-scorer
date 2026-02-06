import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import TournamentDetailPage from "@/pages/tournament-detail";
import MatchSetupPage from "@/pages/match-setup";
import ScoringPage from "@/pages/scoring";
import TeamDetailPage from "@/pages/team-detail";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/team/:id" component={TeamDetailPage} />
      <Route path="/tournament/:id" component={TournamentDetailPage} />
      <Route path="/tournament/:tournamentId/match/new" component={MatchSetupPage} />
      <Route path="/match/:id/score" component={ScoringPage} />
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
