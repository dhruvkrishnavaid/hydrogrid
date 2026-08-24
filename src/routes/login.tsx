import React, { useState, useEffect } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { setAuthUser, initiateGoogleAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import WaterTelemetryCanvas from "@/components/WaterTelemetryCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search.mode as "login" | "signup" | "admin") || "login",
  }),
  component: SingleLoginPage,
});

function getPasswordStrength(password: string): { labelKey: string; score: number; color: string } {
  if (!password) return { labelKey: "", score: 0, color: "bg-gray-300" };
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { labelKey: "passWeak", score: 25, color: "bg-[#e45c10]" };
  if (score === 2) return { labelKey: "passFair", score: 50, color: "bg-[#f2b635]" };
  if (score === 3 || score === 4) return { labelKey: "passStrong", score: 75, color: "bg-[#4b5d16]" };
  return { labelKey: "passExcellent", score: 100, color: "bg-[#223300]" };
}

function SingleLoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const { t } = useI18n();

  // Mode: "login" | "signup" | "admin"
  const [authMode, setAuthMode] = useState<"login" | "signup" | "admin">(
    search.mode || "login"
  );

  useEffect(() => {
    if (search.mode) {
      setAuthMode(search.mode);
    }
  }, [search.mode]);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Status Banners
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const strength = getPasswordStrength(password);

  const resetFormState = () => {
    setError(null);
    setInfoMessage(null);
    setIsLoading(false);
  };

  const switchMode = (mode: "login" | "signup" | "admin") => {
    resetFormState();
    setAuthMode(mode);
  };

  // Login Handler
  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!username.trim() || !password) {
      setError("Invalid username/email or password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();
      setIsLoading(false);

      if (response.ok && data.success) {
        setAuthUser(data.user);
        if (data.user.role === "admin") {
          navigate({ to: "/admin/dashboard" });
        } else {
          navigate({ to: "/desktop" });
        }
      } else {
        setError(data.message || "Invalid username/email or password.");
      }
    } catch {
      setIsLoading(false);
      setError("Invalid username/email or password.");
    }
  };

  // Signup Handler
  const handleUserSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 10) {
      setError("Please choose a stronger password.");
      return;
    }

    if (!agreeTerms) {
      setError(t.termsRequired);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, username, email, password }),
      });

      const data = await response.json();
      setIsLoading(false);

      if (response.ok && data.success) {
        setAuthUser(data.user);
        navigate({ to: "/desktop" });
      } else {
        setError(data.message || "Failed to create account.");
      }
    } catch {
      setIsLoading(false);
      setError("Failed to create account.");
    }
  };

  // Admin Login Handler
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!username.trim() || !password) {
      setError("Invalid admin credentials.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();
      setIsLoading(false);

      if (response.ok && data.success) {
        setAuthUser(data.user);
        navigate({ to: "/admin/dashboard" });
      } else {
        setError("Invalid admin credentials.");
      }
    } catch {
      setIsLoading(false);
      setError("Invalid admin credentials.");
    }
  };

  // Google OAuth Handler
  const handleGoogleLogin = async () => {
    resetFormState();
    setIsGoogleLoading(true);

    const res = await initiateGoogleAuth();
    setIsGoogleLoading(false);

    if (!res.success) {
      setInfoMessage(res.message || "Google Sign-In is not configured yet.");
    }
  };

  const handleForgotPassword = () => {
    resetFormState();
    setInfoMessage("Password recovery is not configured yet.");
  };

  return (
    <main className="min-h-[calc(100vh-70px)] w-full bg-[#ece2ce] dark:bg-[#0a1418] flex items-center justify-center p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rise-in">
        {/* LEFT VISUAL DISPLAY AREA */}
        <div className="lg:col-span-6 relative overflow-hidden rounded-3xl bg-[#f6f4f1]/90 dark:bg-[#0f1a1e]/90 border-2 border-[#4b5d16]/30 p-8 sm:p-10 flex flex-col justify-between min-h-[520px] shadow-2xl backdrop-blur-md">
          <WaterTelemetryCanvas />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#4b5d16]/15 border border-[#4b5d16]/30 text-[#4b5d16] dark:text-[#8de5db] text-xs font-extrabold uppercase tracking-wider">
              <span className="h-2.5 w-2.5 rounded-full bg-[#4b5d16] animate-pulse" />
              {t.brand}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#223300] dark:text-[#d7ece8] tracking-tight leading-[1.1]">
              {t.heroTitle}
            </h1>

            <p className="text-sm sm:text-base font-medium text-[#4b5d16] dark:text-[#afcdc8] max-w-md">
              {t.heroSubtitle}
            </p>
          </div>

          <div className="relative z-10 pt-6 flex flex-wrap items-center gap-4 text-xs font-bold text-[#223300] dark:text-[#d7ece8]">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#ece2ce]/80 dark:bg-[#101d22]/80 border border-[#4b5d16]/25 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[#4b5d16]" />
              <span>● {t.systemOnline}</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#ece2ce]/80 dark:bg-[#101d22]/80 border border-[#4b5d16]/25 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f2b635] animate-ping" />
              <span>● {t.telemetryActive}</span>
            </div>
          </div>
        </div>

        {/* RIGHT DYNAMIC AUTHENTICATION CARD */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <Card className="bg-[#f6f4f1] dark:bg-[#0f1a1e] border-2 border-[#4b5d16]/30 shadow-2xl rounded-3xl transition-all duration-300">
            <CardHeader className="space-y-2 pt-8 pb-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4b5d16]/15 border border-[#4b5d16]/30 shadow-inner">
                {authMode === "admin" ? (
                  <svg className="h-6 w-6 text-[#e45c10]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-[#4b5d16] dark:text-[#8de5db]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </div>

              <CardTitle className="text-3xl font-extrabold text-[#223300] dark:text-[#d7ece8] tracking-tight">
                {authMode === "login" && t.welcomeBack}
                {authMode === "signup" && t.signupTitle}
                {authMode === "admin" && "ADMIN ACCESS"}
              </CardTitle>

              <CardDescription className="text-sm font-semibold text-[#4b5d16] dark:text-[#8de5db]">
                {authMode === "login" && t.loginSubtitle}
                {authMode === "signup" && t.signupDesc}
                {authMode === "admin" && "Sign in to HydroGrid Infrastructure Management"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-1 pb-8 px-6 sm:px-8">
              {/* Error Banner */}
              {error && (
                <div className="rounded-2xl border-2 border-[#e45c10] bg-[#e45c10]/10 p-3.5 text-xs font-bold text-[#e45c10] flex items-center gap-2.5 rise-in">
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Info Notice Banner */}
              {infoMessage && (
                <div className="rounded-2xl border-2 border-[#4b5d16] bg-[#4b5d16]/10 p-3.5 text-xs font-bold text-[#4b5d16] dark:text-[#8de5db] flex items-center gap-2.5 rise-in">
                  <svg className="h-5 w-5 shrink-0 text-[#4b5d16]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{infoMessage}</span>
                </div>
              )}

              {/* MODE 1: USER LOGIN */}
              {authMode === "login" && (
                <form onSubmit={handleUserLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-[#223300] dark:text-[#d7ece8] font-bold text-xs uppercase tracking-wider">
                      {t.usernameLabel}
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder={t.usernamePlaceholder}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="border-2 border-[#4b5d16] bg-[#f6f4f1] dark:bg-[#101d22] text-[#223300] dark:text-[#d7ece8] focus-visible:border-[#e45c10] focus-visible:ring-[#e45c10]/30 font-medium h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-[#223300] dark:text-[#d7ece8] font-bold text-xs uppercase tracking-wider">
                        {t.passwordLabel}
                      </Label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs font-bold text-[#e45c10] hover:underline cursor-pointer"
                      >
                        {t.forgotPassword}
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t.passwordPlaceholder}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="border-2 border-[#4b5d16] bg-[#f6f4f1] dark:bg-[#101d22] text-[#223300] dark:text-[#d7ece8] focus-visible:border-[#e45c10] focus-visible:ring-[#e45c10]/30 font-medium h-11 pr-16"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-xs font-extrabold text-[#4b5d16] dark:text-[#8de5db] uppercase tracking-wider cursor-pointer"
                      >
                        {showPassword ? t.hidePassword : t.showPassword}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-[#4b5d16] text-[#f6f4f1] font-bold text-base hover:bg-[#4b5d16]/90 active:bg-[#223300] rounded-xl transition shadow-md cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? t.loggingIn : t.signInBtn}
                  </Button>
                </form>
              )}

              {/* MODE 2: USER SIGNUP */}
              {authMode === "signup" && (
                <form onSubmit={handleUserSignup} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="fullName" className="text-[#223300] dark:text-[#d7ece8] font-bold text-xs uppercase tracking-wider">
                      {t.fullNameLabel}
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder={t.fullNamePlaceholder}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="border-2 border-[#4b5d16] bg-[#f6f4f1] dark:bg-[#101d22] text-[#223300] dark:text-[#d7ece8] focus-visible:border-[#e45c10] focus-visible:ring-[#e45c10]/30 h-10 text-sm font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="signup-username" className="text-[#223300] dark:text-[#d7ece8] font-bold text-xs uppercase tracking-wider">
                        {t.usernameLabel}
                      </Label>
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder={t.usernamePlaceholder}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="border-2 border-[#4b5d16] bg-[#f6f4f1] dark:bg-[#101d22] text-[#223300] dark:text-[#d7ece8] focus-visible:border-[#e45c10] focus-visible:ring-[#e45c10]/30 h-10 text-sm font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-[#223300] dark:text-[#d7ece8] font-bold text-xs uppercase tracking-wider">
                        {t.emailLabel}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder={t.emailPlaceholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="border-2 border-[#4b5d16] bg-[#f6f4f1] dark:bg-[#101d22] text-[#223300] dark:text-[#d7ece8] focus-visible:border-[#e45c10] focus-visible:ring-[#e45c10]/30 h-10 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="signup-password" className="text-[#223300] dark:text-[#d7ece8] font-bold text-xs uppercase tracking-wider">
                      {t.passwordLabel}
                    </Label>
                    <div className="relative flex items-center">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t.passwordPlaceholder}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="border-2 border-[#4b5d16] bg-[#f6f4f1] dark:bg-[#101d22] text-[#223300] dark:text-[#d7ece8] focus-visible:border-[#e45c10] focus-visible:ring-[#e45c10]/30 h-10 text-sm font-medium pr-14"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 text-xs font-extrabold text-[#4b5d16] dark:text-[#8de5db] uppercase tracking-wider cursor-pointer"
                      >
                        {showPassword ? t.hidePassword : t.showPassword}
                      </button>
                    </div>

                    {password && (
                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[#4b5d16]">
                          <span>Password Strength</span>
                          <span>{(t as Record<string, string>)[strength.labelKey] || ""}</span>
                        </div>
                        <div className="w-full bg-[#ece2ce] dark:bg-[#101d22] h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: `${strength.score}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="confirmPassword" className="text-[#223300] dark:text-[#d7ece8] font-bold text-xs uppercase tracking-wider">
                      {t.confirmPasswordLabel}
                    </Label>
                    <div className="relative flex items-center">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder={t.confirmPasswordPlaceholder}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="border-2 border-[#4b5d16] bg-[#f6f4f1] dark:bg-[#101d22] text-[#223300] dark:text-[#d7ece8] focus-visible:border-[#e45c10] focus-visible:ring-[#e45c10]/30 h-10 text-sm font-medium pr-14"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 text-xs font-extrabold text-[#4b5d16] dark:text-[#8de5db] uppercase tracking-wider cursor-pointer"
                      >
                        {showConfirmPassword ? t.hidePassword : t.showPassword}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="agreeTerms"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-[#4b5d16] text-[#4b5d16]"
                    />
                    <label htmlFor="agreeTerms" className="text-xs text-[#223300] dark:text-[#d7ece8] font-medium leading-tight cursor-pointer">
                      {t.termsAgree}
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-[#4b5d16] text-[#f6f4f1] font-bold text-sm hover:bg-[#4b5d16]/90 active:bg-[#223300] rounded-xl transition shadow-md cursor-pointer mt-1 disabled:opacity-60"
                  >
                    {isLoading ? t.creatingAccount : t.createAccountBtn}
                  </Button>
                </form>
              )}

              {/* MODE 3: ADMIN LOGIN */}
              {authMode === "admin" && (
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-username" className="text-[#223300] dark:text-[#d7ece8] font-bold text-xs uppercase tracking-wider">
                      Admin Username
                    </Label>
                    <Input
                      id="admin-username"
                      type="text"
                      placeholder="Enter admin username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="border-2 border-[#e45c10] bg-[#f6f4f1] dark:bg-[#101d22] text-[#223300] dark:text-[#d7ece8] focus-visible:border-[#4b5d16] focus-visible:ring-[#4b5d16]/30 font-medium h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="admin-password" className="text-[#223300] dark:text-[#d7ece8] font-bold text-xs uppercase tracking-wider">
                      Admin Password
                    </Label>
                    <div className="relative flex items-center">
                      <Input
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter admin password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="border-2 border-[#e45c10] bg-[#f6f4f1] dark:bg-[#101d22] text-[#223300] dark:text-[#d7ece8] focus-visible:border-[#4b5d16] focus-visible:ring-[#4b5d16]/30 font-medium h-11 pr-16"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-xs font-extrabold text-[#e45c10] uppercase tracking-wider cursor-pointer"
                      >
                        {showPassword ? t.hidePassword : t.showPassword}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-[#e45c10] text-[#f6f4f1] font-bold text-base hover:bg-[#e45c10]/90 active:bg-[#e45c10]/80 rounded-xl transition shadow-md cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? "Authenticating Admin..." : "Admin Sign In"}
                  </Button>
                </form>
              )}

              {/* GOOGLE AUTHENTICATION BUTTON */}
              {authMode !== "admin" && (
                <>
                  <div className="relative my-3 text-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#4b5d16]/20" /></div>
                    <span className="relative bg-[#f6f4f1] dark:bg-[#0f1a1e] px-3 text-xs font-extrabold text-[#4b5d16]">OR</span>
                  </div>

                  <Button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                    className="w-full h-11 bg-[#f6f4f1] dark:bg-[#101d22] border-2 border-[#4b5d16]/40 text-[#223300] dark:text-[#d7ece8] font-bold text-sm hover:bg-[#ece2ce] dark:hover:bg-[#101d22]/80 rounded-xl transition flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    {isGoogleLoading ? t.googleConnecting : t.continueWithGoogle}
                  </Button>
                </>
              )}

              {/* CARD BOTTOM NAVIGATION LINKS */}
              <div className="pt-2 text-center text-xs space-y-2">
                {authMode === "login" && (
                  <>
                    <div>
                      <span className="text-[#4b5d16] font-medium">{t.noAccount} </span>
                      <button
                        type="button"
                        onClick={() => switchMode("signup")}
                        className="font-extrabold text-[#e45c10] hover:underline cursor-pointer"
                      >
                        {t.createAccount}
                      </button>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => switchMode("admin")}
                        className="font-extrabold text-[#4b5d16] dark:text-[#8de5db] hover:underline cursor-pointer"
                      >
                        {t.adminAccess}
                      </button>
                    </div>
                  </>
                )}

                {authMode === "signup" && (
                  <div>
                    <span className="text-[#4b5d16] font-medium">{t.alreadyHaveAccount} </span>
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="font-extrabold text-[#e45c10] hover:underline cursor-pointer"
                    >
                      {t.signInLink}
                    </button>
                  </div>
                )}

                {authMode === "admin" && (
                  <div>
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="font-extrabold text-[#4b5d16] dark:text-[#8de5db] hover:underline cursor-pointer"
                    >
                      ← Back to User Login
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
