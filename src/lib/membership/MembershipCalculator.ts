export interface MembershipState {
  daysLeftAiPlus: number;
  daysLeftPro: number;
  totalPremiumDays: number;
  computedPlan: string;
  status: string;
  currentPeriodEnd: Date | null;
  validUntil: Date | null;
}

export class MembershipCalculator {
  /**
   * SSOT mantığına uygun olarak, kullanıcının abonelik satırından (user_subscriptions) 
   * aktif kalan günleri, hesaplanmış doğru planı ve bitiş tarihlerini döndürür.
   */
  static calculateMembershipState(sub: {
    plan?: string | null;
    status?: string | null;
    ai_plus_until?: string | Date | null;
    pro_until?: string | Date | null;
    current_period_end?: string | Date | null;
  } | null | undefined): MembershipState {
    const now = new Date();
    
    if (!sub) {
      return {
        daysLeftAiPlus: 0,
        daysLeftPro: 0,
        totalPremiumDays: 0,
        computedPlan: 'free',
        status: 'FREE',
        currentPeriodEnd: null,
        validUntil: null,
      };
    }

    const aiPlusUntil = sub.ai_plus_until ? new Date(sub.ai_plus_until) : null;
    const proUntil = sub.pro_until ? new Date(sub.pro_until) : null;

    const daysLeftAiPlus = aiPlusUntil && aiPlusUntil > now 
      ? Math.ceil((aiPlusUntil.getTime() - now.getTime()) / 86400000) 
      : 0;
    
    const proBaseDate = aiPlusUntil && aiPlusUntil > now ? aiPlusUntil : now;
    const daysLeftPro = proUntil && proUntil > proBaseDate 
      ? Math.ceil((proUntil.getTime() - proBaseDate.getTime()) / 86400000) 
      : 0;
    
    const totalPremiumDays = proUntil && proUntil > now 
      ? Math.ceil((proUntil.getTime() - now.getTime()) / 86400000) 
      : 0;

    let computedPlan = sub.plan || 'free';
    if (daysLeftAiPlus > 0) computedPlan = 'ai_plus';
    else if (daysLeftPro > 0) computedPlan = 'pro';
    else computedPlan = 'free';

    let currentPeriodEnd: Date | null = null;
    if (aiPlusUntil && proUntil) {
      currentPeriodEnd = aiPlusUntil > proUntil ? aiPlusUntil : proUntil;
    } else if (aiPlusUntil) {
      currentPeriodEnd = aiPlusUntil;
    } else if (proUntil) {
      currentPeriodEnd = proUntil;
    } else if (sub.current_period_end) {
      currentPeriodEnd = new Date(sub.current_period_end);
    }

    let status = (sub.status || 'free').toUpperCase();
    if (totalPremiumDays > 0 && (status === 'FREE' || status === 'EXPIRED')) {
      status = 'ACTIVE';
    } else if (totalPremiumDays === 0 && (status === 'ACTIVE' || status === 'TRIAL')) {
      status = 'EXPIRED';
    }

    return {
      daysLeftAiPlus,
      daysLeftPro,
      totalPremiumDays,
      computedPlan,
      status,
      currentPeriodEnd,
      validUntil: currentPeriodEnd
    };
  }
}
