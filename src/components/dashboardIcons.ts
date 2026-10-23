import { Briefcase, LayoutDashboard, PiggyBank, ShieldCheck, Smartphone, Star, Sun, type LucideIcon } from 'lucide-react'
import type { DashboardColor, DashboardIcon } from '../lib/dashboards'

export const DASHBOARD_ICONS: Record<DashboardIcon, LucideIcon> = {
  layout: LayoutDashboard,
  sun: Sun,
  shield: ShieldCheck,
  piggy: PiggyBank,
  smartphone: Smartphone,
  briefcase: Briefcase,
  star: Star,
}

export const DASHBOARD_COLORS: Record<DashboardColor, string> = {
  blue: 'bg-info-soft text-info',
  orange: 'bg-accent-soft text-accent',
  green: 'bg-positive-soft text-positive',
  slate: 'bg-line text-ink',
  purple: 'bg-plum-soft text-plum',
}

