import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Role } from '@onboarding-diary/shared';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';
import {
  LayoutDashboard,
  CheckSquare,
  AlertTriangle,
  MessageSquare,
  StickyNote,
  FileText,
  Users,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from 'lucide-react';

interface PageLayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Issues', href: '/issues', icon: AlertTriangle },
  { label: 'Feedback', href: '/feedback', icon: MessageSquare },
  { label: 'Notes', href: '/notes', icon: StickyNote },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Admin', href: '/admin/users', icon: Users, roles: [Role.ADMIN] },
];

export function PageLayout({ children }: PageLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600">
            Onboarding Diary
          </Link>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {filteredItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6 text-gray-600" />
          </button>

          <div className="lg:flex-1" />

          {user && (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                  {user.first_name[0]}
                  {user.last_name[0]}
                </div>
                <span className="hidden text-gray-700 sm:block">
                  {user.first_name} {user.last_name}
                </span>
                <span className="hidden rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 sm:block">
                  {user.role}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <div className="border-b border-gray-100 px-4 py-2">
                      <p className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
