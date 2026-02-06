# Volleyball Scorer - 部署指南

## 專案概述
排球計分系統，支援多隊伍管理、球員名冊、賽事管理、即時逐分計分、球員歸因、陣容管理、換人記錄、CSV 匯出、多語系（中文/英文）。

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 18 + Vite + Tailwind CSS + shadcn/ui + wouter + TanStack Query |
| 後端 | Express.js 5 (Node.js) + TypeScript |
| 資料庫 | PostgreSQL (via Drizzle ORM) |
| 認證 | express-session + connect-pg-simple (session 存 PostgreSQL) |
| 建置 | Vite (前端) + esbuild (後端) |

---

## 專案結構

```
volleyball-scorer/
├── client/                    # 前端原始碼
│   ├── index.html             # HTML 入口
│   ├── public/                # 靜態資源
│   │   └── favicon.png
│   └── src/
│       ├── App.tsx            # 路由定義
│       ├── main.tsx           # React 入口
│       ├── index.css          # 全域樣式 + Tailwind
│       ├── components/ui/     # shadcn/ui 元件庫
│       ├── hooks/             # 自定義 hooks (toast, mobile)
│       ├── lib/
│       │   ├── i18n.tsx       # 中英文翻譯系統
│       │   ├── queryClient.ts # TanStack Query 設定 + API 請求
│       │   └── utils.ts       # 工具函式
│       └── pages/
│           ├── login.tsx           # 登入頁
│           ├── dashboard.tsx       # 首頁：隊伍 + 賽事列表
│           ├── team-detail.tsx     # 隊伍詳細：球員管理 + 成員邀請
│           ├── tournament-detail.tsx # 賽事詳細：比賽列表
│           ├── match-setup.tsx     # 建立比賽
│           ├── scoring.tsx         # 即時計分頁面
│           └── not-found.tsx       # 404
├── server/                    # 後端原始碼
│   ├── index.ts               # Express 入口 + HTTP server
│   ├── routes.ts              # 所有 API 路由 + 認證 + 業務邏輯
│   ├── storage.ts             # 資料存取層 (Drizzle ORM)
│   ├── vite.ts                # 開發模式 Vite 中間件
│   └── static.ts             # 生產模式靜態檔案服務
├── shared/
│   └── schema.ts              # 資料庫 schema + Zod 驗證 + TypeScript 型別
├── script/
│   └── build.ts               # 建置腳本 (Vite + esbuild)
├── drizzle.config.ts          # Drizzle ORM 設定
├── tailwind.config.ts         # Tailwind CSS 設定
├── tsconfig.json              # TypeScript 設定
├── vite.config.ts             # Vite 設定
└── package.json               # 依賴 + scripts
```

---

## 環境變數

| 變數名 | 必要 | 說明 |
|--------|------|------|
| `DATABASE_URL` | 是 | PostgreSQL 連線字串，例如 `postgresql://user:pass@host:5432/dbname` |
| `PGHOST` | 是 | PostgreSQL 主機 |
| `PGPORT` | 是 | PostgreSQL 連接埠（預設 5432） |
| `PGUSER` | 是 | PostgreSQL 使用者名稱 |
| `PGPASSWORD` | 是 | PostgreSQL 密碼 |
| `PGDATABASE` | 是 | PostgreSQL 資料庫名稱 |
| `SESSION_SECRET` | 是 | Session 加密金鑰（任意長字串） |
| `PORT` | 否 | 伺服器埠號（預設 5000） |
| `NODE_ENV` | 否 | `development` 或 `production` |

---

## 資料庫 Schema

共 10 張資料表：

### users（使用者）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | varchar (UUID) | 主鍵，自動產生 |
| username | text | 帳號（唯一） |
| password | text | 密碼 |

### teams（隊伍）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | serial | 主鍵 |
| userId | varchar | 擁有者 (references users.id) |
| name | text | 隊名 |
| createdAt | timestamp | 建立時間 |

