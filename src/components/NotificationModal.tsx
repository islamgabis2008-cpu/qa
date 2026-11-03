import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { X, Bell, CheckCheck, Clock } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useAuth();
  const { lang, t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md h-full sm:h-[85vh] bg-white sm:rounded-2xl shadow-2xl flex flex-col border border-slate-100 animate-in slide-in-from-end duration-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                {lang === 'ar' ? 'الإشعارات المباشرة' : 'Centre de Notifications'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {unreadCount > 0 ? `${unreadCount} ${lang === 'ar' ? 'إشعار غير مقروء' : 'non lus'}` : (lang === 'ar' ? 'كل الإشعارات مقروءة' : 'Tout est à jour')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-semibold flex items-center gap-1 transition"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="text-[11px]">{lang === 'ar' ? 'تحديد الكل كمقروء' : 'Tout marquer lu'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>{lang === 'ar' ? 'لا توجد إشعارات جديدة حالياً' : 'Aucune notification pour le moment'}</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.is_read && markNotificationRead(n.id)}
                className={`p-3 rounded-xl border transition cursor-pointer ${n.is_read ? 'bg-white border-slate-100' : 'bg-blue-50/60 border-blue-200'}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className={`text-xs ${n.is_read ? 'font-bold text-slate-800' : 'font-black text-blue-900'}`}>
                    {lang === 'ar' ? n.title_ar : n.title_fr}
                  </h4>
                  <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {n.created_at?.slice(11, 16) || 'Maintenant'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {lang === 'ar' ? n.message_ar : n.message_fr}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
