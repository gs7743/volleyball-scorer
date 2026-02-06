import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getQueryFn } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import type { Tournament, Match } from "@shared/schema";
import {
  ArrowLeft,
  Plus,
  Trophy,
  Calendar,
  Clock,
  ChevronRight,
  Languages,
  Download,
} from "lucide-react";
import { useState } from "react";

type FilterTab = "all" | "in_progress" | "completed";

export default function TournamentDetailPage() {
  const [, params] = useRoute("/tournament/:id");
  const tournamentId = params?.id ? parseInt(params.id) : 0;
  const { t, lang, toggleLang } = useI18n();
  const [filter, setFilter] = useState<FilterTab>("all");

  const { data: tournament, isLoading: tournamentLoading } = useQuery<Tournament>({
    queryKey: ["/api/tournaments", tournamentId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: tournamentId > 0,
  });

  const { data: matchesList, isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: ["/api/tournaments", tournamentId, "matches"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: tournamentId > 0,
  });

  const filteredMatches = useMemo(() => {
    if (!matchesList) return [];
    if (filter === "all") return matchesList;
    return matchesList.filter((m) => m.status === filter);
  }, [matchesList, filter]);

  const counts = useMemo(() => {
    if (!matchesList) return { all: 0, in_progress: 0, completed: 0 };
    return {
      all: matchesList.length,
      in_progress: matchesList.filter((m) => m.status === "in_progress").length,
      completed: matchesList.filter((m) => m.status === "completed").length,
    };
  }, [matchesList]);

  const isLoading = tournamentLoading || matchesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur px-4 py-2">
          <Skeleton className="h-6 w-48" />
        </header>
        <main className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </main>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground">{t.matchNotFound}</p>
            <Link href="/dashboard">
              <Button>{t.backToDashboard}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto flex items-center gap-2 px-4 py-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back-to-dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <Trophy className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold truncate" data-testid="text-tournament-title">
              {tournament.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              {tournament.setFormat === 1 ? t.singleSet : tournament.setFormat === 3 ? t.bestOf3 : tournament.setFormat === 5 ? t.bestOf5 : t.bestOf7}
              {" · "}{tournament.regularSetPoints}/{tournament.finalSetPoints}{t.pointsUnit}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { window.location.href = `/api/export/tournament/${tournamentId}`; }}
              data-testid="button-export-tournament"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleLang} data-testid="button-lang-toggle">
              <Languages className="w-4 h-4 mr-1" />
              {lang === "zh" ? "EN" : "中"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-base font-semibold">{t.myMatches}</h2>
          <Link href={`/tournament/${tournamentId}/match/new`}>
            <Button data-testid="button-new-match">
              <Plus className="w-4 h-4 mr-2" />
              {t.newMatch}
            </Button>
          </Link>
        </div>

        {matchesList && matchesList.length > 0 && (
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1" data-testid="tab-all">
                {t.all} ({counts.all})
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="flex-1" data-testid="tab-in-progress">
                {t.inProgress} ({counts.in_progress})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex-1" data-testid="tab-completed">
                {t.completed} ({counts.completed})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {!matchesList || matchesList.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">{t.noMatchesYet}</p>
              <p className="text-sm text-muted-foreground">{t.createFirstMatch}</p>
            </CardContent>
          </Card>
        ) : filteredMatches.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground text-sm">
                {t.noFilteredMatches(filter === "in_progress" ? t.inProgress : t.completed)}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredMatches.map((match) => (
              <Link key={match.id} href={`/match/${match.id}/score`}>
                <Card className="hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-match-${match.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm truncate" data-testid={`text-match-teams-${match.id}`}>
                            {match.ourTeam} vs {match.opponentTeam}
                          </h3>
                          <Badge
                            variant={match.status === "completed" ? "secondary" : "default"}
                            className="text-xs"
                            data-testid={`badge-match-status-${match.id}`}
                          >
                            {match.status === "completed" ? t.completed : t.inProgress}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {match.matchDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {match.matchTime}
                          </span>
                          <span>{t.matchNumber} {match.matchNumber}</span>
                        </div>
                        <div className="flex items-center gap-1.5" data-testid={`text-match-score-${match.id}`}>
                          <span className="text-base font-bold tabular-nums">
                            {match.ourScore} : {match.opponentScore}
                          </span>
                          {tournament && tournament.setFormat > 1 && (
                            <span className="text-xs text-muted-foreground">({t.set})</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
