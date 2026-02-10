# Volleyball Scorer

## Overview
A volleyball match scoring system with login, tournament management, match management, and real-time point-by-point scoring with notes. Bilingual (Chinese/English) interface optimized for mobile landscape usage. Supports multi-set scoring with configurable tournament rules. Includes player roster management, match lineup selection, substitution tracking, player-level point attribution, CSV export, and team collaboration.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + wouter routing + TanStack Query
- **Backend**: Express.js with session-based auth (express-session + connect-pg-simple)
- **Database**: PostgreSQL via Drizzle ORM
- **i18n**: Custom context-based i18n with Chinese (default) and English

## Key Pages
- `/` - Landing page: bilingual product introduction, feature highlights, CTA to login
- `/app/login` - Login page (default: admin / admin123)
- `/app/dashboard` - Team management + Tournament list with scoring rules display and creation form
- `/app/team/:id` - Team detail page: player roster management (add/edit/delete/jersey swap), team member invitations, CSV export
- `/app/tournament/:id` - Tournament detail with match list, scoring rules in header
- `/app/tournament/:tournamentId/match/new` - Create new match under tournament
- `/app/match/:id/score` - Live scoring interface with multi-set scoreboard, set navigation, point log with set dividers, player attribution (scorer/loser), lineup selection, substitution logging

## Database Schema
- `users` - id (uuid), username, password
- `teams` - id (serial), userId, name, createdAt
- `players` - id (serial), teamId, name, jerseyNumber, age (nullable), grade (nullable), createdAt
- `tournaments` - id (serial), userId, name, setFormat (1/3/5/7), regularSetPoints (default 25), finalSetPoints (default 15), createdAt
- `matches` - id (serial), userId, tournamentId, teamId (nullable, references teams), matchDate, matchTime, tournament (name cache), matchNumber, ourTeam, opponentTeam, ourScore (sets won), opponentScore (sets won), currentSet, status
- `match_sets` - id (serial), matchId, setNumber, ourScore, opponentScore, status, winningTeam
- `match_lineups` - id (serial), matchId, playerId, role (starter/libero/bench), jerseyNumberAtMatch
- `points` - id (serial), matchId, setNumber, pointNumber, scoringTeam, scoringPlayerId (nullable), losingPlayerId (nullable), ourScoreAfter, opponentScoreAfter, note
- `substitutions` - id (serial), matchId, setNumber, pointNumber, playerOutId, playerInId, createdAt
- `team_members` - id (serial), teamId, email, role (admin/member), status (invited/active), createdAt

## API Routes (all prefixed with /api)
- Auth: POST /auth/login, POST /auth/logout, GET /auth/me
- Teams: GET /teams, GET /teams/:id, POST /teams, PATCH /teams/:id, DELETE /teams/:id
- Players: GET /teams/:teamId/players, POST /teams/:teamId/players, PATCH /players/:id, DELETE /players/:id, POST /teams/:teamId/players/swap-jersey
- Tournaments: GET /tournaments, GET /tournaments/:id, POST /tournaments, PATCH /tournaments/:id, DELETE /tournaments/:id
- Matches: GET /matches, GET /tournaments/:tournamentId/matches, GET /matches/:id, POST /matches, PATCH /matches/:id
- Match Sets: GET /matches/:id/sets
- Points: GET /matches/:id/points, POST /matches/:id/points, PATCH /matches/:id/points/:pointId, DELETE /matches/:id/points/last
- Lineups: GET /matches/:id/lineups, POST /matches/:id/lineups
- Substitutions: GET /matches/:id/substitutions, POST /matches/:id/substitutions
- Exports: GET /export/match/:id, GET /export/tournament/:id, GET /export/player/:id
- Team Members: GET /teams/:teamId/members, POST /teams/:teamId/members, PATCH /team-members/:id, DELETE /team-members/:id, POST /teams/:teamId/transfer-admin

## Player & Lineup System
- Players belong to teams with required name + jersey number, optional age + grade
- Jersey numbers can be atomically swapped between two players
- Match lineups: 6 starters + 1 libero required before scoring can use player attribution
- Substitutions logged at specific set/point numbers during match
- Points can optionally record scoringPlayerId and losingPlayerId for player attribution

## Team System
- Users can manage multiple teams under their account
- Each team has a roster of players managed on the team detail page
- When creating a match, user can select a team from dropdown to auto-fill "ourTeam"
- Fallback: manual input option if no teams exist or user chooses "manual input"
- Match creation sends teamId (for team-linked matches) or ourTeam string (for manual)
- Team members can be invited via email with admin/member roles

## Scoring System
- Tournaments define scoring rules: set format (single/best-of-3/5/7), regular set points (default 25), final set points (default 15)
- Match ourScore/opponentScore represent **sets won** (not points)
- Deuce mechanism: when both teams reach targetPoints-1, must win by 2
- Set win detection is automatic; when a set is won, next set auto-creates
- Match completes when one team reaches needed wins (e.g., 2 for best-of-3)
- Undo can traverse back across set boundaries
- Retroactive scoring team edits cascade-recalculate scores within the set

## Export System
- Match CSV: point-by-point with player attribution columns
- Tournament CSV: all matches' points aggregated
- Player CSV: all points where player was scorer or loser across all matches

## Navigation Flow
Landing page (product intro) → Login → Dashboard (teams + tournament list with rules) → Team detail (player roster, members) → Tournament detail (matches showing sets won) → Match scoring page (lineup, substitution, player attribution, set-by-set scoring)
Match creation happens under a tournament context.
All app pages are under /app/* prefix; landing page is at /.

## User Preferences
- Chinese as default language
- Landscape mobile optimization for scoring page
- Point log display modes: vertical (list) and horizontal (grid with popovers)
