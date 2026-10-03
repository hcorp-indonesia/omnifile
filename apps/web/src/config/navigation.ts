import { ImagePlus, LayoutDashboard, Music2 } from 'lucide-react';

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
    label: 'Audio',
    path: '/audio',
    icon: Music2,
  },
  {
    label: 'Image',
    path: '/image',
    icon: ImagePlus,
  },
];
