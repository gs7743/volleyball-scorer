import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Activity,
  Languages,
  Users,
  Trophy,
  BarChart3,
  ClipboardList,
  ArrowRightLeft,
  FileSpreadsheet,
  Smartphone,
  Globe,
  ChevronRight,
} from "lucide-react";

export default function LandingPage() {
  const { t, lang, toggleLang } = useI18n();

  const features = [
    { icon: Activity, titleZh: "即時逐分計分", titleEn: "Live Point-by-Point Scoring", descZh: "自動局數判定、Deuce 機制、撤銷功能，讓你專注比賽", descEn: "Auto set detection, deuce mechanism, undo — stay focused on the game" },
    { icon: Users, titleZh: "球員與陣容管理", titleEn: "Player & Lineup Management", descZh: "管理球員名冊、設定先發陣容（6 先發 + 1 自由球員）", descEn: "Manage rosters, set lineups (6 starters + 1 libero)" },
    { icon: BarChart3, titleZh: "球員歸因分析", titleEn: "Player Attribution", descZh: "每一分記錄得分選手與失分選手，累積個人數據", descEn: "Track scorer & loser per point, build player statistics" },
    { icon: Trophy, titleZh: "賽事管理", titleEn: "Tournament Management", descZh: "設定賽制（單局/三戰兩勝/五戰三勝/七戰四勝），統一管理比賽", descEn: "Configure formats (single/best-of-3/5/7), manage all matches" },
    { icon: ArrowRightLeft, titleZh: "換人記錄", titleEn: "Substitution Tracking", descZh: "記錄每次換人的局數與時間點，完整追蹤陣容變化", descEn: "Log substitutions at specific set/point, track lineup changes" },
    { icon: FileSpreadsheet, titleZh: "CSV 資料匯出", titleEn: "CSV Export", descZh: "匯出比賽、賽事、球員記錄，方便後續分析", descEn: "Export match, tournament, player records for analysis" },
    { icon: ClipboardList, titleZh: "隊伍協作", titleEn: "Team Collaboration", descZh: "邀請成員共同管理，支援管理權移轉", descEn: "Invite members, transfer admin rights" },
    { icon: Smartphone, titleZh: "手機橫向最佳化", titleEn: "Mobile Landscape Optimized", descZh: "計分介面專為手機橫向使用設計，單手操作", descEn: "Scoring UI designed for landscape mobile, one-hand operation" },
    { icon: Globe, titleZh: "中英文雙語", titleEn: "Bilingual Interface", descZh: "完整的中文與英文介面，隨時切換", descEn: "Full Chinese & English UI, switch anytime" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground">
              <Activity className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg" data-testid="text-landing-title">
              {lang === "zh" ? "排球計分器" : "Volleyball Scorer"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleLang} data-testid="button-landing-lang">
              <Languages className="w-4 h-4 mr-1" />
              {lang === "zh" ? "EN" : "中"}
            </Button>
            <Link href="/app/login">
              <Button variant="outline" size="sm" data-testid="button-header-login">
                {lang === "zh" ? "登入" : "Sign In"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-primary text-primary-foreground mb-2">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight" data-testid="text-hero-title">
            {lang === "zh" ? "專業排球計分系統" : "Professional Volleyball Scoring"}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {lang === "zh"
              ? "從逐分記錄到球員歸因分析，一個工具搞定所有排球比賽數據管理。支援多局制、陣容管理、換人追蹤與 CSV 匯出。"
              : "From point-by-point scoring to player attribution analysis, one tool handles all your volleyball match data. Supports multi-set formats, lineup management, substitution tracking, and CSV export."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/app/login">
              <Button size="lg" data-testid="button-hero-start">
                {lang === "zh" ? "開始使用" : "Get Started"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            {lang === "zh" ? "免費使用 · 無需信用卡" : "Free to use · No credit card required"}
          </p>
        </div>
      </section>

      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3" data-testid="text-features-title">
            {lang === "zh" ? "核心功能" : "Core Features"}
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            {lang === "zh"
              ? "為排球教練、隊長和記錄員打造的全方位工具"
              : "All-in-one tool built for volleyball coaches, captains, and scorekeepers"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <Card key={i} className="hover-elevate" data-testid={`card-feature-${i}`}>
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
                      <f.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold">
                      {lang === "zh" ? f.titleZh : f.titleEn}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {lang === "zh" ? f.descZh : f.descEn}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold">
            {lang === "zh" ? "立即開始記錄你的比賽" : "Start Recording Your Matches Now"}
          </h2>
          <p className="text-muted-foreground">
            {lang === "zh"
              ? "註冊帳號即可使用所有功能，建立隊伍、管理賽事、逐分計分。"
              : "Sign up to access all features — create teams, manage tournaments, score point by point."}
          </p>
          <Link href="/app/login">
            <Button size="lg" data-testid="button-cta-login">
              {lang === "zh" ? "前往登入" : "Go to Sign In"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Volleyball Scorer</span>
          <span>{lang === "zh" ? "排球計分系統" : "Match Scoring System"}</span>
        </div>
      </footer>
    </div>
  );
}
