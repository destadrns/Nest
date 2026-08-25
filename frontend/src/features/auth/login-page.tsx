import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLogin } from '@/hooks/use-auth';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  TrendingUp,
  Sun,
  Moon,
} from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const login = useLogin();
  const navigate = useNavigate();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login.mutateAsync({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message ?? 'Invalid email or password. Please verify credentials.');
    }
  };

  return (
    <main className="relative flex min-h-dvh w-full flex-col justify-between overflow-x-hidden bg-[#F6F8FB] dark:bg-[#0A0D12] text-[#101828] dark:text-[#F3F4F6] select-none transition-colors duration-200">
      {/* ─── LAYER 1: AMBIENT COLOR GRADIENTS ─── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(53,106,230,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(91,140,255,0.08)_0%,transparent_70%)] blur-2xl sm:h-[500px] sm:w-[500px]" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(24,184,154,0.05)_0%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(43,199,164,0.06)_0%,transparent_70%)] blur-3xl sm:h-[550px] sm:w-[550px]" />
      </div>

      {/* ─── LAYER 2: RESTRAINED BACKGROUND TRAJECTORY GRAPHIC (PURELY DECORATIVE) ─── */}
      <div
        className="pointer-events-none absolute inset-0 hidden sm:flex items-center justify-center opacity-40 dark:opacity-25 overflow-hidden"
        aria-hidden="true"
      >
        <svg
          className="h-full w-full max-w-[1600px] text-[#D9E1EC]/50 dark:text-[#2A313A]/50"
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="login-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path
                d="M 48 0 L 0 0 0 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                strokeDasharray="2 4"
              />
            </pattern>
            <linearGradient
              id="login-curve-grad"
              x1="120"
              y1="750"
              x2="1480"
              y2="180"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#356AE6" stopOpacity="0.05" />
              <stop offset="40%" stopColor="#356AE6" stopOpacity="0.25" />
              <stop offset="80%" stopColor="#18B89A" stopOpacity="0.30" />
            </linearGradient>
          </defs>

          <rect width="1600" height="900" fill="url(#login-grid)" opacity="0.6" />
          <path
            d="M 120 740 C 400 720, 600 580, 850 440 C 1100 300, 1300 200, 1480 180"
            stroke="url(#login-curve-grad)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="850" cy="440" r="4" fill="#18B89A" fillOpacity="0.4" />
          <circle cx="1200" cy="245" r="3.5" fill="#356AE6" fillOpacity="0.3" />
        </svg>
      </div>

      {/* ─── BRAND HEADER ─── */}
      <header className="relative z-10 flex w-full items-center justify-between px-6 py-5 sm:px-10 sm:py-6 lg:px-16">
        <div className="flex flex-col">
          <span className="text-lg sm:text-xl font-bold tracking-tight text-[#101828] dark:text-[#F3F4F6] leading-none">
            NEST
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-[#475467] dark:text-[#B7C0CC] tracking-tight mt-0.5">
            Network for Everyday Spending & Tracking
          </span>
        </div>

        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn-tactile flex items-center justify-center h-8 w-8 rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-1.5 text-[#475467] dark:text-[#B7C0CC] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6] transition shadow-2xs"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Appearance Theme Toggle"
        >
          {theme === 'dark' ? (
            <Moon className="h-4 w-4 text-[#F3F4F6]" />
          ) : (
            <Sun className="h-4 w-4 text-[#101828]" />
          )}
        </button>
      </header>

      {/* ─── MAIN CONTENT: BALANCED TWO-COLUMN DESKTOP FLOW ─── */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-6 sm:px-8 lg:px-12">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-14 xl:gap-16">
          {/* Left Visual & Product Value Area (Desktop) */}
          <div className="hidden lg:flex flex-col justify-center space-y-6 min-w-0 pr-4">
            <div className="space-y-3 max-w-lg">
              <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-[#101828] dark:text-[#F3F4F6] leading-tight">
                Your household finances, organized.
              </h1>
              <p className="text-sm text-[#475467] dark:text-[#B7C0CC] leading-relaxed">
                Track spending, manage accounts, plan budgets, and work toward shared financial
                goals in one private workspace.
              </p>
            </div>

            {/* Restrained Value Visual */}
            <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white/90 dark:bg-[#11151B]/90 p-4 shadow-2xs backdrop-blur-xs max-w-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-[#475467] dark:text-[#B7C0CC]">
                <span className="font-semibold">Household Balance Cadence</span>
                <span className="flex items-center gap-1 font-bold text-[#0E8A73] dark:text-[#2BC7A4]">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>On Track</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F0F4F8] dark:bg-[#181D24]">
                <div className="h-full w-3/4 rounded-full bg-[#18B89A] dark:bg-[#2BC7A4] transition-all" />
              </div>
              <div className="flex justify-between text-[10px] text-[#98A2B3] dark:text-[#858F9D]">
                <span>Monthly Budget</span>
                <span>75% allocated</span>
              </div>
            </div>
          </div>

          {/* Right Authentication Card */}
          <div className="flex w-full justify-center lg:justify-end min-w-0">
            <div className="w-full max-w-[440px] rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-6 sm:p-8 shadow-sm">
              {/* Title & Supporting Text */}
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-[#101828] dark:text-[#F3F4F6]">
                  Welcome back
                </h2>
                <p className="text-xs text-[#475467] dark:text-[#B7C0CC]">
                  Sign in to your household financial workspace.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-[#E05A67]/30 dark:border-[#F06B78]/30 bg-[rgba(224,90,103,0.08)] dark:bg-[rgba(240,107,120,0.12)] p-3 text-xs text-[#C53B4B] dark:text-[#F06B78]">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#E05A67] dark:text-[#F06B78] mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1.5"
                  >
                    Email address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="h-10 text-xs rounded-lg"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6]"
                    >
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 text-xs rounded-lg pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 rounded p-0.5 text-[#98A2B3] dark:text-[#858F9D] hover:text-[#101828] dark:hover:text-[#F3F4F6] focus:outline-none transition"
                      tabIndex={-1}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4 text-current" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Primary Action Button */}
                <Button
                  type="submit"
                  className="w-full mt-2 h-10 font-bold text-xs shadow-xs active:translate-y-px transition"
                  isLoading={login.isPending}
                >
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </form>

              {/* Secondary Action Link */}
              <div className="mt-5 border-t border-[#D9E1EC]/70 dark:border-[#2A313A]/70 pt-4 text-center text-xs text-[#475467] dark:text-[#B7C0CC]">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-[#356AE6] dark:text-[#5B8CFF] hover:underline"
                >
                  Create account
                </Link>
              </div>

              {/* Single Human-Readable Trust Statement */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#475467] dark:text-[#B7C0CC]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#18B89A] dark:text-[#2BC7A4]" />
                <span>Private, secure household finance.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MINIMAL FOOTER ─── */}
      <footer className="relative z-10 flex w-full items-center justify-between px-6 py-4 sm:px-10 lg:px-16 text-[11px] text-[#98A2B3] dark:text-[#858F9D] border-t border-[#D9E1EC]/70 dark:border-[#2A313A]/70">
        <div>
          <span>NEST · Network for Everyday Spending & Tracking</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Private & Secure</span>
        </div>
      </footer>
    </main>
  );
}
