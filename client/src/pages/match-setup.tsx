import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, Languages } from "lucide-react";
import { Link } from "wouter";
import type { Tournament, Team } from "@shared/schema";

export default function MatchSetupPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/app/tournament/:tournamentId/match/new");
  const tournamentId = params?.tournamentId ? parseInt(params.tournamentId) : 0;
  const { toast } = useToast();
  const { t, lang, toggleLang } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [manualOurTeam, setManualOurTeam] = useState("");

  const { data: tournament, isLoading: tournamentLoading } = useQuery<Tournament>({
    queryKey: ["/api/tournaments", tournamentId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: tournamentId > 0,
  });

  const { data: teamsList } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().slice(0, 5);

  const [formData, setFormData] = useState({
    matchDate: today,
    matchTime: now,
    matchNumber: "",
    opponentTeam: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const hasTeams = teamsList && teamsList.length > 0;
  const isManualInput = selectedTeamId === "manual";
  const selectedTeam = hasTeams && selectedTeamId && selectedTeamId !== "manual"
    ? teamsList.find((t) => String(t.id) === selectedTeamId)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { matchDate, matchTime, matchNumber, opponentTeam } = formData;
    const ourTeamName = selectedTeam ? selectedTeam.name : manualOurTeam;

    if (!matchDate || !matchTime || !matchNumber || !ourTeamName || !opponentTeam) {
      toast({ title: t.fillAllFields, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const body: any = {
        matchDate,
        matchTime,
        matchNumber,
        opponentTeam,
        tournamentId,
      };
      if (selectedTeam) {
        body.teamId = selectedTeam.id;
      } else {
        body.ourTeam = ourTeamName;
      }
      const res = await apiRequest("POST", "/api/matches", body);
      const match = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "matches"] });
      setLocation(`/app/match/${match.id}/score`);
    } catch (err: any) {
      toast({ title: t.createFailed, description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (tournamentLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur px-3 py-1.5">
          <Skeleton className="h-6 w-48" />
        </header>
        <main className="max-w-lg mx-auto px-3 py-3">
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-lg mx-auto flex items-center gap-1 px-3 py-1.5">
          <Link href={`/app/tournament/${tournamentId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-base font-bold truncate flex-1">{t.newMatch}</h1>
          {tournament && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]" data-testid="text-tournament-context">
              {tournament.name}
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={toggleLang} data-testid="button-lang-toggle">
            <Languages className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-3 py-3">
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-3 space-y-1">
              <Label htmlFor="matchDate" className="text-xs">{t.date}</Label>
              <Input
                id="matchDate"
                data-testid="input-match-date"
                type="date"
                value={formData.matchDate}
                onChange={(e) => updateField("matchDate", e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="matchTime" className="text-xs">{t.time}</Label>
              <Input
                id="matchTime"
                data-testid="input-match-time"
                type="time"
                value={formData.matchTime}
                onChange={(e) => updateField("matchTime", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="matchNumber" className="text-xs">{t.matchNumber}</Label>
            <Input
              id="matchNumber"
              data-testid="input-match-number"
              placeholder={t.matchNumberPlaceholder}
              value={formData.matchNumber}
              onChange={(e) => updateField("matchNumber", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{t.ourTeam}</Label>
            {hasTeams ? (
              <div className="space-y-1.5">
                <Select
                  value={selectedTeamId}
                  onValueChange={(v) => {
                    setSelectedTeamId(v);
                    if (v !== "manual") setManualOurTeam("");
                  }}
                >
                  <SelectTrigger data-testid="select-our-team">
                    <SelectValue placeholder={t.selectTeamPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {teamsList!.map((team) => (
                      <SelectItem key={team.id} value={String(team.id)} data-testid={`option-team-${team.id}`}>
                        {team.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="manual" data-testid="option-manual-input">
                      {t.manualInput}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {isManualInput && (
                  <Input
                    data-testid="input-our-team-manual"
                    placeholder={t.ourTeamPlaceholder}
                    value={manualOurTeam}
                    onChange={(e) => setManualOurTeam(e.target.value)}
                  />
                )}
              </div>
            ) : (
              <Input
                data-testid="input-our-team"
                placeholder={t.ourTeamPlaceholder}
                value={manualOurTeam}
                onChange={(e) => setManualOurTeam(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="opponentTeam" className="text-xs">{t.opponentTeam}</Label>
            <Input
              id="opponentTeam"
              data-testid="input-opponent-team"
              placeholder={t.opponentTeamPlaceholder}
              value={formData.opponentTeam}
              onChange={(e) => updateField("opponentTeam", e.target.value)}
            />
          </div>

          <div className="pt-1">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-create-match"
            >
              {isLoading ? t.creating : t.startMatch}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
