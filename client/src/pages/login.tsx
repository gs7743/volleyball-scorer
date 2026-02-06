import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { Activity, Lock, User, Languages } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, lang, toggleLang } = useI18n();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: t.pleaseEnterCredentials, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      const data = await res.json();
      if (data.ok) {
        setLocation("/dashboard");
      }
    } catch (err: any) {
      toast({ title: t.loginFailed, description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-3 right-3">
        <Button variant="ghost" size="sm" onClick={toggleLang} data-testid="button-lang-toggle">
          <Languages className="w-4 h-4 mr-1" />
          {lang === "zh" ? "EN" : "中"}
        </Button>
      </div>

      <div className="w-full max-w-sm space-y-4 landscape:max-w-lg">
        <div className="text-center space-y-1 landscape:space-y-0">
          <div className="inline-flex items-center justify-center w-12 h-12 landscape:w-10 landscape:h-10 rounded-md bg-primary text-primary-foreground mb-1">
            <Activity className="w-6 h-6 landscape:w-5 landscape:h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight" data-testid="text-app-title">
            {t.appTitle}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t.signInDesc}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-base font-semibold text-center">{t.signIn}</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="landscape:grid landscape:grid-cols-2 landscape:gap-3 space-y-3 landscape:space-y-0">
                <div className="space-y-1.5">
                  <Label htmlFor="username">{t.username}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      data-testid="input-username"
                      placeholder={t.enterUsername}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      data-testid="input-password"
                      type="password"
                      placeholder={t.enterPassword}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? t.signingIn : t.signIn}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {t.defaultCredentials}
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
