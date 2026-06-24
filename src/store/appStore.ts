import { create } from 'zustand';
import { ThemeMode, ContrastMode, FontSizeScale } from '../config/theme';

export interface UserSession {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'medication_refill' | 'medication_reminder' | 'appointment' | 'daily_check';
  timestamp: string;
  isRead: boolean;
  referenceId?: number; // e.g. medication_id or visit_id
}

interface AppState {
  // Auth Session State
  user: UserSession | null;
  setUser: (user: UserSession | null) => void;
  logout: () => void;

  // Accessibility & UI settings
  themeMode: ThemeMode;
  contrastMode: ContrastMode;
  fontSizeScale: FontSizeScale;
  setThemeMode: (mode: ThemeMode) => void;
  setContrastMode: (mode: ContrastMode) => void;
  setFontSizeScale: (scale: FontSizeScale) => void;

  // Security configuration
  isLocked: boolean;
  setIsLocked: (isLocked: boolean) => void;
  biometricsEnabled: boolean;
  setBiometricsEnabled: (enabled: boolean) => void;
  hasPin: boolean;
  setHasPin: (hasPin: boolean) => void;

  // Notifications center state
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth Session Initial State
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null, isLocked: false }),

  // Accessibility & UI settings Initial State
  themeMode: 'light',
  contrastMode: 'normal',
  fontSizeScale: 'normal',
  setThemeMode: (themeMode) => set({ themeMode }),
  setContrastMode: (contrastMode) => set({ contrastMode }),
  setFontSizeScale: (fontSizeScale) => set({ fontSizeScale }),

  // Security Settings Initial State
  isLocked: false,
  setIsLocked: (isLocked) => set({ isLocked }),
  biometricsEnabled: false,
  setBiometricsEnabled: (biometricsEnabled) => set({ biometricsEnabled }),
  hasPin: false,
  setHasPin: (hasPin) => set({ hasPin }),

  // Notifications Initial State
  notifications: [],
  addNotification: (notification) =>
    set((state) => {
      const newNotif: AppNotification = {
        ...notification,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      return { notifications: [newNotif, ...state.notifications] };
    }),
  markNotificationAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    })),
  clearAllNotifications: () => set({ notifications: [] }),
}));
