import {
  type User,
  type InsertUser,
  type Team,
  type InsertTeam,
  type Player,
  type InsertPlayer,
  type Tournament,
  type InsertTournament,
  type Match,
  type InsertMatch,
  type MatchSet,
  type InsertMatchSet,
  type MatchLineup,
  type InsertMatchLineup,
  type Substitution,
  type InsertSubstitution,
  type Point,
  type InsertPoint,
  type TeamMember,
  type InsertTeamMember,
  users,
  teams,
  players,
  tournaments,
  matches,
  matchSets,
  matchLineups,
  substitutions,
  points,
  teamMembers,
} from "@shared/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  getTeamsByUser(userId: string): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, data: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;

  getPlayersByTeam(teamId: number): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, data: Partial<Player>): Promise<Player | undefined>;
  deletePlayer(id: number): Promise<boolean>;

  getTournamentsByUser(userId: string): Promise<Tournament[]>;
  getTournament(id: number): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: number, data: Partial<Tournament>): Promise<Tournament | undefined>;
  deleteTournament(id: number): Promise<boolean>;

  getMatchesByUser(userId: string): Promise<Match[]>;
  getMatchesByTournament(tournamentId: number): Promise<Match[]>;
  getMatch(id: number): Promise<Match | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: number, data: Partial<Match>): Promise<Match | undefined>;

  getSetsByMatch(matchId: number): Promise<MatchSet[]>;
  getSet(matchId: number, setNumber: number): Promise<MatchSet | undefined>;
  createSet(set: InsertMatchSet): Promise<MatchSet>;
  updateSet(id: number, data: Partial<MatchSet>): Promise<MatchSet | undefined>;

  getLineupsByMatch(matchId: number): Promise<MatchLineup[]>;
  createLineup(lineup: InsertMatchLineup): Promise<MatchLineup>;
  updateLineup(id: number, data: Partial<MatchLineup>): Promise<MatchLineup | undefined>;
  deleteLineupsByMatch(matchId: number): Promise<void>;

  getSubstitutionsByMatch(matchId: number): Promise<Substitution[]>;
  createSubstitution(sub: InsertSubstitution): Promise<Substitution>;
  deleteSubstitution(id: number): Promise<boolean>;

  getPointsByMatch(matchId: number): Promise<Point[]>;
  getPointsBySet(matchId: number, setNumber: number): Promise<Point[]>;
  createPoint(point: InsertPoint): Promise<Point>;
  updatePoint(id: number, data: Partial<Point>): Promise<Point | undefined>;
  deleteLastPoint(matchId: number): Promise<Point | undefined>;
  deleteLastPointInSet(matchId: number, setNumber: number): Promise<Point | undefined>;

  getTeamMembersByTeam(teamId: number): Promise<TeamMember[]>;
  getTeamMembersByEmail(email: string): Promise<TeamMember[]>;
  getTeamMember(id: number): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, data: Partial<TeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getTeamsByUser(userId: string): Promise<Team[]> {
    return db.select().from(teams).where(eq(teams.userId, userId)).orderBy(desc(teams.createdAt));
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [created] = await db.insert(teams).values(team).returning();
    return created;
  }

  async updateTeam(id: number, data: Partial<Team>): Promise<Team | undefined> {
    const [updated] = await db.update(teams).set(data).where(eq(teams.id, id)).returning();
    return updated;
  }

  async deleteTeam(id: number): Promise<boolean> {
    const teamPlayers = await db.select({ id: players.id }).from(players).where(eq(players.teamId, id));
    const playerIds = teamPlayers.map(p => p.id);

    if (playerIds.length > 0) {
      await db.update(points).set({ scoringPlayerId: null }).where(inArray(points.scoringPlayerId, playerIds));
      await db.update(points).set({ losingPlayerId: null }).where(inArray(points.losingPlayerId, playerIds));
      await db.delete(matchLineups).where(inArray(matchLineups.playerId, playerIds));
      await db.delete(substitutions).where(inArray(substitutions.playerOutId, playerIds));
      await db.delete(substitutions).where(inArray(substitutions.playerInId, playerIds));
      await db.delete(players).where(eq(players.teamId, id));
    }

    await db.delete(teamMembers).where(eq(teamMembers.teamId, id));
    await db.update(matches).set({ teamId: null }).where(eq(matches.teamId, id));
    await db.delete(teams).where(eq(teams.id, id));
    return true;
  }

  async getPlayersByTeam(teamId: number): Promise<Player[]> {
    return db.select().from(players).where(eq(players.teamId, teamId)).orderBy(players.jerseyNumber);
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [created] = await db.insert(players).values(player).returning();
    return created;
  }

  async updatePlayer(id: number, data: Partial<Player>): Promise<Player | undefined> {
    const [updated] = await db.update(players).set(data).where(eq(players.id, id)).returning();
    return updated;
  }

  async deletePlayer(id: number): Promise<boolean> {
    await db.delete(players).where(eq(players.id, id));
    return true;
  }

  async getTournamentsByUser(userId: string): Promise<Tournament[]> {
    return db.select().from(tournaments).where(eq(tournaments.userId, userId)).orderBy(desc(tournaments.createdAt));
  }

  async getTournament(id: number): Promise<Tournament | undefined> {
    const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return t;
  }

  async createTournament(tournament: InsertTournament): Promise<Tournament> {
    const [created] = await db.insert(tournaments).values(tournament).returning();
    return created;
  }

  async updateTournament(id: number, data: Partial<Tournament>): Promise<Tournament | undefined> {
    const [updated] = await db.update(tournaments).set(data).where(eq(tournaments.id, id)).returning();
    return updated;
  }

  async deleteTournament(id: number): Promise<boolean> {
    const result = await db.delete(tournaments).where(eq(tournaments.id, id));
    return true;
  }

  async getMatchesByUser(userId: string): Promise<Match[]> {
    return db.select().from(matches).where(eq(matches.userId, userId)).orderBy(desc(matches.createdAt));
  }

  async getMatchesByTournament(tournamentId: number): Promise<Match[]> {
    return db.select().from(matches).where(eq(matches.tournamentId, tournamentId)).orderBy(desc(matches.createdAt));
  }

  async getMatch(id: number): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const [created] = await db.insert(matches).values(match).returning();
    return created;
  }

  async updateMatch(id: number, data: Partial<Match>): Promise<Match | undefined> {
    const [updated] = await db.update(matches).set(data).where(eq(matches.id, id)).returning();
    return updated;
  }

  async getSetsByMatch(matchId: number): Promise<MatchSet[]> {
    return db.select().from(matchSets).where(eq(matchSets.matchId, matchId)).orderBy(matchSets.setNumber);
  }

  async getSet(matchId: number, setNumber: number): Promise<MatchSet | undefined> {
    const [set] = await db.select().from(matchSets)
      .where(and(eq(matchSets.matchId, matchId), eq(matchSets.setNumber, setNumber)));
    return set;
  }

  async createSet(set: InsertMatchSet): Promise<MatchSet> {
    const [created] = await db.insert(matchSets).values(set).returning();
    return created;
  }

  async updateSet(id: number, data: Partial<MatchSet>): Promise<MatchSet | undefined> {
    const [updated] = await db.update(matchSets).set(data).where(eq(matchSets.id, id)).returning();
    return updated;
  }

  async getLineupsByMatch(matchId: number): Promise<MatchLineup[]> {
    return db.select().from(matchLineups).where(eq(matchLineups.matchId, matchId));
  }

  async createLineup(lineup: InsertMatchLineup): Promise<MatchLineup> {
    const [created] = await db.insert(matchLineups).values(lineup).returning();
    return created;
  }

  async updateLineup(id: number, data: Partial<MatchLineup>): Promise<MatchLineup | undefined> {
    const [updated] = await db.update(matchLineups).set(data).where(eq(matchLineups.id, id)).returning();
    return updated;
  }

  async deleteLineupsByMatch(matchId: number): Promise<void> {
    await db.delete(matchLineups).where(eq(matchLineups.matchId, matchId));
  }

  async getSubstitutionsByMatch(matchId: number): Promise<Substitution[]> {
    return db.select().from(substitutions).where(eq(substitutions.matchId, matchId)).orderBy(substitutions.setNumber, substitutions.pointNumber);
  }

  async createSubstitution(sub: InsertSubstitution): Promise<Substitution> {
    const [created] = await db.insert(substitutions).values(sub).returning();
    return created;
  }

  async deleteSubstitution(id: number): Promise<boolean> {
    await db.delete(substitutions).where(eq(substitutions.id, id));
    return true;
  }

  async getPointsByMatch(matchId: number): Promise<Point[]> {
    return db.select().from(points).where(eq(points.matchId, matchId)).orderBy(points.setNumber, points.pointNumber);
  }

  async getPointsBySet(matchId: number, setNumber: number): Promise<Point[]> {
    return db.select().from(points)
      .where(and(eq(points.matchId, matchId), eq(points.setNumber, setNumber)))
      .orderBy(points.pointNumber);
  }

  async createPoint(point: InsertPoint): Promise<Point> {
    const [created] = await db.insert(points).values(point).returning();
    return created;
  }

  async updatePoint(id: number, data: Partial<Point>): Promise<Point | undefined> {
    const [updated] = await db.update(points).set(data).where(eq(points.id, id)).returning();
    return updated;
  }

  async deleteLastPoint(matchId: number): Promise<Point | undefined> {
    const allPoints = await this.getPointsByMatch(matchId);
    if (allPoints.length === 0) return undefined;
    const last = allPoints[allPoints.length - 1];
    await db.delete(points).where(eq(points.id, last.id));
    return last;
  }

  async deleteLastPointInSet(matchId: number, setNumber: number): Promise<Point | undefined> {
    const setPoints = await this.getPointsBySet(matchId, setNumber);
    if (setPoints.length === 0) return undefined;
    const last = setPoints[setPoints.length - 1];
    await db.delete(points).where(eq(points.id, last.id));
    return last;
  }

  async getTeamMembersByTeam(teamId: number): Promise<TeamMember[]> {
    return db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  async getTeamMembersByEmail(email: string): Promise<TeamMember[]> {
    return db.select().from(teamMembers).where(eq(teamMembers.email, email));
  }

  async getTeamMember(id: number): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [created] = await db.insert(teamMembers).values(member).returning();
    return created;
  }

  async updateTeamMember(id: number, data: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const [updated] = await db.update(teamMembers).set(data).where(eq(teamMembers.id, id)).returning();
    return updated;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
