export type WindowUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year' | 'lifetime';

export interface UsageWindow {
  start: Date;
  end: Date | null;
}

export class WindowResolver {
  /**
   * Resolves the start and end boundary for a usage tracking window based on a unit and value.
   * This is entirely decoupled from user subscription billing cycles.
   * 
   * @param unit The time unit (e.g., 'month', 'day')
   * @param value The value multiplier (e.g., 1 for 1 month)
   * @param referenceDate The date to resolve the window for (defaults to now)
   * @returns UsageWindow containing start Date and optional end Date
   */
  static resolveWindow(unit: WindowUnit, value: number = 1, referenceDate: Date = new Date()): UsageWindow {
    // Clone reference date to prevent mutating the input
    const now = new Date(referenceDate.getTime());
    
    // Default zeroing depending on precision
    if (['day', 'week', 'month', 'year', 'lifetime'].includes(unit)) {
      now.setUTCHours(0, 0, 0, 0);
    } else {
      now.setUTCSeconds(0, 0);
    }

    switch (unit) {
      case 'minute': {
        const start = new Date(now.getTime());
        const end = new Date(now.getTime());
        end.setUTCMinutes(end.getUTCMinutes() + value);
        return { start, end };
      }
      
      case 'hour': {
        const start = new Date(now.getTime());
        const end = new Date(now.getTime());
        end.setUTCHours(end.getUTCHours() + value);
        return { start, end };
      }
      
      case 'day': {
        const start = new Date(now.getTime());
        const end = new Date(now.getTime());
        end.setUTCDate(end.getUTCDate() + value);
        return { start, end };
      }
      
      case 'week': {
        // Assuming week starts on Monday
        const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
        const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(now.setUTCDate(diff));
        
        const end = new Date(start.getTime());
        end.setUTCDate(end.getUTCDate() + (7 * value));
        return { start, end };
      }

      case 'month': {
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + value, 1));
        return { start, end };
      }

      case 'year': {
        const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
        const end = new Date(Date.UTC(now.getUTCFullYear() + value, 0, 1));
        return { start, end };
      }

      case 'lifetime': {
        // Universal epoch start
        return { 
          start: new Date(Date.UTC(1970, 0, 1)), 
          end: null 
        };
      }

      default:
        throw new Error(`WindowUnit ${unit} is not supported.`);
    }
  }
}
