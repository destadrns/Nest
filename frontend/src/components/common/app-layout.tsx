import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useLogout } from '@/hooks/use-auth';
import { useFamilies, useCreateFamily } from '@/hooks/use-family';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategories, useCreateTransaction } from '@/hooks/use-transactions';
import { useAppStore, type ThemePreference, type CurrencyPreference } from '@/stores/app-store';
import { formatCurrency } from '@/lib/utils';
import { OfflineBanner } from './offline-banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard,
  WalletCards,
  ArrowLeftRight,
  PieChart,
  Target,
  BarChart3,
  ShieldCheck,
  Building2,
  Plus,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Check,
  Sun,
  Moon,
  Bell,
  Search,
  CheckCheck,
} from 'lucide-react';
import type { TransactionType } from '@/types';

export function AppLayout() {
  const user = useAppStore((s) => s.user);
  const currentFamily = useAppStore((s) => s.currentFamily);
  const setCurrentFamily = useAppStore((s) => s.setCurrentFamily);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const globalCurrency = useAppStore((s) => s.currency);
  const setGlobalCurrency = useAppStore((s) => s.setCurrency);

  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: families } = useFamilies();
  const createFamily = useCreateFamily();

  // Notification State
  const { data: notificationsRes } = useNotifications(currentFamily?.id);
  const markRead = useMarkNotificationRead(currentFamily?.id);
  const markAllRead = useMarkAllNotificationsRead(currentFamily?.id);
  const notifications = notificationsRes?.data ?? [];
  const unreadCount = notificationsRes?.meta?.unreadCount ?? notifications.filter((n) => !n.isRead).length;

  const [showNotifications, setShowNotifications] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showGlobalQuickTx, setShowGlobalQuickTx] = useState(false);
  const [showNewFamilyModal, setShowNewFamilyModal] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [familyDropdownOpen, setFamilyDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

  // Global Keyboard Shortcuts (Ctrl+K / Cmd+K and N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
      if (
        e.key.toLowerCase() === 'n' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) &&
        !showCommandPalette &&
        !showGlobalQuickTx
      ) {
        e.preventDefault();
        setShowGlobalQuickTx(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowGlobalQuickTx(false);
        setShowNotifications(false);
        setFamilyDropdownOpen(false);
        setProfileDropdownOpen(false);
        setCurrencyDropdownOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette, showGlobalQuickTx]);

  // Click Outside Handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setFamilyDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setCurrencyDropdownOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login');
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) return;
    const res = await createFamily.mutateAsync({ name: familyName.trim() });
    setCurrentFamily(res.data);
    setFamilyName('');
    setShowNewFamilyModal(false);
    setFamilyDropdownOpen(false);
    navigate('/dashboard');
  };

  const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
        { to: '/accounts', label: 'Accounts', icon: WalletCards },
      ],
    },
    {
      title: 'PLANNING',
      items: [
        { to: '/budgets', label: 'Budgets', icon: PieChart },
        { to: '/goals', label: 'Goals', icon: Target },
      ],
    },
    {
      title: 'INSIGHTS & SECURITY',
      items: [
        { to: '/reports', label: 'Reports', icon: BarChart3 },
        { to: '/security', label: 'Security Center', icon: ShieldCheck },
      ],
    },
  ];

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName ? user.lastName[0] : ''}`.toUpperCase()
    : 'U';

  const themeOptions: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ];

  const ActiveThemeIcon = theme === 'dark' ? Moon : Sun;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#F6F8FB] dark:bg-[#0A0D12] text-[#101828] dark:text-[#F3F4F6] antialiased select-none">
      <OfflineBanner />

      {/* Desktop & Mobile Fixed Viewport Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-60 flex-col border-r border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] lg:static lg:h-dvh lg:shrink-0 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-13 shrink-0 items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 px-4">
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-[#101828] dark:text-[#F3F4F6] leading-none">
              NEST
            </span>
            <span className="text-[10px] font-semibold text-[#475467] dark:text-[#B7C0CC] tracking-tight mt-0.5 truncate max-w-42.5">
              Household Finance Workspace
            </span>
          </div>
          <button
            onClick={toggleSidebar}
            className="btn-tactile rounded-md p-1.5 text-[#98A2B3] dark:text-[#858F9D] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6] lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Household Context Switcher Control */}
        <div className="relative shrink-0 border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 p-2.5" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setFamilyDropdownOpen(!familyDropdownOpen)}
            className="btn-tactile flex w-full items-center justify-between rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#181D24] px-2.5 py-1.5 text-left text-xs font-medium text-[#475467] dark:text-[#B7C0CC] transition hover:bg-[#F0F4F8] dark:hover:bg-[#20262E] hover:border-[#CBD5E1] dark:hover:border-[#3B4450] focus:outline-none focus:ring-2 focus:ring-[#101828]/10 dark:focus:ring-[#5B8CFF]/20"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#D9E1EC]/70 dark:bg-[#20262E] text-[#101828] dark:text-[#F3F4F6]">
                <Building2 className="h-3 w-3" />
              </div>
              <div className="truncate">
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#98A2B3] dark:text-[#858F9D]">
                  Household
                </div>
                <div className="font-bold text-[#101828] dark:text-[#F3F4F6] truncate text-[11px]">
                  {currentFamily?.name || 'Select Household'}
                </div>
              </div>
            </div>
            <ChevronDown
              className={`h-3 w-3 text-[#98A2B3] dark:text-[#858F9D] shrink-0 ml-1 transition-transform duration-150 ${
                familyDropdownOpen ? 'rotate-180 text-[#101828] dark:text-[#F3F4F6]' : ''
              }`}
            />
          </button>

          {/* Household Selector Dropdown */}
          {familyDropdownOpen && (
            <div className="animate-dropdown-enter absolute left-2.5 right-2.5 top-full z-50 mt-1 rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-1 shadow-lg">
              <div className="max-h-44 overflow-y-auto space-y-0.5 py-0.5">
                {families && families.length > 0 ? (
                  families.map((fam) => (
                    <button
                      key={fam.id}
                      type="button"
                      onClick={() => {
                        setCurrentFamily(fam);
                        setFamilyDropdownOpen(false);
                      }}
                      className={`btn-tactile flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                        currentFamily?.id === fam.id
                          ? 'bg-[#101828] dark:bg-[#F3F4F6] font-bold text-white dark:text-[#0A0D12] shadow-2xs'
                          : 'text-[#475467] dark:text-[#B7C0CC] hover:bg-[#F6F8FB] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
                      }`}
                    >
                      <span className="truncate">{fam.name}</span>
                      {currentFamily?.id === fam.id && (
                        <Check className="h-3 w-3 text-[#18B89A] dark:text-[#2BC7A4] shrink-0" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-xs text-[#98A2B3] dark:text-[#858F9D]">No households found</div>
                )}
              </div>
              <div className="mt-1 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewFamilyModal(true);
                    setFamilyDropdownOpen(false);
                  }}
                  className="btn-tactile flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#356AE6] dark:text-[#5B8CFF] hover:bg-[rgba(53,106,230,0.06)] dark:hover:bg-[rgba(91,140,255,0.1)] transition"
                >
                  <Plus className="h-3 w-3" />
                  <span>Create Household</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Global Quick Action Trigger in Sidebar */}
        <div className="px-2.5 pt-2">
          <button
            onClick={() => setShowGlobalQuickTx(true)}
            className="btn-tactile flex w-full items-center justify-between rounded-lg bg-[#101828] dark:bg-[#F3F4F6] px-2.5 py-1.5 text-xs font-bold text-white dark:text-[#0A0D12] shadow-xs hover:bg-[#1E293B] dark:hover:bg-[#E5E7EB] transition"
          >
            <div className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Record Action</span>
            </div>
            <kbd className="rounded bg-white/20 dark:bg-black/20 px-1.5 py-0.2 text-[9px] font-mono text-white/90 dark:text-[#0A0D12]/90">
              N
            </kbd>
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4" aria-label="Main Navigation">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#858F9D]">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => sidebarOpen && toggleSidebar()}
                    className={`btn-tactile flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#101828] dark:bg-[#F3F4F6] text-white dark:text-[#0A0D12] shadow-2xs font-bold'
                        : 'text-[#475467] dark:text-[#B7C0CC] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isActive
                          ? 'text-white dark:text-[#0A0D12]'
                          : 'text-[#98A2B3] dark:text-[#858F9D]'
                      }`}
                      strokeWidth={isActive ? 2.4 : 1.8}
                    />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Anchored Bottom User Account & Control Panel */}
        <div className="shrink-0 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60 bg-[#F6F8FB] dark:bg-[#0A0D12] p-2.5 relative" ref={profileRef}>
          <div className="flex items-center justify-between rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-2 shadow-2xs">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="btn-tactile flex items-center gap-2 min-w-0 text-left hover:opacity-90 transition flex-1 rounded-md p-0.5"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#101828] dark:bg-[#F3F4F6] text-[10px] font-bold text-white dark:text-[#0A0D12]">
                {initials}
              </div>
              <div className="flex flex-col truncate">
                <span className="truncate text-xs font-bold text-[#101828] dark:text-[#F3F4F6]">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="truncate text-[9px] text-[#98A2B3] dark:text-[#858F9D]">{user?.email}</span>
              </div>
            </button>
            <button
              onClick={handleLogout}
              disabled={logout.isPending}
              className="btn-tactile rounded-md p-1 text-[#98A2B3] dark:text-[#858F9D] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#E05A67] dark:hover:text-[#F06B78] transition"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Profile Menu Popover */}
          {profileDropdownOpen && (
            <div className="animate-dropdown-enter absolute bottom-full left-2.5 right-2.5 z-50 mb-1 rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-1.5 shadow-xl">
              <div className="border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 px-2 py-1.5">
                <div className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6]">{user?.firstName} {user?.lastName}</div>
                <div className="text-[10px] text-[#98A2B3] dark:text-[#858F9D] font-mono">{user?.email}</div>
              </div>
              <div className="py-1 text-xs space-y-0.5">
                <button
                  onClick={() => {
                    navigate('/security');
                    setProfileDropdownOpen(false);
                  }}
                  className="btn-tactile flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[#475467] dark:text-[#B7C0CC] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6] transition"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#356AE6] dark:text-[#5B8CFF]" />
                  <span>Security & Access</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/accounts');
                    setProfileDropdownOpen(false);
                  }}
                  className="btn-tactile flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[#475467] dark:text-[#B7C0CC] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6] transition"
                >
                  <WalletCards className="h-3.5 w-3.5 text-[#18B89A] dark:text-[#2BC7A4]" />
                  <span>Manage Accounts</span>
                </button>
              </div>

              {/* Theme Selection in Profile Drawer */}
              <div className="border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60 px-2 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#858F9D] mb-1.5">
                  Appearance
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {themeOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = theme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setTheme(opt.value)}
                        className={`btn-tactile flex items-center justify-center gap-1.5 rounded-lg p-1.5 text-[11px] font-semibold transition ${
                          isSelected
                            ? 'bg-[#101828] dark:bg-[#F3F4F6] text-white dark:text-[#0A0D12] font-bold shadow-2xs'
                            : 'text-[#475467] dark:text-[#B7C0CC] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24]'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pt-1">
                <button
                  onClick={handleLogout}
                  className="btn-tactile flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold text-[#E05A67] dark:text-[#F06B78] hover:bg-[rgba(224,90,103,0.06)] dark:hover:bg-[rgba(240,107,120,0.1)] transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#101828]/40 backdrop-blur-xs transition-opacity duration-200 lg:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Independent Scrollable Content Area */}
      <div className="flex flex-1 flex-col h-dvh overflow-hidden min-w-0">
        {/* Clean Authenticated Header */}
        <header className="sticky top-0 z-20 flex h-13 shrink-0 items-center justify-between border-b border-[#D9E1EC] dark:border-[#2A313A] bg-white/95 dark:bg-[#11151B]/95 backdrop-blur-xs px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="btn-tactile rounded-lg p-1.5 text-[#475467] dark:text-[#B7C0CC] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6] lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Quick Command Launcher Button */}
            <button
              onClick={() => setShowCommandPalette(true)}
              className="btn-tactile flex items-center gap-2 rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#181D24] px-2.5 py-1 text-xs text-[#475467] dark:text-[#B7C0CC] hover:border-[#356AE6]/50 dark:hover:border-[#5B8CFF]/50 hover:bg-white dark:hover:bg-[#11151B] transition shadow-2xs"
            >
              <Search className="h-3.5 w-3.5 text-[#98A2B3] dark:text-[#858F9D]" />
              <span className="hidden sm:inline text-[#98A2B3] dark:text-[#858F9D]">Search commands or views...</span>
              <span className="sm:hidden text-[#98A2B3] dark:text-[#858F9D]">Search...</span>
              <kbd className="hidden sm:inline rounded border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#475467] dark:text-[#B7C0CC]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Header Navigation & Control Group */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Notification Drawer Trigger */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="btn-tactile relative rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#181D24] p-1.5 text-[#475467] dark:text-[#B7C0CC] hover:bg-white dark:hover:bg-[#11151B] hover:text-[#101828] dark:hover:text-[#F3F4F6] transition shadow-2xs"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E05A67] dark:bg-[#F06B78] text-[9px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer Popover */}
              {showNotifications && (
                <div className="animate-dropdown-enter absolute right-0 top-full z-50 mt-2 w-[calc(100vw-32px)] max-w-sm sm:w-96 rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6]">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-[rgba(224,90,103,0.1)] dark:bg-[rgba(240,107,120,0.2)] px-2 py-0.2 text-[9px] font-bold text-[#C53B4B] dark:text-[#F06B78]">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllRead.mutate()}
                        className="flex items-center gap-1 text-[10px] font-bold text-[#356AE6] dark:text-[#5B8CFF] hover:underline"
                      >
                        <CheckCheck className="h-3 w-3" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1.5 py-2">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-[#98A2B3] dark:text-[#858F9D]">
                        No notifications in this household.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.isRead && markRead.mutate(n.id)}
                          className={`interactive-row rounded-xl border p-2.5 text-xs transition cursor-pointer ${
                            n.isRead
                              ? 'border-[#D9E1EC]/40 dark:border-[#2A313A]/40 bg-[#F6F8FB]/50 dark:bg-[#181D24]/40 text-[#475467] dark:text-[#B7C0CC]'
                              : 'border-[#356AE6]/30 dark:border-[#5B8CFF]/30 bg-[rgba(53,106,230,0.03)] dark:bg-[rgba(91,140,255,0.08)] text-[#101828] dark:text-[#F3F4F6] font-medium'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-xs">{n.title}</span>
                            <span className="text-[9px] text-[#98A2B3] dark:text-[#858F9D] font-mono shrink-0">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#475467] dark:text-[#B7C0CC] mt-0.5 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Compact Currency Selector */}
            <div className="relative" ref={currencyRef}>
              <button
                type="button"
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="btn-tactile flex items-center gap-1.5 h-8 rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#181D24] px-2.5 text-xs font-bold text-[#101828] dark:text-[#F3F4F6] hover:bg-white dark:hover:bg-[#11151B] transition shadow-2xs"
                title="Select Currency"
                aria-label="Select Currency"
              >
                <span>{globalCurrency}</span>
                <ChevronDown
                  className={`h-3 w-3 text-[#98A2B3] dark:text-[#858F9D] transition-transform duration-150 ${
                    currencyDropdownOpen ? 'rotate-180 text-[#101828] dark:text-[#F3F4F6]' : ''
                  }`}
                />
              </button>

              {currencyDropdownOpen && (
                <div className="animate-dropdown-enter absolute right-0 top-full z-50 mt-1 w-28 rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-1 shadow-lg">
                  {(['IDR', 'USD'] as CurrencyPreference[]).map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => {
                        setGlobalCurrency(cur);
                        setCurrencyDropdownOpen(false);
                      }}
                      className={`btn-tactile flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition ${
                        globalCurrency === cur
                          ? 'bg-[#101828] dark:bg-[#F3F4F6] font-bold text-white dark:text-[#0A0D12] shadow-2xs'
                          : 'text-[#475467] dark:text-[#B7C0CC] hover:bg-[#F6F8FB] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
                      }`}
                    >
                      <span>{cur}</span>
                      {globalCurrency === cur && (
                        <Check className="h-3 w-3 text-[#18B89A] dark:text-[#2BC7A4] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Direct Light/Dark Toggle */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="btn-tactile flex items-center justify-center h-8 w-8 rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#181D24] p-1.5 text-[#475467] dark:text-[#B7C0CC] hover:bg-white dark:hover:bg-[#11151B] hover:text-[#101828] dark:hover:text-[#F3F4F6] transition shadow-2xs"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Appearance Theme Toggle"
            >
              <ActiveThemeIcon className="h-4 w-4" />
            </button>

            {/* Compact Header Profile Avatar Button */}
            <button
              onClick={() => {
                navigate('/security');
              }}
              className="btn-tactile flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#101828] dark:bg-[#F3F4F6] text-xs font-bold text-white dark:text-[#0A0D12] shadow-2xs ml-0.5"
              title={`${user?.firstName || 'User'} (${user?.email})`}
              aria-label="User profile"
            >
              {initials}
            </button>
          </div>
        </header>

        {/* Main View Port */}
        <main className="animate-page-enter flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6 pb-20 lg:pb-8">
          <div className="mx-auto w-full max-w-360 min-w-0">
            <Outlet />
          </div>
        </main>

        {/* Bottom Mobile Tab Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-30 flex h-13 items-center justify-around border-t border-[#D9E1EC] dark:border-[#2A313A] bg-white/95 dark:bg-[#11151B]/95 backdrop-blur-xs px-2 lg:hidden">
          {[
            { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
            { to: '/accounts', label: 'Accounts', icon: WalletCards },
            { to: '/budgets', label: 'Budgets', icon: PieChart },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`btn-tactile flex flex-col items-center justify-center gap-0.5 py-1 px-3 text-[10px] font-medium transition ${
                  isActive
                    ? 'text-[#101828] dark:text-[#F3F4F6] font-bold'
                    : 'text-[#98A2B3] dark:text-[#858F9D] hover:text-[#475467] dark:hover:text-[#B7C0CC]'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={isActive ? 2.4 : 1.8} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Global Command Palette Dialog (⌘K) */}
      {showCommandPalette && (
        <CommandPaletteModal
          onAction={(action) => {
            setShowCommandPalette(false);
            if (action === 'NEW_TRANSACTION') setShowGlobalQuickTx(true);
            if (action === 'NEW_FAMILY') setShowNewFamilyModal(true);
            if (action.startsWith('NAV_')) navigate(action.replace('NAV_', ''));
          }}
        />
      )}

      {/* Global Quick Action Modal (Record Transaction) */}
      {showGlobalQuickTx && currentFamily && (
        <GlobalQuickTransactionModal
          familyId={currentFamily.id}
          currency={globalCurrency}
          onClose={() => setShowGlobalQuickTx(false)}
        />
      )}

      {/* Household Creation Modal */}
      {showNewFamilyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/50 dark:bg-black/70 backdrop-blur-xs p-4">
          <div className="animate-modal-pop w-full max-w-md rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
              <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Create Household Workspace</h3>
              <button
                onClick={() => setShowNewFamilyModal(false)}
                className="btn-tactile rounded-md p-1 text-[#98A2B3] dark:text-[#858F9D] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-[#475467] dark:text-[#B7C0CC]">
              A household workspace keeps shared bank accounts, transactions, budgets, and goals organized under a single private ledger.
            </p>

            <form onSubmit={handleCreateFamily} className="mt-4 space-y-4">
              <div>
                <label htmlFor="familyName" className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6]">
                  Household Name
                </label>
                <Input
                  id="familyName"
                  type="text"
                  required
                  autoFocus
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="e.g. Saputra Family"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewFamilyModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={createFamily.isPending}
                  disabled={!familyName.trim()}
                  className="bg-[#101828] dark:bg-[#F3F4F6] dark:text-[#0A0D12]"
                >
                  Create Household
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CommandPaletteModal({
  onAction,
}: {
  onAction: (action: string) => void;
}) {
  const [search, setSearch] = useState('');

  const commands = [
    { id: 'NEW_TRANSACTION', label: 'Record New Transaction', shortcut: 'N', icon: Plus },
    { id: 'NAV_/dashboard', label: 'Go to Financial Dashboard', shortcut: 'G D', icon: LayoutDashboard },
    { id: 'NAV_/transactions', label: 'Open Transactions Ledger', shortcut: 'G T', icon: ArrowLeftRight },
    { id: 'NAV_/accounts', label: 'Manage Accounts & Balances', shortcut: 'G A', icon: WalletCards },
    { id: 'NAV_/budgets', label: 'Configure Spending Budgets', shortcut: 'G B', icon: PieChart },
    { id: 'NAV_/goals', label: 'View Savings Goals', shortcut: 'G G', icon: Target },
    { id: 'NAV_/reports', label: 'Open Financial Reports', shortcut: 'G R', icon: BarChart3 },
    { id: 'NAV_/security', label: 'Security & Access Center', shortcut: 'G S', icon: ShieldCheck },
    { id: 'NEW_FAMILY', label: 'Create New Household Workspace', shortcut: '', icon: Building2 },
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#101828]/50 dark:bg-black/70 backdrop-blur-xs pt-20 px-4">
      <div className="animate-modal-pop w-full max-w-lg rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] shadow-2xl overflow-hidden">
        <div className="flex items-center border-b border-[#D9E1EC] dark:border-[#2A313A] px-3.5 py-3">
          <Search className="h-4 w-4 text-[#98A2B3] dark:text-[#858F9D] mr-2.5" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or jump to page..."
            className="w-full bg-transparent text-xs text-[#101828] dark:text-[#F3F4F6] placeholder-[#98A2B3] dark:placeholder-[#858F9D] focus:outline-none"
          />
          <kbd className="rounded border border-[#D9E1EC] dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#181D24] px-1.5 py-0.5 text-[9px] font-mono text-[#98A2B3] dark:text-[#858F9D]">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#98A2B3] dark:text-[#858F9D]">No matching actions found.</div>
          ) : (
            filtered.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => onAction(cmd.id)}
                  className="interactive-row flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-[#475467] dark:text-[#B7C0CC] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6] transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-[#98A2B3] dark:text-[#858F9D] group-hover:text-[#101828] dark:group-hover:text-[#F3F4F6]" />
                    <span className="font-medium text-left">{cmd.label}</span>
                  </div>
                  {cmd.shortcut && (
                    <kbd className="rounded bg-[#F6F8FB] dark:bg-[#181D24] border border-[#D9E1EC] dark:border-[#2A313A] px-1.5 py-0.5 text-[9px] font-mono text-[#98A2B3] dark:text-[#858F9D]">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function GlobalQuickTransactionModal({
  familyId,
  currency,
  onClose,
}: {
  familyId: string;
  currency: string;
  onClose: () => void;
}) {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!);
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');

  const { data: accountsRes } = useAccounts(familyId);
  const { data: categories } = useCategories(familyId);
  const createTx = useCreateTransaction(familyId);
  const accounts = accountsRes?.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!accountId) {
      setError('Please select an account.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    try {
      await createTx.mutateAsync({
        type,
        amount: Math.round(parseFloat(amount) * 100),
        description,
        date: new Date(date).toISOString(),
        accountId,
        categoryId: categoryId || undefined,
        ...(type === 'TRANSFER' && toAccountId ? { toAccountId } : {}),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to record transaction');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/50 dark:bg-black/70 backdrop-blur-xs p-4">
      <div className="animate-modal-pop w-full max-w-md rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#101828] dark:bg-[#F3F4F6] text-white dark:text-[#0A0D12] text-xs font-bold">
              +
            </div>
            <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Quick Add Transaction</h3>
          </div>
          <button
            onClick={onClose}
            className="btn-tactile rounded-md p-1 text-[#98A2B3] dark:text-[#858F9D] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-[#E05A67]/30 dark:border-[#F06B78]/30 bg-[rgba(224,90,103,0.08)] dark:bg-[rgba(240,107,120,0.15)] p-2.5 text-xs text-[#C53B4B] dark:text-[#F06B78]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Type Toggle */}
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#F0F4F8] dark:bg-[#181D24] p-1 text-xs">
            {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`btn-tactile rounded-md py-1 font-semibold transition ${
                  type === t
                    ? 'bg-white dark:bg-[#11151B] text-[#101828] dark:text-[#F3F4F6] shadow-2xs font-bold'
                    : 'text-[#475467] dark:text-[#B7C0CC] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
                }`}
              >
                {t === 'EXPENSE' ? 'Expense' : t === 'INCOME' ? 'Income' : 'Transfer'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
              Amount ({currency})
            </label>
            <Input
              type="number"
              step="any"
              min="1"
              required
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="font-mono text-xs h-9"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Description</label>
            <Input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Grocery Restock, Monthly Salary"
              className="text-xs h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
                {type === 'TRANSFER' ? 'From Account' : 'Account'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] px-3 py-2 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none transition-colors"
                required
              >
                <option value="">Select Account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.balance, currency)})
                  </option>
                ))}
              </select>
            </div>

            {type === 'TRANSFER' ? (
              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">To Account</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] px-3 py-2 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none transition-colors"
                  required
                >
                  <option value="">Destination Account</option>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] px-3 py-2 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none transition-colors"
                >
                  <option value="">Optional Category</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Date</label>
            <Input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs h-9 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createTx.isPending}
              disabled={!accountId || !amount || !description}
              className="bg-[#101828] dark:bg-[#F3F4F6] dark:text-[#0A0D12]"
            >
              Save Transaction
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