### players（球員）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | serial | 主鍵 |
| teamId | integer | 所屬隊伍 (references teams.id) |
| name | text | 姓名（必填） |
| jerseyNumber | integer | 背號（必填） |
| age | integer | 年齡（選填） |
| grade | text | 年級（選填） |
| createdAt | timestamp | 建立時間 |

### tournaments（賽事/杯賽）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | serial | 主鍵 |
| userId | varchar | 擁有者 |
| name | text | 賽事名稱 |
| setFormat | integer | 賽制（1/3/5/7） |
| regularSetPoints | integer | 正規局目標分數（預設 25） |
| finalSetPoints | integer | 決勝局目標分數（預設 15） |
| createdAt | timestamp | 建立時間 |

### matches（比賽）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | serial | 主鍵 |
| userId | varchar | 擁有者 |
| tournamentId | integer | 所屬賽事 |
| teamId | integer | 關聯隊伍（可為 null） |
| matchDate | text | 比賽日期 |
| matchTime | text | 比賽時間 |
| tournament | text | 賽事名稱（快取） |
| matchNumber | text | 場次編號 |
| ourTeam | text | 我方隊名 |
| opponentTeam | text | 對手隊名 |
| ourScore | integer | 我方贏的局數 |
| opponentScore | integer | 對手贏的局數 |
| currentSet | integer | 目前局數 |
| status | text | 狀態（in_progress / completed） |

### match_sets（比賽局別）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | serial | 主鍵 |
| matchId | integer | 所屬比賽 |
| setNumber | integer | 第幾局 |
| ourScore | integer | 我方該局分數 |
| opponentScore | integer | 對手該局分數 |
| status | text | 狀態 |
| winningTeam | text | 勝隊（our / opponent） |

### match_lineups（比賽陣容）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | serial | 主鍵 |
| matchId | integer | 所屬比賽 |
| playerId | integer | 球員 ID |
| role | text | 角色（starter / libero / bench） |
| jerseyNumberAtMatch | integer | 該場比賽使用的背號 |

### points（逐分記錄）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | serial | 主鍵 |
| matchId | integer | 所屬比賽 |
| setNumber | integer | 第幾局 |
| pointNumber | integer | 第幾分 |
| scoringTeam | text | 得分方（our / opponent） |
| scoringPlayerId | integer | 得分球員（可為 null） |
| losingPlayerId | integer | 失分球員（可為 null） |
| ourScoreAfter | integer | 得分後我方分數 |
| opponentScoreAfter | integer | 得分後對手分數 |
| note | text | 備註 |

### substitutions（換人記錄）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | serial | 主鍵 |
| matchId | integer | 所屬比賽 |
| setNumber | integer | 第幾局 |
| pointNumber | integer | 第幾分時換人 |
| playerOutId | integer | 換下球員 |
| playerInId | integer | 換上球員 |
| createdAt | timestamp | 記錄時間 |

### team_members（隊伍成員/管理員）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | serial | 主鍵 |
| teamId | integer | 所屬隊伍 |
| email | text | 邀請的 Email |
| userId | varchar | 對應使用者（接受邀請後填入） |
| role | text | 角色（admin / member） |
| status | text | 狀態（invited / active） |
| createdAt | timestamp | 建立時間 |

---

## API 路由一覽

### 認證
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | /api/auth/login | 登入 |
| POST | /api/auth/logout | 登出 |
| GET | /api/auth/me | 取得目前登入者 |

### 隊伍
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/teams | 列出我的隊伍 |
| GET | /api/teams/:id | 取得單一隊伍 |
| POST | /api/teams | 建立隊伍 |
| PATCH | /api/teams/:id | 更新隊伍 |
| DELETE | /api/teams/:id | 刪除隊伍 |

### 球員
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/teams/:teamId/players | 列出隊伍球員 |
| POST | /api/teams/:teamId/players | 新增球員 |
| PATCH | /api/players/:id | 更新球員 |
| DELETE | /api/players/:id | 刪除球員 |
| POST | /api/teams/:teamId/players/swap-jersey | 交換兩位球員背號 |

### 賽事
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/tournaments | 列出我的賽事 |
| GET | /api/tournaments/:id | 取得單一賽事 |
| POST | /api/tournaments | 建立賽事 |
| PATCH | /api/tournaments/:id | 更新賽事 |
| DELETE | /api/tournaments/:id | 刪除賽事 |

