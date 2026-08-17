import {
  Sparkles,
  Home, Store, Users,
  MessageCircle, Wallet, Calendar,
  ShoppingBag, FileText, MapPin,
  User, Gift, Scan, Plus,
  HeartPulse, PenLine, MoreHorizontal,
  CalendarPlus, ClipboardPlus
} from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import React from 'react'

export const ICON_MAP: Record<string, LucideIcon> = {
  'ti-home': Home,
  'ti-building-store': Store,
  'ti-users': Users,
  'ti-robot': Sparkles,
  'ti-message': MessageCircle,
  'ti-wallet': Wallet,
  'ti-calendar': Calendar,
  'ti-shopping-bag': ShoppingBag,
  'ti-file-text': FileText,
  'ti-map-pin': MapPin,
  'ti-user': User,
  'ti-gift': Gift,
  'ti-scan': Scan,
  'ti-plus': Plus,
  'ti-heart-rate-monitor': HeartPulse,
  'ti-pencil': PenLine,
  'ti-dots': MoreHorizontal,
  'ti-calendar-plus': CalendarPlus || Calendar,
  'ti-clipboard-plus': ClipboardPlus || Plus,
}

export function getIcon(
  iconKey: string,
  size: number = 22
): React.ReactNode {
  const Icon = ICON_MAP[iconKey]
  if (!Icon) return <Home size={size} />
  return <Icon size={size} />
}
