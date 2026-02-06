// =============================================================================
// Database Schema - 資料庫結構定義
// 使用 Drizzle ORM 定義 PostgreSQL 資料表
// 每張表都有對應的 insert schema (Zod驗證) 和 TypeScript 型別
// =============================================================================

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// -----------------------------------------------------------------------------
// users - 使用者帳號
// 支援帳號密碼登入，未來可擴充 OAuth (Gmail) 登入
// -----------------------------------------------------------------------------
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// -----------------------------------------------------------------------------
// teams - 隊伍
// 每個使用者可管理多支隊伍，隊伍下可有球員名冊和管理員
// -----------------------------------------------------------------------------
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// -----------------------------------------------------------------------------
// players - 球員名冊
// 隸屬於隊伍，必填：姓名 + 背號，選填：年齡 + 年級
// 背號可透過 swap-jersey API 在兩位球員間原子交換
// -----------------------------------------------------------------------------
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  name: text("name").notNull(),
  jerseyNumber: integer("jersey_number").notNull(),
  age: integer("age"),
  grade: text("grade"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
});

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

// -----------------------------------------------------------------------------
// tournaments - 賽事/杯賽
// 定義賽制規則：局數格式(1/3/5/7)、正規局分數、決勝局分數
// -----------------------------------------------------------------------------
export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  setFormat: integer("set_format").notNull().default(1),       // 1=單局, 3=三戰兩勝, 5=五戰三勝, 7=七戰四勝
  regularSetPoints: integer("regular_set_points").notNull().default(25), // 正規局目標分數
  finalSetPoints: integer("final_set_points").notNull().default(15),     // 決勝局目標分數
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
});

export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournaments.$inferSelect;

// -----------------------------------------------------------------------------
// matches - 比賽
// 隸屬於賽事，可關聯到隊伍(teamId)或手動輸入隊名
// ourScore/opponentScore 代表「贏的局數」，不是分數
// status: "in_progress" | "completed"
// -----------------------------------------------------------------------------
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id),
  teamId: integer("team_id").references(() => teams.id),          // 關聯隊伍（可為 null = 手動輸入）
  matchDate: text("match_date").notNull(),
  matchTime: text("match_time").notNull(),
  tournament: text("tournament").notNull(),                        // 賽事名稱快取
  matchNumber: text("match_number").notNull(),
  ourTeam: text("our_team").notNull(),
  opponentTeam: text("opponent_team").notNull(),
  ourScore: integer("our_score").notNull().default(0),             // 我方贏的局數
  opponentScore: integer("opponent_score").notNull().default(0),   // 對手贏的局數
  currentSet: integer("current_set").notNull().default(1),         // 目前進行到第幾局
  status: text("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  ourScore: true,
  opponentScore: true,
  currentSet: true,
  status: true,
  createdAt: true,
});

export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;

// -----------------------------------------------------------------------------
// match_sets - 比賽局別
// 每一局的分數和勝負記錄，由計分系統自動管理
// -----------------------------------------------------------------------------
export const matchSets = pgTable("match_sets", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  setNumber: integer("set_number").notNull(),
  ourScore: integer("our_score").notNull().default(0),
  opponentScore: integer("opponent_score").notNull().default(0),
  status: text("status").notNull().default("in_progress"),
  winningTeam: text("winning_team"),                               // "our" | "opponent" | null
});

export const insertMatchSetSchema = createInsertSchema(matchSets).omit({
  id: true,
});

export type InsertMatchSet = z.infer<typeof insertMatchSetSchema>;
export type MatchSet = typeof matchSets.$inferSelect;

// -----------------------------------------------------------------------------
// match_lineups - 比賽陣容
// 記錄每場比賽的先發 6 人 + 自由球員 1 人
// role: "starter" | "libero" | "bench"
// -----------------------------------------------------------------------------
export const matchLineups = pgTable("match_lineups", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  playerId: integer("player_id").notNull().references(() => players.id),
  role: text("role").notNull().default("starter"),
  jerseyNumber: integer("jersey_number").notNull(),                // 該場比賽使用的背號（比賽開始時鎖定）
});

export const insertMatchLineupSchema = createInsertSchema(matchLineups).omit({
  id: true,
});

export type InsertMatchLineup = z.infer<typeof insertMatchLineupSchema>;
export type MatchLineup = typeof matchLineups.$inferSelect;

// -----------------------------------------------------------------------------
// substitutions - 換人記錄
// 記錄在第幾局第幾分時換了誰上場、誰下場
// -----------------------------------------------------------------------------
export const substitutions = pgTable("substitutions", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  setNumber: integer("set_number").notNull(),
  pointNumber: integer("point_number").notNull(),
  playerOutId: integer("player_out_id").notNull().references(() => players.id),
  playerInId: integer("player_in_id").notNull().references(() => players.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubstitutionSchema = createInsertSchema(substitutions).omit({
  id: true,
  createdAt: true,
});

export type InsertSubstitution = z.infer<typeof insertSubstitutionSchema>;
export type Substitution = typeof substitutions.$inferSelect;

// -----------------------------------------------------------------------------
// points - 逐分記錄
// 每得一分記錄一筆，包含得分方、得分後雙方分數、可選的球員歸因
// scoringPlayerId/losingPlayerId 需要先設定陣容才能使用
// -----------------------------------------------------------------------------
export const points = pgTable("points", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  setNumber: integer("set_number").notNull().default(1),
  pointNumber: integer("point_number").notNull(),
  scoringTeam: text("scoring_team").notNull(),                     // "our" | "opponent"
  ourScoreAfter: integer("our_score_after").notNull(),
  opponentScoreAfter: integer("opponent_score_after").notNull(),
  scoringPlayerId: integer("scoring_player_id").references(() => players.id), // 得分球員（可選）
  losingPlayerId: integer("losing_player_id").references(() => players.id),   // 失分球員（可選）
  note: text("note").default(""),                                  // 備註（得分方式等）
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPointSchema = createInsertSchema(points).omit({
  id: true,
  createdAt: true,
});

export type InsertPoint = z.infer<typeof insertPointSchema>;
export type Point = typeof points.$inferSelect;

// -----------------------------------------------------------------------------
// team_members - 隊伍成員/管理員
// 透過 Email 邀請其他人加入隊伍管理
// role: "admin" | "member"
// status: "invited"（已邀請待確認）| "active"（已加入）
// 未來串接郵件服務後，邀請時會自動寄出 Email
// -----------------------------------------------------------------------------
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  email: text("email").notNull(),
  userId: varchar("user_id").references(() => users.id),           // 接受邀請後填入對應的 user ID
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("invited"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
