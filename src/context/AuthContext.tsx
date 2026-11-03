import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, NotificationItem } from '../types/index.js';
import { api, setApiToken } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  switchDemo: (role: 'CUSTOMER' | 'RESTAURANT_OWNER' | 'COURIER' | 'ADMIN') => Promise<void>;
  refreshUser: () => Promise<void>;
  notifications: NotificationItem[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: number) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  switchDemo: async () => {},
  refreshUser: async () => {},
  notifications: [],
  unreadCount: 0,
  refreshNotifications: async () => {},
  markNotificationRead: async () => {},
  markAllNotificationsRead: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await api.getNotifications();
      if (res.success) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // ignore
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.getProfile();
      if (res.success && res.user) {
        setUser(res.user);
        await refreshNotifications();
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, [refreshNotifications]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('dz_token');
      if (token) {
        setApiToken(token);
        await refreshUser();
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, [refreshUser]);

  // Polling notifications periodically
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refreshNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, [user, refreshNotifications]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    if (res.success) {
      setApiToken(res.token);
      setUser(res.user);
      await refreshNotifications();
    }
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    if (res.success) {
      setApiToken(res.token);
      setUser(res.user);
      await refreshNotifications();
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    setApiToken('');
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
  };

  const switchDemo = async (role: 'CUSTOMER' | 'RESTAURANT_OWNER' | 'COURIER' | 'ADMIN') => {
    setLoading(true);
    try {
      const res = await api.switchDemo(role);
      if (res.success) {
        setApiToken(res.token);
        setUser(res.user);
        await refreshNotifications();
      }
    } finally {
      setLoading(false);
    }
  };

  const markNotificationRead = async (id: number) => {
    await api.markNotificationRead(id);
    await refreshNotifications();
  };

  const markAllNotificationsRead = async () => {
    await api.markAllNotificationsRead();
    await refreshNotifications();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        switchDemo,
        refreshUser,
        notifications,
        unreadCount,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
