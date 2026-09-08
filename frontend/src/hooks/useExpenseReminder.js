import { useEffect, useRef, useState } from 'react';

// Daily reminder notification: once per day after first visit of the day,
// asks if you logged today's expenses (Notification API + localStorage flag).
export function useExpenseReminder(enabled = true) {
  const [reminder, setReminder] = useState(null);
  const dismissed = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const key = 'last_reminder_date';
    const today = new Date().toISOString().slice(0, 10);
    const last = localStorage.getItem(key);

    if (last === today) return;

    const timer = setTimeout(() => {
      if (Notification?.permission === 'granted') {
        new Notification('💸 Log your expenses', {
          body: 'Did you log today\'s expenses? Keep your streak going!',
          tag: 'expense-reminder',
        });
      }
      setReminder('Have you logged today\'s expenses yet?');
      localStorage.setItem(key, today);
    }, 5000);

    return () => clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (!reminder) return;
    const dismiss = () => {
      dismissed.current = true;
      setReminder(null);
    };
    const t = setTimeout(dismiss, 15000);
    return () => clearTimeout(t);
  }, [reminder]);

  return { reminder, dismiss: () => setReminder(null) };
}
