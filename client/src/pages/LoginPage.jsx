import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { GlowCard } from "@/components/ui/spotlight-card";
import { MinimalFooter } from "@/components/ui/minimal-footer";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, getHomePathByRole, isAuthenticated, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const authError = location.state?.authError;
    if (typeof authError === "string" && authError) {
      setError(authError);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(getHomePathByRole(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate, getHomePathByRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      const session = await login({ username, password });

      if (!session.user?.role) {
        setError("Login succeeded but role is missing.");
        return;
      }

      navigate(getHomePathByRole(session.user.role), { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div
        className="pointer-events-none fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/ndmu_bg.jpg')" }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-background/90 via-background/82 to-background/92 dark:from-background/96 dark:via-background/90 dark:to-background/96"
        aria-hidden
      />

      <div className="absolute right-4 top-4 z-20 md:right-8 md:top-6">
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex flex-1 flex-col px-4 py-10 md:px-8">
        <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div className="order-2 flex flex-col gap-8 lg:order-1">
            <div>
              <p
                className={cn(
                  "mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm",
                  "border-border/70 bg-card/70 text-muted-foreground",
                  "dark:border-border/80 dark:bg-card/50"
                )}
              >
                <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
                NDMU - SUPREME STUDENT GOVERNMENT
              </p>
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                SSG Payment Portal
              </h1>
              <p className="mt-3 max-w-xl text-pretty text-sm text-muted-foreground md:text-base">
                Sign in to manage school fees, payments, and records securely and
                in one place.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <GlowCard
                glowColor="green"
                customSize
                className="min-h-[148px] w-full max-w-none !aspect-auto p-4"
              >
                <div className="flex h-full flex-col justify-between gap-4 text-left">
                  <ShieldCheck className="size-8 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      VERIFIED PAYMENTS
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Receipts, statuses, and history tracked for every fee.
                    </p>
                  </div>
                </div>
              </GlowCard>
              <GlowCard
                glowColor="blue"
                customSize
                className="min-h-[148px] w-full max-w-none !aspect-auto p-4"
              >
                <div className="flex h-full flex-col justify-between gap-4 text-left">
                  <Lock className="size-8 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      ROLE-BASED ACCESS
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Students, officers, and admins each see what they need.
                    </p>
                  </div>
                </div>
              </GlowCard>
            </div>

            <GlowCard
              glowColor="purple"
              customSize
              className="!aspect-auto min-h-0 w-full max-w-none p-4 !rounded-lg"
            >
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">PAYMENT GUIDE</h3>
                <ol className="mt-1 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>Log in to your account credentials</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>Open Assigned Fees</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>Select a fee and proceed to payment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>Pay through available payment option</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>Wait for officer review if required</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>View payment history and receipt</span>
                  </li>
                </ol>
              </div>
            </GlowCard>
          </div>

          <div className="order-1 flex flex-col gap-5 lg:sticky lg:top-24 lg:order-2">
            <div
              className={cn(
                "flex flex-shrink-0 flex-wrap items-center justify-center gap-6 sm:gap-8",
                "rounded-lg border border-border/50 bg-card/50 px-4 py-4 backdrop-blur-sm",
                "dark:border-border/40 dark:bg-card/40"
              )}
            >
              <img
                src="/images/ndmulogo.png"
                alt="Notre Dame of Marbel University"
                className="h-14 w-auto max-w-[min(100%,160px)] object-contain sm:h-16"
                width={160}
                height={64}
                loading="eager"
              />
              <img
                src="/images/ssglogo.jpg"
                alt="Supreme Student Government NDMU"
                className="h-14 w-14 shrink-0 rounded-full object-cover object-center ring-2 ring-border/60 sm:h-16 sm:w-16"
                width={64}
                height={64}
                loading="eager"
              />
            </div>
            <GlowCard
              glowColor="green"
              customSize
              className={cn(
                "!aspect-auto min-h-0 w-full max-w-none p-0 !rounded-lg",
                "text-card-foreground shadow-xl"
              )}
            >
              <div className="p-6 md:p-8">
                <h1 className="text-lg font-semibold tracking-tight">Welcome back!</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your assigned credentials to continue.
                </p>

                <form className="form-grid mt-6" onSubmit={handleSubmit}>
                  <label htmlFor="login-username">Username</label>
                  <input
                    id="login-username"
                    name="username"
                    type="text"
                    placeholder="Enter username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />

                  <label htmlFor="login-password">Password</label>
                  <div className="login-password-wrap relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="login-password-input pr-10"
                  />
                    <button
                      type="button"
                      className="login-password-toggle absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      tabIndex={0}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4 shrink-0" aria-hidden />
                      ) : (
                        <Eye className="size-4 shrink-0" aria-hidden />
                      )}
                    </button>
                  </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Contact SSG Moderator if you forgot your password. (Personally)
                    </p>

                  {error && (
                    <p className="error error-box" role="alert">
                      {error}
                    </p>
                  )}

                  <button className="btn mt-1 w-56 mx-auto" type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                  </button>
                </form>
              </div>
            </GlowCard>
          </div>
        </div>
      </div>

      <MinimalFooter />
    </div>
  );
};

export default LoginPage;
