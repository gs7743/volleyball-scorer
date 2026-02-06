import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import type { Tournament, Match, Team } from "@shared/schema";
import {
  Plus,
  Activity,
  Trophy,
  LogOut,
  ChevronRight,
  Languages,
  Trash2,
  Users,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, lang, toggleLang } = useI18n();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSetFormat, setNewSetFormat] = useState(1);
  const [newRegularPts, setNewRegularPts] = useState(25);
  const [newFinalPts, setNewFinalPts] = useState(15);
  const [showTeamCreate, setShowTeamCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editingTeamName, setEditingTeamName] = useState("");

  const { data: teamsList } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: tournamentsList, isLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: allMatches } = useQuery<Match[]>({
    queryKey: ["/api/matches"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; setFormat: number; regularSetPoints: number; finalSetPoints: number }) => {
      return apiRequest("POST", "/api/tournaments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      setNewName("");
      setNewSetFormat(1);
      setNewRegularPts(25);
      setNewFinalPts(15);
      setShowCreate(false);
    },
    onError: (err: any) => {
      toast({ title: t.tournamentCreateFailed, description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/tournaments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
    },
    onError: (err: any) => {
      toast({ title: t.tournamentDeleteFailed, description: err.message, variant: "destructive" });
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest("POST", "/api/teams", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setNewTeamName("");
      setShowTeamCreate(false);
    },
    onError: (err: any) => {
      toast({ title: t.teamCreateFailed, description: err.message, variant: "destructive" });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return apiRequest("PATCH", `/api/teams/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setEditingTeamId(null);
      setEditingTeamName("");
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/teams/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
    onError: (err: any) => {
      toast({ title: t.teamDeleteFailed, description: err.message, variant: "destructive" });
    },
  });

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) {
      toast({ title: t.enterTeamName, variant: "destructive" });
      return;
    }
    createTeamMutation.mutate({ name: newTeamName.trim() });
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      setLocation("/");
    } catch {
      toast({ title: t.logoutFailed, variant: "destructive" });
    }
  };

  const handleCreate = () => {
    if (!newName.trim()) {
      toast({ title: t.enterTournamentName, variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name: newName.trim(),
      setFormat: newSetFormat,
      regularSetPoints: newRegularPts,
      finalSetPoints: newFinalPts,
    });
  };

  const getSetFormatLabel = (format: number) => {
    switch (format) {
      case 1: return t.singleSet;
      case 3: return t.bestOf3;
      case 5: return t.bestOf5;
      case 7: return t.bestOf7;
      default: return String(format);
    }
  };

  const getMatchCountForTournament = (tournamentId: number) => {
    if (!allMatches) return { total: 0, inProgress: 0 };
    const filtered = allMatches.filter((m) => m.tournamentId === tournamentId);
    return {
      total: filtered.length,
      inProgress: filtered.filter((m) => m.status === "in_progress").length,
    };
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 px-4 py-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">{t.appTitle}</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={toggleLang} data-testid="button-lang-toggle">
              <Languages className="w-4 h-4 mr-1" />
              {lang === "zh" ? "EN" : "中"}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">{t.myTeams}</h2>
            <Button variant="outline" onClick={() => setShowTeamCreate(true)} data-testid="button-new-team">
              <Plus className="w-4 h-4 mr-2" />
              {t.newTeam}
            </Button>
          </div>

          {showTeamCreate && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder={t.teamNamePlaceholder}
                    className="flex-1"
                    data-testid="input-team-name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateTeam();
                      if (e.key === "Escape") setShowTeamCreate(false);
                    }}
                    autoFocus
                  />
                  <Button onClick={handleCreateTeam} disabled={createTeamMutation.isPending} data-testid="button-create-team">
                    {t.createTeam}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setShowTeamCreate(false)} data-testid="button-cancel-team-create">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!teamsList || teamsList.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center space-y-2">
                <Users className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">{t.noTeamsYet}</p>
                <p className="text-xs text-muted-foreground">{t.createFirstTeam}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-wrap gap-2">
              {teamsList.map((team) => (
                <Card key={team.id} className="inline-flex" data-testid={`card-team-${team.id}`}>
                  <CardContent className="p-2 flex items-center gap-2">
                    {editingTeamId === team.id ? (
                      <>
                        <Input
                          value={editingTeamName}
                          onChange={(e) => setEditingTeamName(e.target.value)}
                          className="h-8 w-32"
                          data-testid={`input-edit-team-${team.id}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editingTeamName.trim()) {
                              updateTeamMutation.mutate({ id: team.id, name: editingTeamName.trim() });
                            }
                            if (e.key === "Escape") setEditingTeamId(null);
                          }}
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (editingTeamName.trim()) {
                              updateTeamMutation.mutate({ id: team.id, name: editingTeamName.trim() });
                            }
                          }}
                          data-testid={`button-save-team-${team.id}`}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingTeamId(null)} data-testid={`button-cancel-edit-team-${team.id}`}>
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link href={`/team/${team.id}`} className="flex items-center gap-2 hover-elevate cursor-pointer rounded px-1 py-0.5">
                          <Users className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-sm font-medium" data-testid={`text-team-name-${team.id}`}>{team.name}</span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingTeamId(team.id); setEditingTeamName(team.name); }}
                          data-testid={`button-edit-team-${team.id}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTeamMutation.mutate(team.id)}
                          data-testid={`button-delete-team-${team.id}`}
                        >
                          <Trash2 className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-xl font-semibold">{t.myTournaments}</h2>
          <Button onClick={() => setShowCreate(true)} data-testid="button-new-tournament">
            <Plus className="w-4 h-4 mr-2" />
            {t.newTournament}
          </Button>
        </div>

        {showCreate && (
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t.tournamentNamePlaceholder}
                  className="flex-1"
                  data-testid="input-tournament-name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setShowCreate(false);
                  }}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t.scoringRules}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t.setFormat}</Label>
                    <Select
                      value={String(newSetFormat)}
                      onValueChange={(v) => setNewSetFormat(parseInt(v))}
                    >
                      <SelectTrigger data-testid="select-set-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{t.singleSet}</SelectItem>
                        <SelectItem value="3">{t.bestOf3}</SelectItem>
                        <SelectItem value="5">{t.bestOf5}</SelectItem>
                        <SelectItem value="7">{t.bestOf7}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.regularSetPoints}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newRegularPts}
                      onChange={(e) => setNewRegularPts(parseInt(e.target.value) || 25)}
                      data-testid="input-regular-set-points"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.finalSetPoints}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newFinalPts}
                      onChange={(e) => setNewFinalPts(parseInt(e.target.value) || 15)}
                      data-testid="input-final-set-points"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  data-testid="button-create-tournament"
                >
                  {t.createTournament}
                </Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)} data-testid="button-cancel-create">
                  {t.cancel}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-48 mb-3" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !tournamentsList || tournamentsList.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">{t.noTournamentsYet}</p>
              <p className="text-sm text-muted-foreground">{t.createFirstTournament}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tournamentsList.map((tournament) => {
              const counts = getMatchCountForTournament(tournament.id);
              return (
                <Link key={tournament.id} href={`/tournament/${tournament.id}`}>
                  <Card className="hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-tournament-${tournament.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Trophy className="w-5 h-5 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm truncate" data-testid={`text-tournament-name-${tournament.id}`}>
                              {tournament.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                {getSetFormatLabel(tournament.setFormat)} · {tournament.regularSetPoints}/{tournament.finalSetPoints}{t.pointsUnit}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {counts.total} {counts.total === 1 ? t.match : t.matches_}
                              </span>
                              {counts.inProgress > 0 && (
                                <Badge className="text-xs">{counts.inProgress} {t.live}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {counts.total === 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteMutation.mutate(tournament.id);
                              }}
                              data-testid={`button-delete-tournament-${tournament.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
