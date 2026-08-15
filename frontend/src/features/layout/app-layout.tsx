import AssignmentIcon from '@mui/icons-material/Assignment';
import BugReportIcon from '@mui/icons-material/BugReport';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import FeedbackIcon from '@mui/icons-material/Feedback';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import NotesIcon from '@mui/icons-material/Notes';
import {
  AppBar,
  Box,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { RecruitSelector } from '../recruits/recruit-selector';

const drawerWidth = 240;

const navItems = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/tasks', label: 'Task log', icon: <AssignmentIcon /> },
  { to: '/issues', label: 'Issue log', icon: <BugReportIcon /> },
  { to: '/feedback', label: 'Feedback', icon: <FeedbackIcon /> },
  { to: '/notes', label: 'Notes', icon: <NotesIcon /> },
  { to: '/reports', label: 'Reports', icon: <DescriptionIcon /> },
];

export function AppLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  const navigation = (
    <List>
      {navItems.map((item) => (
        <ListItemButton
          key={item.to}
          component={NavLink}
          to={item.to}
          end={item.to === '/'}
          onClick={() => setMobileOpen(false)}
          sx={{ '&.active': { backgroundColor: 'action.selected' } }}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {!isDesktop ? (
            <IconButton
              color="inherit"
              edge="start"
              aria-label="Open navigation"
              onClick={() => setMobileOpen((open) => !open)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          ) : null}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Onboarding Diary
          </Typography>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <RecruitSelector />
            {isDesktop ? <Typography variant="body2">{user?.fullName}</Typography> : null}
            <Tooltip title="Sign out">
              <IconButton color="inherit" aria-label="Sign out" onClick={handleSignOut}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        {isDesktop ? <Toolbar /> : null}
        {navigation}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, width: '100%' }}>
        <Toolbar />
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