### 比賽
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/matches | 列出所有比賽 |
| GET | /api/tournaments/:tournamentId/matches | 列出賽事下的比賽 |
| GET | /api/matches/:id | 取得單一比賽 |
| POST | /api/matches | 建立比賽 |
| PATCH | /api/matches/:id | 更新比賽 |

### 計分
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/matches/:id/sets | 取得比賽局別 |
| GET | /api/matches/:id/points | 取得逐分記錄 |
| POST | /api/matches/:id/points | 記錄得分 |
| PATCH | /api/matches/:id/points/:pointId | 修改得分記錄 |
| DELETE | /api/matches/:id/points/last | 撤銷最後一分 |

### 陣容與換人
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/matches/:id/lineups | 取得比賽陣容 |
| POST | /api/matches/:id/lineups | 設定比賽陣容 |
| GET | /api/matches/:id/substitutions | 取得換人記錄 |
| POST | /api/matches/:id/substitutions | 記錄換人 |

### CSV 匯出
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/export/match/:id | 匯出比賽逐分記錄 |
| GET | /api/export/tournament/:id | 匯出賽事所有比賽記錄 |
| GET | /api/export/player/:id | 匯出球員個人記錄 |

### 隊伍成員
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/teams/:teamId/members | 列出隊伍成員 |
| POST | /api/teams/:teamId/members | 邀請成員 |
| PATCH | /api/team-members/:id | 更新成員 |
| DELETE | /api/team-members/:id | 移除成員 |
| POST | /api/teams/:teamId/transfer-admin | 移轉管理權 |

---

## 本機部署步驟

### 前置需求
- Node.js >= 20
- PostgreSQL >= 14
- npm

### 1. 取得原始碼
```bash
git clone <repository-url>
cd volleyball-scorer
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 設定環境變數
建立 `.env` 檔案：
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/volleyball
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=yourpassword
PGDATABASE=volleyball
SESSION_SECRET=your-random-secret-string-here
PORT=5000
NODE_ENV=development
```

### 4. 建立資料庫
```bash
createdb volleyball
```

### 5. 推送 Schema 到資料庫
```bash
npm run db:push
```

### 6. 啟動開發伺服器
```bash
npm run dev
```
伺服器會在 `http://localhost:5000` 啟動。

### 7. 預設登入帳號
- 帳號：`admin`
- 密碼：`admin123`

---

## 生產環境部署

### 1. 建置
```bash
npm run build
```
產出：
- `dist/index.cjs` - 後端 (esbuild 打包)
- `dist/public/` - 前端靜態檔案 (Vite 打包)

### 2. 啟動
```bash
NODE_ENV=production node dist/index.cjs
```

### 3. 反向代理（可選）
使用 Nginx 或 Caddy 將 HTTPS 流量轉發到應用程式的 PORT。

```nginx
server {
    listen 443 ssl;
    server_name volleyball.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Docker 部署（可選）

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build
RUN npm prune --production
EXPOSE 5000
ENV NODE_ENV=production
CMD ["node", "dist/index.cjs"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/volleyball
      - PGHOST=db
      - PGPORT=5432
      - PGUSER=postgres
      - PGPASSWORD=password
      - PGDATABASE=volleyball
      - SESSION_SECRET=change-this-to-a-random-string
      - NODE_ENV=production
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=volleyball
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## Replit 部署
此專案已在 Replit 上運行，可透過 Replit 的「Publish」功能直接發布，自動處理建置、託管、TLS 和健康檢查。

---

## 尚未完成的功能
1. Gmail OAuth 登入（目前使用帳號密碼）
2. 邀請信實際寄發（目前僅記錄 Email，未串接郵件服務）
3. 管理後台（Super Admin 檢視所有使用者/隊伍/賽事）
4. 戶外高對比模式（陽光/陰天自適應色系）
5. 盃賽公開結構（多隊伍共用賽事 + 對戰表 + 排名）
6. 付費/廣告商業化模組
