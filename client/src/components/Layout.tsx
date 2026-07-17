import {
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Sun,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList },
  { to: '/issues', label: 'Issues', icon: TriangleAlert },
  { to: '/feedback', label: 'Feedback', icon: MessageSquare },
  { to: '/notes', label: 'Notes', icon: FileText },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin', label: 'Admin', icon: Settings, adminOnly: true },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => !n.adminOnly || user?.role === 'Admin');

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Toggle navigation"
            onClick={() => setOpen((o) => !o)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-lg font-semibold">Onboarding Diary</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user?.name} · {user?.role}
          </span>
          <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggle}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Log out" onClick={logout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex">
        <nav
          data-tour="sidebar"
          className={cn(
            'fixed inset-y-14 left-0 z-10 w-60 border-r border-border bg-card p-3 transition-transform md:static md:inset-y-auto md:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <ul className="space-y-1">
            {items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={() => setOpen(false)}
                  data-tour={`nav-${label.toLowerCase()}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-h-[calc(100vh-3.5rem)] flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
