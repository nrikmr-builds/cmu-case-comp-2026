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
  blue: 'bg-blue-100 text-blue-800',
  orange: 'bg-orange-100 text-orange-800',
  green: 'bg-green-100 text-green-800',
  slate: 'bg-slate-200 text-slate-800',
  purple: 'bg-purple-100 text-purple-800',
}

