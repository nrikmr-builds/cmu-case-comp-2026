// Line icons per product, echoing the product icons on pnc.com.
import { PiggyBank, Vault, Wallet, type LucideIcon } from 'lucide-react'
import type { ProductId } from '../types'

export const PRODUCT_ICONS: Record<ProductId, LucideIcon> = {
  checking: Wallet,
  savings: PiggyBank,
  cd: Vault,
}
