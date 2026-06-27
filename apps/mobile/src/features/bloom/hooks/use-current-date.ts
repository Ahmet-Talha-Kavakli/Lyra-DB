/**
 * Returns "today" (UTC midnight Date) that automatically advances when the
 * day changes — either because the wall clock crossed midnight while the app
 * was open, or because the app came back from background after a day.
 *
 * Why: Bloom Today/Calendar were freezing the date at mount time, so an app
 * left open past midnight kept showing yesterday's date.
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * "Today" — kullanıcının **yerel** takvim günü için UTC midnight Date.
 * Yerel tarih (saat/dakika atılır), sonra o tarih için UTC midnight inşa edilir.
 * Bu sayede UTC offset (örn. TR = UTC+3) kullanıcıyı "dünde" tutmaz.
 */
function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function msUntilNextMidnight(now: Date): number {
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 50); // +50ms guard to avoid double-fire
  return tomorrow.getTime() - now.getTime();
}

export function useCurrentDate(): Date {
  const [today, setToday] = useState(() => startOfDay(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setToday(startOfDay(new Date()));
        schedule(); // chain the next midnight
      }, msUntilNextMidnight(new Date()));
    };

    const checkNow = () => {
      const fresh = startOfDay(new Date());
      setToday((prev) => (prev.getTime() === fresh.getTime() ? prev : fresh));
    };

    schedule();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // returned from background — date may have rolled over
        checkNow();
        schedule();
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return today;
}
