import { LayoutDashboard, ArrowRightLeft } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Converters',
    path: '/converters',
    icon: ArrowRightLeft,
  },
];
