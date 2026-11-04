import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  CheckCircle2,
  BarChart3,
  Target,
  BookText,
  Landmark,
  CalendarRange,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  LogOut,
  User,
  Menu,
  X,
  Clock,
  Sparkles,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import { apiRequest } from '../../lib/api';
import { NotificationItem } from '../../types';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/habits', label: 'My Habits', icon: CheckCircle2 },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/journal', label: 'Journal', icon: BookText },
  { to: '/stoic', label: 'Stoic Library', icon: Landmark },
  { to: '/reviews/weekly', label: 'Reviews', icon: CalendarRange, matchPrefix: '/reviews' },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [upcomingReminders, setUpcomingReminders] = useState<
    Array<{
      habit_id: number;
      habit_name: string;
      category_name: string;
      icon: string;
      color: string;
      reminder_time: string;
    }>
  >([]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await apiRequest<{
        notifications: NotificationItem[];
        unread_count: number;
        upcoming_reminders: typeof upcomingReminders;
      }>('/notifications/');
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
      setUpcomingReminders(res.upcoming_reminders || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [location.pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotifOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/', { method: 'POST', body: JSON.stringify({}) });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      setUnreadCount(0);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const initials = (user?.full_name || user?.username || 'H')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-border bg-surface transition-all duration-300 ease-out sticky top-0 h-screen z-30 ${
          collapsed ? 'w-[78px]' : 'w-[264px]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-border/70">
          <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center font-bold text-sm tracking-tight shrink-0 shadow-sm">
              H
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-semibold tracking-tight text-sm text-foreground leading-none">
                  HABITUDE
                </span>
                <span className="text-[10px] text-muted tracking-wider uppercase mt-0.5">
                  Personal Growth
                </span>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCustomActive =
              item.matchPrefix && location.pathname.startsWith(item.matchPrefix);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => {
                  const active = isActive || isCustomActive;
                  return `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-muted hover:text-foreground hover:bg-surface-secondary'
                  } ${collapsed ? 'justify-center px-0' : ''}`;
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer: Theme Switcher & User Profile */}
        <div className="p-3 border-t border-border/80 space-y-3">
          <div className="flex justify-center">
            <ThemeSwitcher compact={collapsed} className="w-full justify-between" />
          </div>

          <div
            className={`flex items-center gap-3 p-2 rounded-2xl bg-surface-secondary/70 border border-border/60 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <Link
              to="/settings"
              className="w-9 h-9 rounded-xl bg-accent/15 text-accent font-semibold text-xs flex items-center justify-center shrink-0"
            >
              {initials}
            </Link>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-[11px] text-muted truncate">{user?.email}</p>
              </div>
            )}
            {!collapsed && (
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 rounded-lg text-muted hover:text-danger transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 px-4 sm:px-8 border-b border-border/80 bg-surface/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-secondary"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
              <span className="font-medium text-foreground">HABITUDE</span>
              <span>/</span>
              <span className="capitalize">
                {location.pathname.split('/').filter(Boolean).join(' · ') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Notification Popover */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2.5 rounded-xl bg-surface-secondary hover:bg-border/60 text-foreground transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-surface" />
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-surface border border-border shadow-apple-lg p-4 z-50"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Notifications & Reminders
                        </h3>
                        <p className="text-[11px] text-muted">
                          {unreadCount} unread updates
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Mark all read
                        </button>
                      )}
                    </div>

                    {/* Upcoming Habit Reminders */}
                    {upcomingReminders.length > 0 && (
                      <div className="py-2.5 border-b border-border">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-accent" /> Scheduled Daily Reminders
                        </p>
                        <div className="space-y-1.5 max-h-28 overflow-y-auto">
                          {upcomingReminders.map((rem) => (
                            <div
                              key={rem.habit_id}
                              className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-surface-secondary"
                            >
                              <span className="font-medium text-foreground truncate">
                                {rem.habit_name}
                              </span>
                              <span className="text-muted font-mono text-[11px] shrink-0 ml-2">
                                {rem.reminder_time}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notifications List */}
                    <div className="mt-2.5 space-y-2 max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-muted text-center py-6">
                          No notifications yet. Stay consistent today!
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (n.action_url) navigate(n.action_url);
                              setNotifOpen(false);
                            }}
                            className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                              n.is_read
                                ? 'bg-transparent border-border/60'
                                : 'bg-accent-soft/50 border-accent/30'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
                              <p className="text-xs font-semibold text-foreground">
                                {n.title}
                              </p>
                            </div>
                            <p className="text-xs text-muted mt-1 leading-relaxed">
                              {n.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown Menu (includes Theme Switcher per requirement 3.C) */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-surface-secondary hover:bg-border/60 transition-colors"
                aria-label="Open profile menu"
              >
                <div className="w-7 h-7 rounded-lg bg-accent text-white text-xs font-semibold flex items-center justify-center">
                  {initials}
                </div>
                <span className="text-xs font-medium text-foreground hidden sm:inline">
                  {user?.full_name || user?.username}
                </span>
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface border border-border shadow-apple-lg p-3 z-50 space-y-3"
                  >
                    <div className="px-2 py-1.5 border-b border-border">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {user?.full_name || user?.username}
                      </p>
                      <p className="text-[11px] text-muted truncate">{user?.email}</p>
                    </div>

                    <div className="px-2">
                      <p className="text-[11px] font-medium text-muted mb-1.5">
                        Appearance
                      </p>
                      <ThemeSwitcher className="w-full justify-between" />
                    </div>

                    <div className="pt-1 border-t border-border space-y-1">
                      <Link
                        to="/settings"
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-surface-secondary transition-colors"
                      >
                        <User className="w-4 h-4 text-muted" />
                        Profile & Preferences
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-danger hover:bg-danger-soft transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content with Smooth Transition */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1440px] w-full mx-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden bg-black/50 backdrop-blur-sm flex"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-72 max-w-[85vw] bg-surface h-full border-r border-border flex flex-col justify-between p-4"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center font-bold text-sm">
                      H
                    </div>
                    <span className="font-semibold tracking-tight text-sm text-foreground">
                      HABITUDE
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-muted hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="mt-4 space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                            isActive
                              ? 'bg-accent text-white'
                              : 'text-muted hover:text-foreground hover:bg-surface-secondary'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <ThemeSwitcher className="w-full justify-between" />
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-danger-soft text-danger text-xs font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
