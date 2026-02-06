import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import type { Team, Player, TeamMember } from "@shared/schema";
import { ArrowLeft, Plus, Trash2, Pencil, ArrowLeftRight, Languages, Users, Mail, ShieldCheck, X, Check, Download } from "lucide-react";

export default function TeamDetailPage() {
  const [, params] = useRoute("/team/:id");
  const teamId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const { t, lang, toggleLang } = useI18n();

  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [playerForm, setPlayerForm] = useState({ name: "", jerseyNumber: "", age: "", grade: "" });
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", jerseyNumber: "", age: "", grade: "" });
  const [swapMode, setSwapMode] = useState(false);
  const [swapPlayerA, setSwapPlayerA] = useState<number | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: team, isLoading: teamLoading } = useQuery<Team>({
    queryKey: ["/api/teams", teamId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: teamId > 0,
  });

  const { data: playersList = [], isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ["/api/teams", teamId, "players"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: teamId > 0,
  });

  const { data: membersList = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", teamId, "members"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: teamId > 0,
  });

  const addPlayerMutation = useMutation({
    mutationFn: async (data: { name: string; jerseyNumber: number; age?: number; grade?: string }) => {
      return apiRequest("POST", `/api/teams/${teamId}/players`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "players"] });
      setPlayerForm({ name: "", jerseyNumber: "", age: "", grade: "" });
      setShowAddPlayer(false);
    },
    onError: (err: any) => {
      toast({ title: t.playerCreateFailed, description: err.message, variant: "destructive" });
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/players/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "players"] });
      setEditingPlayerId(null);
    },
    onError: (err: any) => {
      toast({ title: t.playerUpdateFailed, description: err.message, variant: "destructive" });
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/players/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "players"] });
    },
    onError: (err: any) => {
      toast({ title: t.playerDeleteFailed, description: err.message, variant: "destructive" });
    },
  });

  const swapJerseyMutation = useMutation({
    mutationFn: async ({ playerAId, playerBId }: { playerAId: number; playerBId: number }) => {
      return apiRequest("POST", `/api/teams/${teamId}/players/swap-jersey`, { playerAId, playerBId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "players"] });
      setSwapMode(false);
      setSwapPlayerA(null);
    },
    onError: (err: any) => {
      toast({ title: t.swapJerseyFailed, description: err.message, variant: "destructive" });
    },
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest("POST", `/api/teams/${teamId}/members`, { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
      setInviteEmail("");
      setShowInvite(false);
    },
    onError: (err: any) => {
      toast({ title: t.inviteFailed, description: err.message, variant: "destructive" });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/team-members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
    },
  });

  const transferAdminMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return apiRequest("POST", `/api/teams/${teamId}/transfer-admin`, { memberId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
    },
    onError: (err: any) => {
      toast({ title: t.transferAdminFailed, description: err.message, variant: "destructive" });
    },
  });

  const handleAddPlayer = () => {
    const { name, jerseyNumber } = playerForm;
    if (!name.trim() || !jerseyNumber) {
      toast({ title: t.enterPlayerNameAndNumber, variant: "destructive" });
      return;
    }
    addPlayerMutation.mutate({
      name: name.trim(),
      jerseyNumber: parseInt(jerseyNumber),
      age: playerForm.age ? parseInt(playerForm.age) : undefined,
      grade: playerForm.grade || undefined,
    });
  };

  const handleSaveEdit = (id: number) => {
    updatePlayerMutation.mutate({
      id,
      data: {
        name: editForm.name,
        jerseyNumber: parseInt(editForm.jerseyNumber),
        age: editForm.age ? parseInt(editForm.age) : null,
        grade: editForm.grade || null,
      },
    });
  };

  const startEdit = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditForm({
      name: player.name,
      jerseyNumber: String(player.jerseyNumber),
      age: player.age ? String(player.age) : "",
      grade: player.grade || "",
    });
  };

  const handleSwapClick = (playerId: number) => {
    if (swapPlayerA === null) {
      setSwapPlayerA(playerId);
    } else if (swapPlayerA !== playerId) {
      swapJerseyMutation.mutate({ playerAId: swapPlayerA, playerBId: playerId });
    }
  };

  if (teamLoading || playersLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur px-4 py-2">
          <Skeleton className="h-6 w-48" />
        </header>
        <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </main>
      </div>
    );
  }

  if (!team) {
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
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2 px-4 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back-to-dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-sm font-bold truncate" data-testid="text-team-name">{team.name}</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleLang} data-testid="button-lang-toggle">
            <Languages className="w-4 h-4 mr-1" />
            {lang === "zh" ? "EN" : "中"}
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t.players} ({playersList.length})
          </h2>
          <div className="flex items-center gap-1">
            {playersList.length >= 2 && (
              <Button
                variant={swapMode ? "default" : "outline"}
                size="sm"
                onClick={() => { setSwapMode(!swapMode); setSwapPlayerA(null); }}
                data-testid="button-swap-jersey"
              >
                <ArrowLeftRight className="w-4 h-4 mr-1" />
                {t.swapJersey}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddPlayer(!showAddPlayer)}
              data-testid="button-add-player"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t.addPlayer}
            </Button>
          </div>
        </div>

        {swapMode && (
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{t.swapJerseyDesc}</p>
              {swapPlayerA !== null && (
                <p className="text-xs mt-1 text-primary">
                  {playersList.find(p => p.id === swapPlayerA)?.name} #{playersList.find(p => p.id === swapPlayerA)?.jerseyNumber} →
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {showAddPlayer && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t.playerName} *</Label>
                  <Input
                    data-testid="input-player-name"
                    placeholder={t.playerNamePlaceholder}
                    value={playerForm.name}
                    onChange={(e) => setPlayerForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.jerseyNumber} *</Label>
                  <Input
                    type="number"
                    data-testid="input-jersey-number"
                    placeholder={t.jerseyNumberPlaceholder}
                    value={playerForm.jerseyNumber}
                    onChange={(e) => setPlayerForm(f => ({ ...f, jerseyNumber: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t.age}</Label>
                  <Input
                    type="number"
                    data-testid="input-player-age"
                    placeholder={t.agePlaceholder}
                    value={playerForm.age}
                    onChange={(e) => setPlayerForm(f => ({ ...f, age: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.grade}</Label>
                  <Input
                    data-testid="input-player-grade"
                    placeholder={t.gradePlaceholder}
                    value={playerForm.grade}
                    onChange={(e) => setPlayerForm(f => ({ ...f, grade: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddPlayer} disabled={addPlayerMutation.isPending} data-testid="button-confirm-add-player">
                  {t.confirm}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddPlayer(false)} data-testid="button-cancel-add-player">
                  {t.cancel}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {playersList.length === 0 && !showAddPlayer && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground text-sm">{t.noPlayersYet}</p>
              <p className="text-muted-foreground text-xs mt-1">{t.addFirstPlayer}</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-1.5">
          {playersList.map((player) => (
            <Card
              key={player.id}
              className={`${swapMode ? "cursor-pointer" : ""} ${swapPlayerA === player.id ? "ring-2 ring-primary" : ""}`}
              onClick={swapMode ? () => handleSwapClick(player.id) : undefined}
              data-testid={`card-player-${player.id}`}
            >
              <CardContent className="p-3">
                {editingPlayerId === player.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                        data-testid={`input-edit-player-name-${player.id}`}
                      />
                      <Input
                        type="number"
                        value={editForm.jerseyNumber}
                        onChange={(e) => setEditForm(f => ({ ...f, jerseyNumber: e.target.value }))}
                        data-testid={`input-edit-jersey-${player.id}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        value={editForm.age}
                        placeholder={t.agePlaceholder}
                        onChange={(e) => setEditForm(f => ({ ...f, age: e.target.value }))}
                      />
                      <Input
                        value={editForm.grade}
                        placeholder={t.gradePlaceholder}
                        onChange={(e) => setEditForm(f => ({ ...f, grade: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => handleSaveEdit(player.id)} data-testid={`button-save-player-${player.id}`}>
                        <Check className="w-3 h-3 mr-1" />{t.save}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingPlayerId(null)}>
                        <X className="w-3 h-3 mr-1" />{t.cancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant="secondary" className="text-sm font-bold tabular-nums shrink-0" data-testid={`badge-jersey-${player.id}`}>
                        #{player.jerseyNumber}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-player-name-${player.id}`}>{player.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {player.age && `${t.age}: ${player.age}`}
                          {player.age && player.grade && " · "}
                          {player.grade && `${t.grade}: ${player.grade}`}
                        </p>
                      </div>
                    </div>
                    {!swapMode && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); window.location.href = `/api/export/player/${player.id}`; }}
                          data-testid={`button-export-player-${player.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => startEdit(player)} data-testid={`button-edit-player-${player.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deletePlayerMutation.mutate(player.id)} data-testid={`button-delete-player-${player.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t.teamMembers}
            </h2>
            <Button variant="outline" size="sm" onClick={() => setShowInvite(!showInvite)} data-testid="button-invite-member">
              <Plus className="w-4 h-4 mr-1" />
              {t.inviteMember}
            </Button>
          </div>

          {showInvite && (
            <Card className="mb-3">
              <CardContent className="p-3">
                <div className="flex gap-2">
                  <Input
                    data-testid="input-invite-email"
                    placeholder={t.emailPlaceholder}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => inviteEmail.trim() && inviteMemberMutation.mutate(inviteEmail.trim())}
                    disabled={inviteMemberMutation.isPending}
                    data-testid="button-confirm-invite"
                  >
                    {t.invite}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {membersList.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">{t.noPlayersYet}</p>
          )}

          <div className="space-y-1.5">
            {membersList.map((member) => (
              <Card key={member.id} data-testid={`card-member-${member.id}`}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{member.email}</p>
                    <Badge variant="secondary" className="text-xs">
                      {member.role === "admin" ? t.admin : t.member} · {member.status === "invited" ? t.invited : t.active}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {member.status === "active" && member.role !== "admin" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(t.transferAdminConfirm)) {
                            transferAdminMutation.mutate(member.id);
                          }
                        }}
                        data-testid={`button-transfer-admin-${member.id}`}
                      >
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        {t.transferAdmin}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteMemberMutation.mutate(member.id)} data-testid={`button-remove-member-${member.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
