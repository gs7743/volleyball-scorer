# Changelog 版本更新記錄

All notable changes to this project will be documented in this file.
所有重要的專案變更都會記錄在此檔案中。

---

## [1.1.0] - 2026-02-09

### Fixed 修復
- **隊伍刪除失敗** / **Team deletion failure**: 刪除隊伍時因 `team_members` 外鍵約束導致 500 錯誤。現在刪除隊伍時會自動清理所有關聯資料（隊伍成員、球員、陣容、換人記錄，並解除比賽中的球員歸因引用）。
  - Fixed 500 error when deleting a team that has team members, players, or related match data. Cascade cleanup now handles: team_members, players, match_lineups, substitutions, and nullifies player references in points.

### Added 新增
- **README.md**: 中英文雙語專案說明文件，含功能介紹、技術架構、快速部署步驟。
  - Bilingual (Chinese/English) project documentation with features, tech stack, and quick start guide.
- **DEPLOYMENT.md**: 完整部署指南，含資料庫 schema 定義、API 路由一覽、Docker 設定範例、Nginx 反向代理範例。
  - Comprehensive deployment guide with database schema, API routes, Docker and Nginx configurations.
- **CHANGELOG.md**: 版本更新記錄文件。
  - Version changelog document.
- **GitHub 同步**: 原始碼已同步至 GitHub 儲存庫。
  - Source code synced to GitHub repository.
- **Schema 註解**: 資料庫結構定義檔（shared/schema.ts）加入中文註解，說明每張表與欄位用途。
  - Added Chinese comments to database schema file explaining all tables and fields.

---

## [1.0.0] - 2026-02-06

### Features 功能
- **使用者認證** / **User Authentication**: 帳號密碼登入，session 存儲於 PostgreSQL。
- **隊伍管理** / **Team Management**: 建立與管理多支隊伍。
- **球員名冊** / **Player Roster**: 姓名、背號、年齡、年級管理，支援背號交換。
- **賽事管理** / **Tournament Management**: 設定賽制（單局/三戰兩勝/五戰三勝/七戰四勝）、正規局與決勝局分數。
- **比賽管理** / **Match Management**: 建立比賽，可關聯隊伍或手動輸入。
- **即時計分** / **Live Scoring**: 逐分記錄，自動局數判定，Deuce 機制，撤銷功能。
- **球員歸因** / **Player Attribution**: 每得一分可記錄得分球員和失分球員。
- **陣容管理** / **Lineup Management**: 設定 6 位先發 + 1 位自由球員。
- **換人記錄** / **Substitution Logging**: 記錄換人時間點（第幾局第幾分）。
- **CSV 匯出** / **CSV Export**: 單場比賽、賽事匯總、球員個人記錄匯出。
- **隊伍協作** / **Team Collaboration**: Email 邀請成員，角色管理（管理員/成員），管理權移轉。
- **多語系** / **Bilingual Interface**: 中文（預設）與英文介面切換。
- **手機優化** / **Mobile Optimized**: 計分頁面針對手機橫向使用最佳化。
