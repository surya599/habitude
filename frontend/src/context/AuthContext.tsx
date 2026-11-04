import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile, UnlockedAchievementItem } from '../types';
import { apiRequest, getAuthToken, setAuthToken } from '../lib/api';
import { useTheme } from './ThemeContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'achievement';
}

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithToken: (token: string, profile: UserProfile) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: Partial<UserProfile>) => Promise<UserProfile>;
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  celebrateAchievements: (achievements: UnlockedAchievementItem[]) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [celebrationItem, setCelebrationItem] = useState<UnlockedAchievementItem | null>(null);
  const { setTheme } = useTheme();

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const celebrateAchievements = useCallback(
    (achievements: UnlockedAchievementItem[]) => {
      if (!achievements || achievements.length === 0) return;
      setCelebrationItem(achievements[0]);
      achievements.forEach((ach) => {
        showToast({
          title: `Achievement Unlocked: ${ach.title}`,
          description: ach.description,
          variant: 'achievement',
        });
      });
    },
    [showToast]
  );

  const refreshProfile = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const profile = await apiRequest<UserProfile>('/auth/me/');
      setUser(profile);
      if (profile.theme_preference) {
        setTheme(profile.theme_preference, false);
      }
    } catch {
      setAuthToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [setTheme]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const loginWithToken = (token: string, profile: UserProfile) => {
    setAuthToken(token);
    setUser(profile);
    if (profile.theme_preference) {
      setTheme(profile.theme_preference, false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout/', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (payload: Partial<UserProfile>): Promise<UserProfile> => {
    const updated = await apiRequest<UserProfile>('/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setUser(updated);
    if (payload.theme_preference) {
      setTheme(payload.theme_preference, false);
    }
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginWithToken,
        logout,
        refreshProfile,
        updateProfile,
        showToast,
        celebrateAchievements,
      }}
    >
      {children}

      {/* Apple-inspired Floating Toast Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-surface border border-border shadow-apple-lg"
            >
              <div className="mt-0.5 shrink-0">
                {t.variant === 'achievement' ? (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                ) : t.variant === 'error' ? (
                  <div className="w-8 h-8 rounded-xl bg-danger-soft text-danger flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-success-soft text-success flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-muted hover:text-foreground p-1 rounded-lg transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Achievement Celebration Modal */}
      <AnimatePresence>
        {celebrationItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setCelebrationItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-border rounded-3xl p-8 max-w-md w-full text-center shadow-apple-lg relative overflow-hidden"
            >
              <div
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-sm"
                style={{
                  backgroundColor: `${celebrationItem.badge_color}18`,
                  color: celebrationItem.badge_color,
                }}
              >
                <Sparkles className="w-8 h-8" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-accent-soft text-accent mb-3">
                Milestone Unlocked
              </span>
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                {celebrationItem.title}
              </h3>
              <p className="text-sm text-muted mt-2.5 leading-relaxed">
                {celebrationItem.description}
              </p>
              <button
                onClick={() => setCelebrationItem(null)}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
              >
                Continue Building
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
