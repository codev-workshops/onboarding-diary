import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Avatar,
  Divider,
  Toolbar,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BugReportIcon from '@mui/icons-material/BugReport';
import FeedbackIcon from '@mui/icons-material/Feedback';
import NoteIcon from '@mui/icons-material/Note';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const DRAWER_WIDTH = 240;

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Tasks', icon: <AssignmentIcon />, path: '/tasks' },
  { label: 'Issues', icon: <BugReportIcon />, path: '/issues' },
  { label: 'Feedback', icon: <FeedbackIcon />, path: '/feedback' },
  { label: 'Notes', icon: <NoteIcon />, path: '/notes' },
  { label: 'Reports', icon: <AssessmentIcon />, path: '/reports' },
  { label: 'User Management', icon: <PeopleIcon />, path: '/admin/users', roles: ['ADMIN'] },
];

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const filteredItems = navItems.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role))
  );

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar>
        <Typography variant="h6" noWrap fontWeight={700} color="primary">
          Onboarding Diary
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, px: 1 }}>
        {filteredItems.map((item) => {
          const selected = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              selected={selected}
              onClick={() => {
                navigate(item.path);
                onClose();
              }}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: '#fff',
                  '& .MuiListItemIcon-root': { color: '#fff' },
                  '&:hover': { backgroundColor: 'primary.dark' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: selected ? 600 : 400 }} />
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.9rem' }}>
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </Avatar>
        <Box sx={{ overflow: 'hidden' }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {user?.name || 'User'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user?.role || ''}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: '1px solid', borderColor: 'divider' },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}

export { DRAWER_WIDTH };
