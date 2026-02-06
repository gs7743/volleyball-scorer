import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import type { Match, Point, Tournament, MatchSet, MatchLineup, Player, Substitution } from "@shared/schema";
import {
  ArrowLeft,
  Undo2,
  CheckCircle,
  MessageSquare,
  X,
  Check,
  Languages,
  ArrowLeftRight,
  List,
  LayoutGrid,
  UserPlus,
  Users,
  Download,
} from "lucide-react";

export default function ScoringPage() {
  const [, params] = useRoute("/match/:id/score");
  const [, setLocation] = useLocation();
  const matchId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const { t, lang, toggleLang } = useI18n();
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [viewingSet, setViewingSet] = useState<number | "all">("all");
  const [pointLayout, setPointLayout] = useState<"vertical" | "horizontal">(() => {
    const saved = localStorage.getItem("volleyball-point-layout");
    return saved === "horizontal" ? "horizontal" : "vertical";
  });
  const [showLineupSetup, setShowLineupSetup] = useState(false);
  const [lineupSelections, setLineupSelections] = useState<Record<number, "starter" | "libero" | "bench">>({});
  const [showSubstitution, setShowSubstitution] = useState(false);
  const [subPlayerOut, setSubPlayerOut] = useState<string>("");
  const [subPlayerIn, setSubPlayerIn] = useState<string>("");
  const [scoringPlayerId, setScoringPlayerId] = useState<string>("");
  const [losingPlayerId, setLosingPlayerId] = useState<string>("");

  const { data: match, isLoading: matchLoading } = useQuery<Match>({
    queryKey: ["/api/matches", matchId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: matchId > 0,
  });

  const { data: pointsList, isLoading: pointsLoading } = useQuery<Point[]>({
    queryKey: ["/api/matches", matchId, "points"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: matchId > 0,
  });

  const { data: setsList } = useQuery<MatchSet[]>({
    queryKey: ["/api/matches", matchId, "sets"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: matchId > 0,
  });

  const { data: tournament } = useQuery<Tournament>({
    queryKey: ["/api/tournaments", match?.tournamentId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!match?.tournamentId,
  });

  const { data: lineupsList = [] } = useQuery<MatchLineup[]>({
    queryKey: ["/api/matches", matchId, "lineups"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: matchId > 0,
  });

  const { data: substitutionsList = [] } = useQuery<Substitution[]>({
    queryKey: ["/api/matches", matchId, "substitutions"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: matchId > 0,
  });

  const teamId = match?.teamId;
  const { data: teamPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/teams", teamId, "players"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!teamId && teamId > 0,
  });

  const playerMap = useMemo(() => {
    const map: Record<number, Player> = {};
    teamPlayers.forEach((p) => { map[p.id] = p; });
    return map;
  }, [teamPlayers]);

  const activeLineup = useMemo(() => {
    return lineupsList.filter((l) => l.role === "starter" || l.role === "libero");
  }, [lineupsList]);

  const hasLineup = lineupsList.length > 0;

  const scoreMutation = useMutation({
    mutationFn: async (team: "our" | "opponent") => {
      const body: any = { scoringTeam: team };
      if (scoringPlayerId && scoringPlayerId !== "none") body.scoringPlayerId = parseInt(scoringPlayerId);
      if (losingPlayerId && losingPlayerId !== "none") body.losingPlayerId = parseInt(losingPlayerId);
      return apiRequest("POST", `/api/matches/${matchId}/points`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "points"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "sets"] });
      setScoringPlayerId("");
      setLosingPlayerId("");
    },
    onError: (err: any) => {
      toast({ title: t.scoreFailed, description: err.message, variant: "destructive" });
    },
  });

  const undoMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/matches/${matchId}/points/last`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "points"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "sets"] });
    },
    onError: (err: any) => {
      toast({ title: t.undoFailed, description: err.message, variant: "destructive" });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ pointId, note }: { pointId: number; note: string }) => {
      return apiRequest("PATCH", `/api/matches/${matchId}/points/${pointId}`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "points"] });
      setEditingNoteId(null);
      setNoteText("");
    },
    onError: (err: any) => {
      toast({ title: t.updateNoteFailed, description: err.message, variant: "destructive" });
    },
  });

  const changeScoringTeamMutation = useMutation({
    mutationFn: async ({ pointId, scoringTeam }: { pointId: number; scoringTeam: "our" | "opponent" }) => {
      return apiRequest("PATCH", `/api/matches/${matchId}/points/${pointId}`, { scoringTeam });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "points"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "sets"] });
    },
    onError: (err: any) => {
      toast({ title: t.updateScoringTeamFailed, description: err.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/matches/${matchId}`, { status: "completed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId] });
      toast({ title: t.matchCompleted });
    },
    onError: (err: any) => {
      toast({ title: t.completeFailed, description: err.message, variant: "destructive" });
    },
  });

  const lineupMutation = useMutation({
    mutationFn: async (players: { playerId: number; role: string; jerseyNumberAtMatch: number }[]) => {
      return apiRequest("POST", `/api/matches/${matchId}/lineups`, { players });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "lineups"] });
      setShowLineupSetup(false);
      setLineupSelections({});
    },
    onError: (err: any) => {
      toast({ title: t.lineupSaveFailed, description: err.message, variant: "destructive" });
    },
  });

  const substitutionMutation = useMutation({
    mutationFn: async (data: { setNumber: number; pointNumber: number; playerOutId: number; playerInId: number }) => {
      return apiRequest("POST", `/api/matches/${matchId}/substitutions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "substitutions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "lineups"] });
      setShowSubstitution(false);
      setSubPlayerOut("");
      setSubPlayerIn("");
    },
    onError: (err: any) => {
      toast({ title: t.substitutionFailed, description: err.message, variant: "destructive" });
    },
  });

  const handleSaveLineup = () => {
    const starters = Object.entries(lineupSelections).filter(([, role]) => role === "starter");
    const liberos = Object.entries(lineupSelections).filter(([, role]) => role === "libero");
    if (starters.length !== 6 || liberos.length !== 1) {
      toast({ title: t.mustSelect6And1, variant: "destructive" });
      return;
    }
    const players = Object.entries(lineupSelections)
      .filter(([, role]) => role !== "bench")
      .map(([id, role]) => {
        const player = playerMap[parseInt(id)];
        return { playerId: parseInt(id), role, jerseyNumberAtMatch: player?.jerseyNumber || 0 };
      });
    lineupMutation.mutate(players);
  };

  const handleSubstitution = () => {
    if (!subPlayerOut || !subPlayerIn) return;
    const currentPoint = allPoints.length;
    substitutionMutation.mutate({
      setNumber: match?.currentSet || 1,
      pointNumber: currentPoint,
      playerOutId: parseInt(subPlayerOut),
      playerInId: parseInt(subPlayerIn),
    });
  };

  const startEditNote = (point: Point) => {
    setEditingNoteId(point.id);
    setNoteText(point.note || "");
  };

  const saveNote = () => {
    if (editingNoteId !== null) {
      updateNoteMutation.mutate({ pointId: editingNoteId, note: noteText });
    }
  };

  const isMultiSet = tournament && tournament.setFormat > 1;
  const sets = setsList || [];
  const currentSetData = sets.find((s) => s.setNumber === match?.currentSet);

  const filteredPoints = useMemo(() => {
    if (!pointsList) return [];
    if (viewingSet === "all") return pointsList;
    return pointsList.filter((p) => p.setNumber === viewingSet);
  }, [pointsList, viewingSet]);

  if (matchLoading || pointsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur px-4 py-2">
          <Skeleton className="h-6 w-48" />
        </header>
        <main className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-48 w-full" />
        </main>
      </div>
    );
  }

  if (!match) {
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

  const points = filteredPoints;
  const allPoints = pointsList || [];
  const isCompleted = match.status === "completed";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 px-4 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link href={match ? `/tournament/${match.tournamentId}` : "/dashboard"}>
              <Button variant="ghost" size="icon" data-testid="button-back-to-tournament">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate" data-testid="text-match-title">
                {match.tournament} - {t.matchNumber} {match.matchNumber}
              </h1>
              <p className="text-xs text-muted-foreground">
                {match.matchDate} {match.matchTime}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={toggleLang} data-testid="button-lang-toggle">
              <Languages className="w-4 h-4 mr-1" />
              {lang === "zh" ? "EN" : "中"}
            </Button>
            {!isCompleted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                data-testid="button-end-match"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                {t.end}
              </Button>
            )}
            {isCompleted && (
              <Badge variant="secondary" data-testid="badge-completed">{t.completedLabel}</Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-3 flex-1 flex flex-col w-full space-y-3 landscape:py-2 landscape:space-y-2">
        <div className="landscape:flex landscape:gap-3 landscape:items-stretch space-y-3 landscape:space-y-0">
          <Card className="landscape:flex-1">
            <CardContent className="p-3 landscape:p-2 landscape:flex landscape:items-center landscape:h-full">
              <div className="w-full space-y-2">
                {isMultiSet && (
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground" data-testid="set-scoreboard">
                    <span className="font-medium">{t.setsWon}</span>
                    <span className="text-lg font-bold text-primary tabular-nums" data-testid="text-sets-our">{match.ourScore}</span>
                    <span className="text-muted-foreground">:</span>
                    <span className="text-lg font-bold tabular-nums" data-testid="text-sets-opponent">{match.opponentScore}</span>
                  </div>
                )}

                {isMultiSet && sets.length > 0 && (
                  <div className="flex items-center justify-center gap-1 flex-wrap" data-testid="set-scores-row">
                    {sets.map((s) => (
                      <Badge
                        key={s.id}
                        variant={s.setNumber === match.currentSet && !isCompleted ? "default" : "secondary"}
                        className="text-xs tabular-nums"
                        data-testid={`badge-set-${s.setNumber}`}
                      >
                        {t.setN(s.setNumber)}: {s.ourScore}-{s.opponentScore}
                        {s.winningTeam && (s.winningTeam === "our" ? " ✓" : "")}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 items-center text-center">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground truncate" data-testid="text-our-team-name">
                      {match.ourTeam}
                    </p>
                    <p className="text-3xl landscape:text-2xl font-bold text-primary tabular-nums" data-testid="text-our-score">
                      {currentSetData ? currentSetData.ourScore : (isMultiSet ? 0 : match.ourScore)}
                    </p>
                  </div>
                  <div>
                    <p className="text-base font-bold text-muted-foreground">{t.vs}</p>
                    {isMultiSet && !isCompleted && (
                      <p className="text-xs text-muted-foreground" data-testid="text-current-set-label">
                        {t.setN(match.currentSet)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground truncate" data-testid="text-opponent-team-name">
                      {match.opponentTeam}
                    </p>
                    <p className="text-3xl landscape:text-2xl font-bold tabular-nums" data-testid="text-opponent-score">
                      {currentSetData ? currentSetData.opponentScore : (isMultiSet ? 0 : match.opponentScore)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {!isCompleted && (
            <div className="space-y-2 landscape:space-y-1 landscape:w-48 landscape:shrink-0">
              {hasLineup && teamPlayers.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-muted-foreground">{t.scorer}</label>
                    <Select value={scoringPlayerId} onValueChange={setScoringPlayerId}>
                      <SelectTrigger className="h-7 text-xs" data-testid="select-scoring-player">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        {activeLineup.map((l) => {
                          const p = playerMap[l.playerId];
                          return p ? (
                            <SelectItem key={l.playerId} value={String(l.playerId)}>
                              #{p.jerseyNumber} {p.name}
                            </SelectItem>
                          ) : null;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-muted-foreground">{t.loser}</label>
                    <Select value={losingPlayerId} onValueChange={setLosingPlayerId}>
                      <SelectTrigger className="h-7 text-xs" data-testid="select-losing-player">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        {activeLineup.map((l) => {
                          const p = playerMap[l.playerId];
                          return p ? (
                            <SelectItem key={l.playerId} value={String(l.playerId)}>
                              #{p.jerseyNumber} {p.name}
                            </SelectItem>
                          ) : null;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  className="h-12 landscape:h-auto landscape:flex-1 text-sm font-semibold"
                  onClick={() => scoreMutation.mutate("our")}
                  disabled={scoreMutation.isPending}
                  data-testid="button-score-our"
                >
                  {match.ourTeam} +1
                </Button>
                <Button
                  variant="outline"
                  className="h-12 landscape:h-auto landscape:flex-1"
                  onClick={() => undoMutation.mutate()}
                  disabled={undoMutation.isPending || allPoints.length === 0}
                  data-testid="button-undo"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  className="h-12 landscape:h-auto landscape:flex-1 text-sm font-semibold"
                  onClick={() => scoreMutation.mutate("opponent")}
                  disabled={scoreMutation.isPending}
                  data-testid="button-score-opponent"
                >
                  {match.opponentTeam} +1
                </Button>
              </div>
              {teamPlayers.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {!hasLineup && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLineupSetup(true)}
                      data-testid="button-setup-lineup"
                    >
                      <Users className="w-3 h-3 mr-1" />
                      {t.selectLineup}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSubstitution(!showSubstitution)}
                    data-testid="button-substitution"
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    {t.substitution}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { window.location.href = `/api/export/match/${matchId}`; }}
                    data-testid="button-export-match"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    {t.exportMatch}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {showLineupSetup && teamPlayers.length > 0 && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold">{t.selectLineup}</h3>
                <p className="text-[10px] text-muted-foreground">{t.lineupDesc}</p>
              </div>
              <div className="space-y-1">
                {teamPlayers.map((player) => {
                  const current = lineupSelections[player.id] || "bench";
                  return (
                    <div key={player.id} className="flex items-center justify-between gap-2" data-testid={`lineup-player-${player.id}`}>
                      <span className="text-xs">
                        <Badge variant="secondary" className="mr-1">#{player.jerseyNumber}</Badge>
                        {player.name}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant={current === "starter" ? "default" : "outline"}
                          size="sm"
                          className="text-[10px] px-2"
                          onClick={() => setLineupSelections((prev) => ({ ...prev, [player.id]: current === "starter" ? "bench" : "starter" }))}
                          data-testid={`button-lineup-starter-${player.id}`}
                        >
                          {t.starter}
                        </Button>
                        <Button
                          variant={current === "libero" ? "default" : "outline"}
                          size="sm"
                          className="text-[10px] px-2"
                          onClick={() => setLineupSelections((prev) => ({ ...prev, [player.id]: current === "libero" ? "bench" : "libero" }))}
                          data-testid={`button-lineup-libero-${player.id}`}
                        >
                          {t.libero}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                <span>
                  {t.starter}: {Object.values(lineupSelections).filter((r) => r === "starter").length}/6 ·
                  {t.libero}: {Object.values(lineupSelections).filter((r) => r === "libero").length}/1
                </span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={handleSaveLineup} disabled={lineupMutation.isPending} data-testid="button-save-lineup">
                  {t.save}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowLineupSetup(false)}>
                  {t.cancel}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showSubstitution && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <h3 className="text-xs font-semibold">{t.substitutePlayer}</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[10px] text-muted-foreground">{t.playerOut}</label>
                  <Select value={subPlayerOut} onValueChange={setSubPlayerOut}>
                    <SelectTrigger className="h-7 text-xs" data-testid="select-sub-player-out">
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLineup.map((l) => {
                        const p = playerMap[l.playerId];
                        return p ? (
                          <SelectItem key={l.playerId} value={String(l.playerId)}>
                            #{p.jerseyNumber} {p.name}
                          </SelectItem>
                        ) : null;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5">
                  <label className="text-[10px] text-muted-foreground">{t.playerIn}</label>
                  <Select value={subPlayerIn} onValueChange={setSubPlayerIn}>
                    <SelectTrigger className="h-7 text-xs" data-testid="select-sub-player-in">
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamPlayers
                        .filter((p) => !activeLineup.some((l) => l.playerId === p.id))
                        .map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            #{p.jerseyNumber} {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={handleSubstitution} disabled={substitutionMutation.isPending || !subPlayerOut || !subPlayerIn} data-testid="button-confirm-substitution">
                  {t.confirm}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowSubstitution(false)}>
                  {t.cancel}
                </Button>
              </div>
              {substitutionsList.length > 0 && (
                <div className="border-t pt-2 mt-1 space-y-0.5">
                  <p className="text-[10px] font-semibold text-muted-foreground">{t.substitutionLog}</p>
                  {substitutionsList.map((sub) => {
                    const pOut = playerMap[sub.playerOutId];
                    const pIn = playerMap[sub.playerInId];
                    return (
                      <p key={sub.id} className="text-[10px] text-muted-foreground" data-testid={`text-sub-${sub.id}`}>
                        {t.setN(sub.setNumber)} {t.atPoint.replace("{0}", String(sub.pointNumber))}:
                        {pOut ? ` #${pOut.jerseyNumber} ${pOut.name}` : ` #${sub.playerOutId}`} →
                        {pIn ? ` #${pIn.jerseyNumber} ${pIn.name}` : ` #${sub.playerInId}`}
                      </p>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasLineup && !showLineupSetup && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{t.currentLineup}:</span>
            {activeLineup.map((l) => {
              const p = playerMap[l.playerId];
              if (!p) return null;
              return (
                <Badge key={l.id} variant={l.role === "libero" ? "outline" : "secondary"} className="text-[10px]" data-testid={`badge-lineup-${l.playerId}`}>
                  #{p.jerseyNumber} {p.name}{l.role === "libero" ? ` (${t.libero})` : ""}
                </Badge>
              );
            })}
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs font-semibold text-muted-foreground">
                {t.pointLog} ({points.length} {t.points})
              </h2>
              {isMultiSet && (
                <div className="flex items-center gap-0.5">
                  <Button
                    variant={viewingSet === "all" ? "default" : "ghost"}
                    size="sm"
                    className="text-xs px-2"
                    onClick={() => setViewingSet("all")}
                    data-testid="button-view-all-sets"
                  >
                    {t.all}
                  </Button>
                  {sets.map((s) => (
                    <Button
                      key={s.setNumber}
                      variant={viewingSet === s.setNumber ? "default" : "ghost"}
                      size="sm"
                      className="text-xs px-2"
                      onClick={() => setViewingSet(s.setNumber)}
                      data-testid={`button-view-set-${s.setNumber}`}
                    >
                      {t.setN(s.setNumber)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {allPoints.length > 0 && (
              <div className="flex items-center gap-0.5">
                <Button
                  variant={pointLayout === "vertical" ? "default" : "ghost"}
                  size="icon"
                  className="toggle-elevate"
                  onClick={() => { setPointLayout("vertical"); localStorage.setItem("volleyball-point-layout", "vertical"); }}
                  title={t.verticalView}
                  data-testid="button-layout-vertical"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={pointLayout === "horizontal" ? "default" : "ghost"}
                  size="icon"
                  className="toggle-elevate"
                  onClick={() => { setPointLayout("horizontal"); localStorage.setItem("volleyball-point-layout", "horizontal"); }}
                  title={t.horizontalView}
                  data-testid="button-layout-horizontal"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {points.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-muted-foreground text-sm">{t.noPointsYet}</p>
              </CardContent>
            </Card>
          ) : pointLayout === "vertical" ? (
            <ScrollArea className="flex-1">
              <div className="space-y-1 pb-4">
                {[...points].reverse().map((point, idx, arr) => {
                  const isOur = point.scoringTeam === "our";
                  const showSetDivider = isMultiSet && viewingSet === "all" && (idx === 0 || arr[idx - 1].setNumber !== point.setNumber);
                  return (
                    <div key={point.id}>
                      {showSetDivider && (
                        <div className="flex items-center gap-2 py-1">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs font-medium text-muted-foreground">{t.setN(point.setNumber)}</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      )}
                      <Card data-testid={`card-point-${point.id}`}>
                        <CardContent className="px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground w-5 text-center shrink-0">
                              #{point.pointNumber}
                            </span>
                            <button
                              type="button"
                              className="shrink-0 flex items-center gap-0.5 group"
                              onClick={() => {
                                const newTeam = isOur ? "opponent" : "our";
                                changeScoringTeamMutation.mutate({ pointId: point.id, scoringTeam: newTeam });
                              }}
                              disabled={changeScoringTeamMutation.isPending}
                              title={t.tapToChangeTeam}
                              data-testid={`button-change-team-${point.id}`}
                            >
                              <Badge
                                variant={isOur ? "default" : "secondary"}
                                className="text-xs cursor-pointer"
                                data-testid={`badge-scoring-team-${point.id}`}
                              >
                                {isOur ? match.ourTeam : match.opponentTeam}
                              </Badge>
                              <ArrowLeftRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                              {point.ourScoreAfter}:{point.opponentScoreAfter}
                            </span>

                            <div className="flex-1 min-w-0">
                              {editingNoteId === point.id ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder={t.notePlaceholder}
                                    className="h-6 text-xs"
                                    data-testid={`input-note-${point.id}`}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveNote();
                                      if (e.key === "Escape") setEditingNoteId(null);
                                    }}
                                    autoFocus
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={saveNote}
                                    data-testid={`button-save-note-${point.id}`}
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => setEditingNoteId(null)}
                                    data-testid={`button-cancel-note-${point.id}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span
                                  className="text-xs text-muted-foreground truncate block cursor-pointer"
                                  onClick={() => startEditNote(point)}
                                  data-testid={`text-note-${point.id}`}
                                >
                                  {point.note || ""}
                                </span>
                              )}
                            </div>

                            {editingNoteId !== point.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => startEditNote(point)}
                                data-testid={`button-edit-note-${point.id}`}
                              >
                                <MessageSquare className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="flex-1">
              <div className="pb-4 space-y-2">
                {isMultiSet && viewingSet === "all" ? (
                  sets.map((s) => {
                    const setPoints = allPoints.filter((p) => p.setNumber === s.setNumber);
                    if (setPoints.length === 0) return null;
                    return (
                      <div key={s.setNumber}>
                        <div className="flex items-center gap-2 pb-1">
                          <span className="text-xs font-medium text-muted-foreground">{t.setN(s.setNumber)}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{s.ourScore}-{s.opponentScore}</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className="flex flex-wrap gap-1.5 content-start">
                          {setPoints.map((point) => renderHorizontalPoint(point, match))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-wrap gap-1.5 content-start">
                    {points.map((point) => renderHorizontalPoint(point, match))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </main>
    </div>
  );

  function renderHorizontalPoint(point: Point, match: Match) {
    const isOur = point.scoringTeam === "our";
    return (
      <Popover key={point.id}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Button
              variant={isOur ? "default" : "secondary"}
              size="sm"
              className="text-xs tabular-nums px-2"
              data-testid={`button-point-h-${point.id}`}
            >
              {point.ourScoreAfter}:{point.opponentScoreAfter}
            </Button>
            {point.note && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 pointer-events-none" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 space-y-2" align="start">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">#{point.pointNumber}</span>
            <button
              type="button"
              className="shrink-0 flex items-center gap-1 group"
              onClick={() => {
                const newTeam = isOur ? "opponent" : "our";
                changeScoringTeamMutation.mutate({ pointId: point.id, scoringTeam: newTeam });
              }}
              disabled={changeScoringTeamMutation.isPending}
              data-testid={`button-change-team-h-${point.id}`}
            >
              <Badge
                variant={isOur ? "default" : "secondary"}
                className="text-xs cursor-pointer"
              >
                {isOur ? match.ourTeam : match.opponentTeam}
              </Badge>
              <ArrowLeftRight className="w-3 h-3 text-muted-foreground" />
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {point.ourScoreAfter}:{point.opponentScoreAfter}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Input
              defaultValue={point.note || ""}
              placeholder={t.notePlaceholder}
              className="h-7 text-xs flex-1"
              data-testid={`input-note-h-${point.id}`}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value;
                  updateNoteMutation.mutate({ pointId: point.id, note: val });
                }
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val !== (point.note || "")) {
                  updateNoteMutation.mutate({ pointId: point.id, note: val });
                }
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                if (input) {
                  updateNoteMutation.mutate({ pointId: point.id, note: input.value });
                }
              }}
              data-testid={`button-save-note-h-${point.id}`}
            >
              <Check className="w-3 h-3" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
}
