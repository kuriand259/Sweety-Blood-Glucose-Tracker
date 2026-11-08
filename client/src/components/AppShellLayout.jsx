import { AppShell, Button, Group, Text, NavLink } from '@mantine/core';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function AppShellLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header px="md">
        <Group h="100%" justify="space-between">
          <Group gap="lg">
            <Text fw={700} size="lg" component={Link} to="/readings" c="teal.7" td="none">
              Sweety
            </Text>
            <NavLink
              component={Link}
              to="/readings"
              label="Readings"
              active={location.pathname.startsWith('/readings')}
              variant="subtle"
              style={{ width: 'auto' }}
            />
            <NavLink
              component={Link}
              to="/reports"
              label="Reports"
              active={location.pathname.startsWith('/reports')}
              variant="subtle"
              style={{ width: 'auto' }}
            />
          </Group>
          <Group>
            <Text size="sm" c="dimmed">
              {user?.name}
            </Text>
            <Button
              variant="light"
              color="gray"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Log out
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
