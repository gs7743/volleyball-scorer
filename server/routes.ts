import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { z } from "zod";

const PgStore = pgSession(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

const matchCreateSchema = z.object({
  tournamentId: z.number(),
  teamId: z.number().optional(),
  matchDate: z.string().min(1),
  matchTime: z.string().min(1),
  matchNumber: z.string().min(1),
  ourTeam: z.string().optional(),
  opponentTeam: z.string().min(1),
});

const tournamentCreateSchema = z.object({
  name: z.string().min(1),
  setFormat: z.number().optional(),
  regularSetPoints: z.number().optional(),
  finalSetPoints: z.number().optional(),
});

function getNeededWins(setFormat: number): number {
  switch (setFormat) {
    case 1: return 1;
    case 3: return 2;
    case 5: return 3;
    case 7: return 4;
    default: return 1;
  }
}

function isFinalSet(setNumber: number, setFormat: number): boolean {
  return setNumber === setFormat;
}

function checkSetWin(ourScore: number, oppScore: number, targetPoints: number): "our" | "opponent" | null {
  const maxScore = Math.max(ourScore, oppScore);
  const minScore = Math.min(ourScore, oppScore);
  if (maxScore >= targetPoints && (maxScore - minScore) >= 2) {
    return ourScore > oppScore ? "our" : "opponent";
  }
  return null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "volleyball-scorer-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  await seedDefaultUser();

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }
    const user = await storage.getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    req.session.userId = user.id;
    res.json({ ok: true, user: { id: user.id, username: user.username } });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json({ id: user.id, username: user.username });
  });

  // Tournament routes
  app.get("/api/tournaments", requireAuth, async (req: Request, res: Response) => {
    const list = await storage.getTournamentsByUser(req.session.userId!);
    res.json(list);
  });

  app.get("/api/tournaments/:id", requireAuth, async (req: Request, res: Response) => {
    const tournament = await storage.getTournament(parseInt(String(req.params.id)));
    if (!tournament || tournament.userId !== req.session.userId) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    res.json(tournament);
  });

  app.post("/api/tournaments", requireAuth, async (req: Request, res: Response) => {
    const parsed = tournamentCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Tournament name is required" });
    }
    const tournament = await storage.createTournament({
      name: parsed.data.name,
      userId: req.session.userId!,
      setFormat: parsed.data.setFormat ?? 1,
      regularSetPoints: parsed.data.regularSetPoints ?? 25,
      finalSetPoints: parsed.data.finalSetPoints ?? 15,
    });
    res.json(tournament);
  });

  app.patch("/api/tournaments/:id", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id));
    const tournament = await storage.getTournament(id);
    if (!tournament || tournament.userId !== req.session.userId) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    const updated = await storage.updateTournament(id, req.body);
    res.json(updated);
  });

  app.delete("/api/tournaments/:id", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id));
    const tournament = await storage.getTournament(id);
    if (!tournament || tournament.userId !== req.session.userId) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    const tournamentMatches = await storage.getMatchesByTournament(id);
    if (tournamentMatches.length > 0) {
      return res.status(400).json({ message: "Cannot delete tournament with matches" });
    }
    await storage.deleteTournament(id);
    res.json({ ok: true });
  });

  // Team routes
  app.get("/api/teams", requireAuth, async (req: Request, res: Response) => {
    const list = await storage.getTeamsByUser(req.session.userId!);
    res.json(list);
  });

  app.get("/api/teams/:id", requireAuth, async (req: Request, res: Response) => {
    const team = await storage.getTeam(parseInt(String(req.params.id)));
    if (!team || team.userId !== req.session.userId) {
      return res.status(404).json({ message: "Team not found" });
    }
    res.json(team);
  });

  app.post("/api/teams", requireAuth, async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Team name is required" });
    }
    const team = await storage.createTeam({
      name: name.trim(),
      userId: req.session.userId!,
    });
    res.json(team);
  });

  app.patch("/api/teams/:id", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id));
    const team = await storage.getTeam(id);
    if (!team || team.userId !== req.session.userId) {
      return res.status(404).json({ message: "Team not found" });
    }
    const updated = await storage.updateTeam(id, req.body);
    res.json(updated);
  });

  app.delete("/api/teams/:id", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id));
    const team = await storage.getTeam(id);
    if (!team || team.userId !== req.session.userId) {
      return res.status(404).json({ message: "Team not found" });
    }
    await storage.deleteTeam(id);
    res.json({ ok: true });
  });

  // Player routes
  app.get("/api/teams/:teamId/players", requireAuth, async (req: Request, res: Response) => {
    const teamId = parseInt(String(req.params.teamId));
    const team = await storage.getTeam(teamId);
    if (!team || team.userId !== req.session.userId) {
      return res.status(404).json({ message: "Team not found" });
    }
    const playerList = await storage.getPlayersByTeam(teamId);
    res.json(playerList);
  });

  app.post("/api/teams/:teamId/players", requireAuth, async (req: Request, res: Response) => {
    const teamId = parseInt(String(req.params.teamId));
    const team = await storage.getTeam(teamId);
    if (!team || team.userId !== req.session.userId) {
      return res.status(404).json({ message: "Team not found" });
    }
    const { name, jerseyNumber, age, grade } = req.body;
    if (!name || !name.trim() || jerseyNumber === undefined || jerseyNumber === null) {
      return res.status(400).json({ message: "Name and jersey number are required" });
    }
    const player = await storage.createPlayer({
      teamId,
      name: name.trim(),
      jerseyNumber: parseInt(String(jerseyNumber)),
      age: age ? parseInt(String(age)) : null,
      grade: grade || null,
    });
    res.json(player);
  });

  app.patch("/api/players/:id", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id));
    const player = await storage.getPlayer(id);
    if (!player) return res.status(404).json({ message: "Player not found" });
    const team = await storage.getTeam(player.teamId);
    if (!team || team.userId !== req.session.userId) {
      return res.status(404).json({ message: "Player not found" });
    }
    const updates: any = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.jerseyNumber !== undefined) updates.jerseyNumber = parseInt(String(req.body.jerseyNumber));
    if (req.body.age !== undefined) updates.age = req.body.age ? parseInt(String(req.body.age)) : null;
    if (req.body.grade !== undefined) updates.grade = req.body.grade || null;
    const updated = await storage.updatePlayer(id, updates);
    res.json(updated);
  });

  app.delete("/api/players/:id", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id));
    const player = await storage.getPlayer(id);
    if (!player) return res.status(404).json({ message: "Player not found" });
    const team = await storage.getTeam(player.teamId);
    if (!team || team.userId !== req.session.userId) {
      return res.status(404).json({ message: "Player not found" });
    }
    await storage.deletePlayer(id);
    res.json({ ok: true });
  });

  app.post("/api/teams/:teamId/players/swap-jersey", requireAuth, async (req: Request, res: Response) => {
    const teamId = parseInt(String(req.params.teamId));
    const team = await storage.getTeam(teamId);
    if (!team || team.userId !== req.session.userId) {
      return res.status(404).json({ message: "Team not found" });
    }
    const { playerAId, playerBId } = req.body;
    if (!playerAId || !playerBId) {
      return res.status(400).json({ message: "Two player IDs required" });
    }
    const playerA = await storage.getPlayer(playerAId);
    const playerB = await storage.getPlayer(playerBId);
    if (!playerA || !playerB || playerA.teamId !== teamId || playerB.teamId !== teamId) {
      return res.status(404).json({ message: "Players not found in this team" });
    }
    const tempNum = playerA.jerseyNumber;
    await storage.updatePlayer(playerA.id, { jerseyNumber: playerB.jerseyNumber });
    await storage.updatePlayer(playerB.id, { jerseyNumber: tempNum });
    res.json({ ok: true });
  });

  // Lineup routes
  app.get("/api/matches/:id/lineups", requireAuth, async (req: Request, res: Response) => {
    const matchId = parseInt(String(req.params.id));
    const match = await storage.getMatch(matchId);
    if (!match || match.userId !== req.session.userId) {
      return res.status(404).json({ message: "Match not found" });
    }
    const lineupList = await storage.getLineupsByMatch(matchId);
    res.json(lineupList);
  });

  app.post("/api/matches/:id/lineups", requireAuth, async (req: Request, res: Response) => {
    const matchId = parseInt(String(req.params.id));
    const match = await storage.getMatch(matchId);
    if (!match || match.userId !== req.session.userId) {
      return res.status(404).json({ message: "Match not found" });
    }
    const { players: lineupPlayers } = req.body;
    if (!Array.isArray(lineupPlayers) || lineupPlayers.length === 0) {
      return res.status(400).json({ message: "Players array required" });
    }
    const starters = lineupPlayers.filter((p: any) => p.role === "starter");
    const liberos = lineupPlayers.filter((p: any) => p.role === "libero");
    if (starters.length !== 6 || liberos.length !== 1) {
      return res.status(400).json({ message: "Must select 6 starters and 1 libero" });
    }
    await storage.deleteLineupsByMatch(matchId);
    const created = [];
    for (const lp of lineupPlayers) {
      const player = await storage.getPlayer(lp.playerId);
      if (!player) continue;
      const entry = await storage.createLineup({
        matchId,
        playerId: lp.playerId,
        role: lp.role,
        jerseyNumber: player.jerseyNumber,
      });
      created.push(entry);
    }
    res.json(created);
  });

  // Substitution routes
  app.get("/api/matches/:id/substitutions", requireAuth, async (req: Request, res: Response) => {
    const matchId = parseInt(String(req.params.id));
    const match = await storage.getMatch(matchId);
    if (!match || match.userId !== req.session.userId) {
      return res.status(404).json({ message: "Match not found" });
    }
    const subs = await storage.getSubstitutionsByMatch(matchId);
    res.json(subs);
  });

  app.post("/api/matches/:id/substitutions", requireAuth, async (req: Request, res: Response) => {
    const matchId = parseInt(String(req.params.id));
    const match = await storage.getMatch(matchId);
    if (!match || match.userId !== req.session.userId) {
      return res.status(404).json({ message: "Match not found" });
    }
    const { setNumber, pointNumber, playerOutId, playerInId } = req.body;
    if (!setNumber || pointNumber === undefined || !playerOutId || !playerInId) {
      return res.status(400).json({ message: "All substitution fields required" });
    }
    const sub = await storage.createSubstitution({
      matchId,
      setNumber,
      pointNumber,
      playerOutId,
      playerInId,
    });
    res.json(sub);
  });

  // Export routes
  app.get("/api/export/match/:id", requireAuth, async (req: Request, res: Response) => {
    const matchId = parseInt(String(req.params.id));
    const match = await storage.getMatch(matchId);
    if (!match || match.userId !== req.session.userId) {
      return res.status(404).json({ message: "Match not found" });
    }
    const pts = await storage.getPointsByMatch(matchId);
    const subs = await storage.getSubstitutionsByMatch(matchId);
    const lineupList = await storage.getLineupsByMatch(matchId);
    const sets = await storage.getSetsByMatch(matchId);

    const allPlayerIds: number[] = [];
    pts.forEach(p => { if (p.scoringPlayerId && !allPlayerIds.includes(p.scoringPlayerId)) allPlayerIds.push(p.scoringPlayerId); if (p.losingPlayerId && !allPlayerIds.includes(p.losingPlayerId)) allPlayerIds.push(p.losingPlayerId); });
    lineupList.forEach(l => { if (!allPlayerIds.includes(l.playerId)) allPlayerIds.push(l.playerId); });
    subs.forEach(s => { if (!allPlayerIds.includes(s.playerOutId)) allPlayerIds.push(s.playerOutId); if (!allPlayerIds.includes(s.playerInId)) allPlayerIds.push(s.playerInId); });

    const playerMap: Record<number, any> = {};
    for (const pid of allPlayerIds) {
      const player = await storage.getPlayer(pid);
      if (player) playerMap[pid] = player;
    }

    const csvRows = ["Set,Point,ScoringTeam,ScorerID,ScorerName,ScorerJersey,LoserID,LoserName,LoserJersey,OurScore,OpponentScore,Note"];
    for (const pt of pts) {
      const scorer = pt.scoringPlayerId ? playerMap[pt.scoringPlayerId] : null;
      const loser = pt.losingPlayerId ? playerMap[pt.losingPlayerId] : null;
      csvRows.push([
        pt.setNumber, pt.pointNumber, pt.scoringTeam,
        scorer?.id || "", scorer?.name || "", scorer?.jerseyNumber || "",
        loser?.id || "", loser?.name || "", loser?.jerseyNumber || "",
        pt.ourScoreAfter, pt.opponentScoreAfter, `"${(pt.note || "").replace(/"/g, '""')}"`,
      ].join(","));
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="match_${matchId}_${match.matchDate}.csv"`);
    res.send(csvRows.join("\n"));
  });

  app.get("/api/export/tournament/:id", requireAuth, async (req: Request, res: Response) => {
    const tournamentId = parseInt(String(req.params.id));
    const tournament = await storage.getTournament(tournamentId);
    if (!tournament || tournament.userId !== req.session.userId) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    const matchList = await storage.getMatchesByTournament(tournamentId);
    const csvRows = ["Match,MatchNumber,Date,OurTeam,Opponent,Set,Point,ScoringTeam,ScorerName,ScorerJersey,LoserName,LoserJersey,OurScore,OpponentScore,Note"];
    for (const m of matchList) {
      const pts = await storage.getPointsByMatch(m.id);
      for (const pt of pts) {
        let scorerName = "", scorerJersey = "", loserName = "", loserJersey = "";
        if (pt.scoringPlayerId) {
          const p = await storage.getPlayer(pt.scoringPlayerId);
          if (p) { scorerName = p.name; scorerJersey = String(p.jerseyNumber); }
        }
        if (pt.losingPlayerId) {
          const p = await storage.getPlayer(pt.losingPlayerId);
          if (p) { loserName = p.name; loserJersey = String(p.jerseyNumber); }
        }
        csvRows.push([
          m.id, m.matchNumber, m.matchDate, `"${m.ourTeam}"`, `"${m.opponentTeam}"`,
          pt.setNumber, pt.pointNumber, pt.scoringTeam,
          `"${scorerName}"`, scorerJersey, `"${loserName}"`, loserJersey,
          pt.ourScoreAfter, pt.opponentScoreAfter, `"${(pt.note || "").replace(/"/g, '""')}"`,
        ].join(","));
      }
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="tournament_${tournamentId}.csv"`);
    res.send(csvRows.join("\n"));
  });

  app.get("/api/export/player/:id", requireAuth, async (req: Request, res: Response) => {
    const playerId = parseInt(String(req.params.id));
    const player = await storage.getPlayer(playerId);
    if (!player) return res.status(404).json({ message: "Player not found" });
    const team = await storage.getTeam(player.teamId);
    if (!team || team.userId !== req.session.userId) {
      return res.status(404).json({ message: "Player not found" });
    }
    const allMatches = await storage.getMatchesByUser(req.session.userId!);
    const csvRows = ["Match,Date,OurTeam,Opponent,Set,Point,Role,ScoringTeam,OurScore,OpponentScore,Note"];
    for (const m of allMatches) {
      const pts = await storage.getPointsByMatch(m.id);
      for (const pt of pts) {
        if (pt.scoringPlayerId === playerId || pt.losingPlayerId === playerId) {
          const role = pt.scoringPlayerId === playerId ? "Scorer" : "Loser";
          csvRows.push([
            m.id, m.matchDate, `"${m.ourTeam}"`, `"${m.opponentTeam}"`,
            pt.setNumber, pt.pointNumber, role, pt.scoringTeam,
            pt.ourScoreAfter, pt.opponentScoreAfter, `"${(pt.note || "").replace(/"/g, '""')}"`,
          ].join(","));
        }
      }
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="player_${playerId}_${player.name}.csv"`);
    res.send(csvRows.join("\n"));
  });

  // Team member routes
  app.get("/api/teams/:teamId/members", requireAuth, async (req: Request, res: Response) => {
    const teamId = parseInt(String(req.params.teamId));
    const team = await storage.getTeam(teamId);
    if (!team || team.userId !== req.session.userId) {
      return res.status(404).json({ message: "Team not found" });
    }
    const members = await storage.getTeamMembersByTeam(teamId);
    res.json(members);
  });

  app.post("/api/teams/:teamId/members", requireAuth, async (req: Request, res: Response) => {
    const teamId = parseInt(String(req.params.teamId));
    const team = await storage.getTeam(teamId);
    if (!team || team.userId !== req.session.userId) {
      return res.status(404).json({ message: "Team not found" });
    }
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }
    const existing = await storage.getTeamMembersByTeam(teamId);
    if (existing.find(m => m.email === email.trim())) {
      return res.status(400).json({ message: "Already invited" });
    }
    const member = await storage.createTeamMember({
      teamId,
      email: email.trim(),
      role: "member",
      status: "invited",
      userId: null,
    });
    res.json(member);
  });

  app.patch("/api/team-members/:id", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id));
    const member = await storage.getTeamMember(id);
    if (!member) return res.status(404).json({ message: "Member not found" });
    const team = await storage.getTeam(member.teamId);
    if (!team || team.userId !== req.session.userId) {
      return res.status(404).json({ message: "Not authorized" });
    }
    const updates: any = {};
    if (req.body.role !== undefined) updates.role = req.body.role;
    if (req.body.status !== undefined) updates.status = req.body.status;
    const updated = await storage.updateTeamMember(id, updates);
    res.json(updated);
  });

  app.delete("/api/team-members/:id", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id));
    const member = await storage.getTeamMember(id);
    if (!member) return res.status(404).json({ message: "Member not found" });
    const team = await storage.getTeam(member.teamId);
    if (!team || team.userId !== req.session.userId) {
      return res.status(404).json({ message: "Not authorized" });
    }
    await storage.deleteTeamMember(id);
    res.json({ ok: true });
  });

  app.post("/api/teams/:teamId/transfer-admin", requireAuth, async (req: Request, res: Response) => {
    const teamId = parseInt(String(req.params.teamId));
    const team = await storage.getTeam(teamId);
    if (!team || team.userId !== req.session.userId) {
      return res.status(404).json({ message: "Team not found or not authorized" });
    }
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ message: "Member ID required" });
    const member = await storage.getTeamMember(memberId);
    if (!member || member.teamId !== teamId) {
      return res.status(404).json({ message: "Member not found" });
    }
    if (!member.userId) {
      return res.status(400).json({ message: "Member has not accepted invite yet" });
    }
    await storage.updateTeam(teamId, { userId: member.userId });
    await storage.updateTeamMember(memberId, { role: "admin" });
    res.json({ ok: true });
  });

  // Match routes
  app.get("/api/matches", requireAuth, async (req: Request, res: Response) => {
    const matchList = await storage.getMatchesByUser(req.session.userId!);
    res.json(matchList);
  });

  app.get("/api/tournaments/:tournamentId/matches", requireAuth, async (req: Request, res: Response) => {
    const tournamentId = parseInt(String(req.params.tournamentId));
    const tournament = await storage.getTournament(tournamentId);
    if (!tournament || tournament.userId !== req.session.userId) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    const matchList = await storage.getMatchesByTournament(tournamentId);
    res.json(matchList);
  });

  app.get("/api/matches/:id", requireAuth, async (req: Request, res: Response) => {
    const match = await storage.getMatch(parseInt(String(req.params.id)));
    if (!match || match.userId !== req.session.userId) {
      return res.status(404).json({ message: "Match not found" });
    }
    res.json(match);
  });

  app.post("/api/matches", requireAuth, async (req: Request, res: Response) => {
    const parsed = matchCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const tournament = await storage.getTournament(parsed.data.tournamentId);
    if (!tournament || tournament.userId !== req.session.userId) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    let ourTeamName = parsed.data.ourTeam || "";
    let teamId: number | null = null;
    if (parsed.data.teamId) {
      const team = await storage.getTeam(parsed.data.teamId);
      if (!team || team.userId !== req.session.userId) {
        return res.status(404).json({ message: "Team not found" });
      }
      ourTeamName = team.name;
      teamId = team.id;
    }
    if (!ourTeamName) {
      return res.status(400).json({ message: "Our team name is required" });
    }

    try {
      const match = await storage.createMatch({
        tournamentId: parsed.data.tournamentId,
        teamId,
        matchDate: parsed.data.matchDate,
        matchTime: parsed.data.matchTime,
        matchNumber: parsed.data.matchNumber,
        ourTeam: ourTeamName,
        opponentTeam: parsed.data.opponentTeam,
        tournament: tournament.name,
        userId: req.session.userId!,
      });
      await storage.createSet({
        matchId: match.id,
        setNumber: 1,
        ourScore: 0,
        opponentScore: 0,
        status: "in_progress",
        winningTeam: null,
      });
      res.json(match);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/matches/:id", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(String(req.params.id));
    const match = await storage.getMatch(id);
    if (!match || match.userId !== req.session.userId) {
      return res.status(404).json({ message: "Match not found" });
    }
    const updated = await storage.updateMatch(id, req.body);
    res.json(updated);
  });

  // Match sets route
  app.get("/api/matches/:id/sets", requireAuth, async (req: Request, res: Response) => {
    const matchId = parseInt(String(req.params.id));
    const match = await storage.getMatch(matchId);
    if (!match || match.userId !== req.session.userId) {
      return res.status(404).json({ message: "Match not found" });
    }
    const sets = await storage.getSetsByMatch(matchId);
    res.json(sets);
  });

  // Points routes
  app.get("/api/matches/:id/points", requireAuth, async (req: Request, res: Response) => {
    const matchId = parseInt(String(req.params.id));
    const match = await storage.getMatch(matchId);
    if (!match || match.userId !== req.session.userId) {
      return res.status(404).json({ message: "Match not found" });
    }
    const setNum = req.query.set ? parseInt(req.query.set as string) : undefined;
    if (setNum) {
      const pts = await storage.getPointsBySet(matchId, setNum);
      res.json(pts);
    } else {
      const pts = await storage.getPointsByMatch(matchId);
      res.json(pts);
    }
  });

  app.post("/api/matches/:id/points", requireAuth, async (req: Request, res: Response) => {
    const matchId = parseInt(String(req.params.id));
    const match = await storage.getMatch(matchId);
    if (!match || match.userId !== req.session.userId) {
      return res.status(404).json({ message: "Match not found" });
    }
    if (match.status === "completed") {
      return res.status(400).json({ message: "Match is completed" });
    }

    const { scoringTeam, scoringPlayerId, losingPlayerId, note: pointNote } = req.body;
    if (scoringTeam !== "our" && scoringTeam !== "opponent") {
      return res.status(400).json({ message: "Invalid scoring team" });
    }

    const tournament = await storage.getTournament(match.tournamentId);
    if (!tournament) {
      return res.status(500).json({ message: "Tournament not found" });
    }

    const currentSetNumber = match.currentSet;
    const currentSetRecord = await storage.getSet(matchId, currentSetNumber);
    if (!currentSetRecord) {
      return res.status(500).json({ message: "Current set not found" });
    }

    const setPoints = await storage.getPointsBySet(matchId, currentSetNumber);
    const pointNumber = setPoints.length + 1;
    const ourScoreAfter = currentSetRecord.ourScore + (scoringTeam === "our" ? 1 : 0);
    const opponentScoreAfter = currentSetRecord.opponentScore + (scoringTeam === "opponent" ? 1 : 0);

    const point = await storage.createPoint({
      matchId,
      setNumber: currentSetNumber,
      pointNumber,
      scoringTeam,
      ourScoreAfter,
      opponentScoreAfter,
      scoringPlayerId: scoringPlayerId || null,
      losingPlayerId: losingPlayerId || null,
      note: pointNote || "",
    });

    await storage.updateSet(currentSetRecord.id, {
      ourScore: ourScoreAfter,
      opponentScore: opponentScoreAfter,
    });

    const finalSet = isFinalSet(currentSetNumber, tournament.setFormat);
    const targetPoints = finalSet ? tournament.finalSetPoints : tournament.regularSetPoints;
    const setWinner = checkSetWin(ourScoreAfter, opponentScoreAfter, targetPoints);

    if (setWinner) {
      await storage.updateSet(currentSetRecord.id, {
        status: "completed",
        winningTeam: setWinner,
      });

      const allSets = await storage.getSetsByMatch(matchId);
      let ourSetsWon = 0;
      let oppSetsWon = 0;
      for (const s of allSets) {
        if (s.winningTeam === "our") ourSetsWon++;
        if (s.winningTeam === "opponent") oppSetsWon++;
      }

      const neededWins = getNeededWins(tournament.setFormat);

      if (ourSetsWon >= neededWins || oppSetsWon >= neededWins) {
        await storage.updateMatch(matchId, {
          ourScore: ourSetsWon,
          opponentScore: oppSetsWon,
          status: "completed",
        });
      } else {
        const nextSetNumber = currentSetNumber + 1;
        await storage.createSet({
          matchId,
          setNumber: nextSetNumber,
          ourScore: 0,
          opponentScore: 0,
          status: "in_progress",
          winningTeam: null,
        });
        await storage.updateMatch(matchId, {
          ourScore: ourSetsWon,
          opponentScore: oppSetsWon,
          currentSet: nextSetNumber,
        });
      }
    }

    res.json(point);
  });

  app.patch("/api/matches/:id/points/:pointId", requireAuth, async (req: Request, res: Response) => {
    const matchId = parseInt(String(req.params.id));
    const match = await storage.getMatch(matchId);
    if (!match || match.userId !== req.session.userId) {
      return res.status(404).json({ message: "Match not found" });
    }
    const pointId = parseInt(String(req.params.pointId));
    const { note, scoringTeam, scoringPlayerId, losingPlayerId } = req.body;

    if (scoringTeam && scoringTeam !== "our" && scoringTeam !== "opponent") {
      return res.status(400).json({ message: "Invalid scoring team" });
    }

    if (scoringPlayerId !== undefined || losingPlayerId !== undefined) {
      const updates: any = {};
      if (scoringPlayerId !== undefined) updates.scoringPlayerId = scoringPlayerId || null;
      if (losingPlayerId !== undefined) updates.losingPlayerId = losingPlayerId || null;
      await storage.updatePoint(pointId, updates);
    }

    if (scoringTeam) {
      const allPoints = await storage.getPointsByMatch(matchId);
      const pointIndex = allPoints.findIndex((p) => p.id === pointId);
      if (pointIndex === -1) return res.status(404).json({ message: "Point not found" });

      const targetPoint = allPoints[pointIndex];
      if (targetPoint.scoringTeam === scoringTeam) {
        return res.json(targetPoint);
      }

      const setNum = targetPoint.setNumber;
      const setPoints = allPoints.filter(p => p.setNumber === setNum);
      const setPointIndex = setPoints.findIndex(p => p.id === pointId);

      let ourRunning = setPointIndex > 0 ? setPoints[setPointIndex - 1].ourScoreAfter : 0;
      let oppRunning = setPointIndex > 0 ? setPoints[setPointIndex - 1].opponentScoreAfter : 0;

      for (let i = setPointIndex; i < setPoints.length; i++) {
        const p = setPoints[i];
        const team = i === setPointIndex ? scoringTeam : p.scoringTeam;
        ourRunning += team === "our" ? 1 : 0;
        oppRunning += team === "opponent" ? 1 : 0;
        await storage.updatePoint(p.id, {
          ...(i === setPointIndex ? { scoringTeam } : {}),
          ourScoreAfter: ourRunning,
          opponentScoreAfter: oppRunning,
        });
      }

      const setRecord = await storage.getSet(matchId, setNum);
      if (setRecord) {
        await storage.updateSet(setRecord.id, {
          ourScore: ourRunning,
          opponentScore: oppRunning,
        });

        const tournament = await storage.getTournament(match.tournamentId);
        if (tournament) {
          const finalSet = isFinalSet(setNum, tournament.setFormat);
          const targetPts = finalSet ? tournament.finalSetPoints : tournament.regularSetPoints;
          const newWinner = checkSetWin(ourRunning, oppRunning, targetPts);

          if (setRecord.status === "completed" && !newWinner) {
            await storage.updateSet(setRecord.id, { status: "in_progress", winningTeam: null });
          } else if (newWinner && newWinner !== setRecord.winningTeam) {
            await storage.updateSet(setRecord.id, { status: "completed", winningTeam: newWinner });
          }

          const allSets = await storage.getSetsByMatch(matchId);
          let ourSetsWon = 0;
          let oppSetsWon = 0;
          for (const s of allSets) {
            const freshSet = s.id === setRecord.id
              ? { ...s, ourScore: ourRunning, opponentScore: oppRunning, winningTeam: newWinner || null }
              : s;
            if (freshSet.winningTeam === "our") ourSetsWon++;
            if (freshSet.winningTeam === "opponent") oppSetsWon++;
          }
          await storage.updateMatch(matchId, {
            ourScore: ourSetsWon,
            opponentScore: oppSetsWon,
          });
        }
      }

      if (note !== undefined) {
        await storage.updatePoint(pointId, { note });
      }

      const updatedPoints = await storage.getPointsByMatch(matchId);
      const updatedPoint = updatedPoints.find((p) => p.id === pointId);
      return res.json(updatedPoint);
    }

    if (note !== undefined) {
      const updated = await storage.updatePoint(pointId, { note });
      if (!updated) return res.status(404).json({ message: "Point not found" });
      return res.json(updated);
    }

    return res.status(400).json({ message: "No update fields provided" });
  });

  app.delete("/api/matches/:id/points/last", requireAuth, async (req: Request, res: Response) => {
    const matchId = parseInt(String(req.params.id));
    const match = await storage.getMatch(matchId);
    if (!match || match.userId !== req.session.userId) {
      return res.status(404).json({ message: "Match not found" });
    }

    const currentSetNumber = match.currentSet;
    const currentSetRecord = await storage.getSet(matchId, currentSetNumber);

    if (currentSetRecord && currentSetRecord.status === "in_progress") {
      const setPoints = await storage.getPointsBySet(matchId, currentSetNumber);
      if (setPoints.length > 0) {
        const deleted = await storage.deleteLastPointInSet(matchId, currentSetNumber);
        if (!deleted) return res.status(400).json({ message: "No points to undo" });

        const remaining = await storage.getPointsBySet(matchId, currentSetNumber);
        const lastPoint = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        await storage.updateSet(currentSetRecord.id, {
          ourScore: lastPoint ? lastPoint.ourScoreAfter : 0,
          opponentScore: lastPoint ? lastPoint.opponentScoreAfter : 0,
        });

        return res.json({ ok: true });
      }
    }

    if (currentSetNumber > 1) {
      if (currentSetRecord) {
        const setPoints = await storage.getPointsBySet(matchId, currentSetNumber);
        if (setPoints.length === 0) {
          const { db } = await import("./storage");
          const { matchSets } = await import("@shared/schema");
          const { eq } = await import("drizzle-orm");
          await db.delete(matchSets).where(eq(matchSets.id, currentSetRecord.id));
        }
      }

      const prevSetNumber = currentSetNumber - 1;
      const prevSet = await storage.getSet(matchId, prevSetNumber);
      if (prevSet) {
        await storage.updateSet(prevSet.id, { status: "in_progress", winningTeam: null });

        const deleted = await storage.deleteLastPointInSet(matchId, prevSetNumber);
        if (!deleted) return res.status(400).json({ message: "No points to undo" });

        const remaining = await storage.getPointsBySet(matchId, prevSetNumber);
        const lastPoint = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        await storage.updateSet(prevSet.id, {
          ourScore: lastPoint ? lastPoint.ourScoreAfter : 0,
          opponentScore: lastPoint ? lastPoint.opponentScoreAfter : 0,
        });

        const allSets = await storage.getSetsByMatch(matchId);
        let ourSetsWon = 0;
        let oppSetsWon = 0;
        for (const s of allSets) {
          if (s.id === prevSet.id) continue;
          if (s.winningTeam === "our") ourSetsWon++;
          if (s.winningTeam === "opponent") oppSetsWon++;
        }

        await storage.updateMatch(matchId, {
          ourScore: ourSetsWon,
          opponentScore: oppSetsWon,
          currentSet: prevSetNumber,
          status: "in_progress",
        });

        return res.json({ ok: true });
      }
    }

    return res.status(400).json({ message: "No points to undo" });
  });

  return httpServer;
}

async function seedDefaultUser() {
  const existing = await storage.getUserByUsername("admin");
  if (!existing) {
    await storage.createUser({ username: "admin", password: "admin123" });
  }
}
