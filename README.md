# Volleyball Scorer 排球計分系統

[中文](#中文說明) | [English](#english)

---

## 中文說明

### 簡介
一套完整的排球比賽計分系統，支援隊伍管理、球員名冊、賽事管理、即時逐分計分、球員歸因統計、陣容與換人管理、CSV 資料匯出，以及多人協作功能。介面支援中文/英文雙語切換，計分頁面針對手機橫向使用做了最佳化。

### 功能特色

**隊伍與球員管理**
- 建立與管理多支隊伍
- 球員名冊：姓名、背號、年齡、年級
- 背號交換（兩位球員原子性互換背號）
- 透過 Email 邀請隊伍管理員，支援角色（管理員/成員）和管理權移轉

**賽事與比賽**
- 賽事建立：可設定賽制（單局/三戰兩勝/五戰三勝/七戰四勝）
- 自訂正規局分數（預設 25 分）和決勝局分數（預設 15 分）
- 比賽可關聯隊伍或手動輸入隊名

**即時計分**
- 逐分記錄，自動計算局數勝負
- Deuce 機制：雙方達到目標分數 -1 後須贏 2 分
- 局結束後自動進入下一局，比賽結束自動判定
- 撤銷功能：可跨局撤銷最後一分
- 修改得分隊伍時自動重新計算該局分數

**球員歸因與陣容**
- 比賽開始前設定陣容：6 位先發 + 1 位自由球員
- 每得一分可記錄得分球員和失分球員
- 換人記錄：記錄在第幾局第幾分換了誰

**資料匯出**
- 單場比賽 CSV：逐分記錄含球員歸因
- 賽事 CSV：該賽事所有比賽的匯總
- 球員 CSV：個人在所有比賽中的得失分記錄

**多語系**
- 中文（預設）和英文介面切換
- 所有頁面完整翻譯

### 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 18 + Vite + Tailwind CSS + shadcn/ui + wouter + TanStack Query |
| 後端 | Express.js 5 + TypeScript |
| 資料庫 | PostgreSQL + Drizzle ORM |
| 認證 | express-session + connect-pg-simple |

### 快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數（建立 .env 檔案）
DATABASE_URL=postgresql://user:pass@localhost:5432/volleyball
SESSION_SECRET=your-secret-key
PGHOST=localhost
PGPORT=5432
PGUSER=user
PGPASSWORD=pass
PGDATABASE=volleyball

# 3. 建立資料庫結構
npm run db:push

# 4. 啟動開發伺服器
npm run dev

# 5. 開啟瀏覽器 http://localhost:5000
# 預設帳號：admin / admin123
```

### 生產部署

```bash
# 建置前後端
npm run build

# 啟動
NODE_ENV=production node dist/index.cjs
```

詳細部署說明請參考 [DEPLOYMENT.md](./DEPLOYMENT.md)。

### 頁面導覽

```
登入 → 首頁（隊伍管理 + 賽事列表）
  ├── 隊伍詳細頁（球員名冊、成員邀請）
  └── 賽事詳細頁（比賽列表）
       └── 比賽計分頁（陣容、換人、逐分計分、球員歸因）
```

---

## English

### Overview
A comprehensive volleyball match scoring system featuring team management, player rosters, tournament management, real-time point-by-point scoring, player attribution statistics, lineup and substitution management, CSV data export, and team collaboration. Bilingual interface (Chinese/English) with mobile landscape optimization for the scoring page.

### Features

**Team & Player Management**
- Create and manage multiple teams
- Player roster: name, jersey number, age, grade
- Jersey number swapping (atomic swap between two players)
- Invite team members via email with role-based access (admin/member) and admin transfer

**Tournaments & Matches**
- Tournament creation with configurable set format (single / best-of-3 / best-of-5 / best-of-7)
- Custom regular set points (default 25) and final set points (default 15)
- Match can be linked to a team or use manually entered team names

**Live Scoring**
- Point-by-point recording with automatic set win detection
- Deuce mechanism: when both teams reach target - 1, must win by 2
- Auto-advance to next set; auto-complete match when winner determined
- Undo across set boundaries
- Retroactive scoring team edits cascade-recalculate scores within the set

**Player Attribution & Lineups**
- Pre-match lineup: 6 starters + 1 libero
- Record scoring player and losing player for each point
- Substitution logging: track who was swapped at which set/point

**Data Export**
- Match CSV: point-by-point with player attribution columns
- Tournament CSV: all matches aggregated
- Player CSV: individual scoring/losing records across all matches

**Bilingual Interface**
- Chinese (default) and English interface toggle
- Full translation coverage across all pages

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + shadcn/ui + wouter + TanStack Query |
| Backend | Express.js 5 + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | express-session + connect-pg-simple |

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables (create .env file)
DATABASE_URL=postgresql://user:pass@localhost:5432/volleyball
SESSION_SECRET=your-secret-key
PGHOST=localhost
PGPORT=5432
PGUSER=user
PGPASSWORD=pass
PGDATABASE=volleyball

# 3. Push database schema
npm run db:push

# 4. Start development server
npm run dev

# 5. Open browser at http://localhost:5000
# Default credentials: admin / admin123
```

### Production Deployment

```bash
# Build frontend and backend
npm run build

# Start production server
NODE_ENV=production node dist/index.cjs
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including Docker and Nginx configurations.

### Navigation Flow

```
Login → Dashboard (Team Management + Tournament List)
  ├── Team Detail (Player Roster, Member Invitations)
  └── Tournament Detail (Match List)
       └── Match Scoring (Lineup, Substitution, Point-by-Point Scoring, Player Attribution)
```

### Database Schema

10 tables: `users`, `teams`, `players`, `tournaments`, `matches`, `match_sets`, `match_lineups`, `points`, `substitutions`, `team_members`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete schema documentation.

### License

MIT
