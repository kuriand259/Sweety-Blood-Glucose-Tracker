import { Menu, UnstyledButton } from '@mantine/core';
import {
  IconChartLine,
  IconDroplet,
  IconLayoutDashboard,
  IconLogout,
  IconPlus,
} from '@tabler/icons-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ExpandButton } from './ExpandButton';
import { GLUCOSE_BANDS } from '../lib/glucose';
import { prettyDate, todayString } from '../lib/month';

function initials(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || '?'
  );
}

export function AppShellLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.name?.split(/\s+/)[0] ?? 'there';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="sw-frame">
      <aside className="sw-sidebar">
        <NavLink to="/readings" className="sw-logo">
          <IconDroplet size={26} stroke={2.2} />
          Sweety
        </NavLink>

        <nav className="sw-nav">
          <NavLink to="/readings">
            <IconLayoutDashboard size={18} stroke={1.8} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/reports">
            <IconChartLine size={18} stroke={1.8} />
            <span>Reports</span>
          </NavLink>
        </nav>

        <div className="sw-legend">
          <div className="sw-nav-label" style={{ marginTop: 32 }}>
            Glucose bands
          </div>
          {GLUCOSE_BANDS.map((b) => (
            <div key={b.key} className="sw-legend-row">
              <span className={`sw-dot sw-bg-${b.key}`} />
              {b.label}
            </div>
          ))}
        </div>

        <div className="sw-sidebar-foot sw-nav">
          <a
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              handleLogout();
            }}
          >
            <IconLogout size={18} stroke={1.8} />
            <span>Log out</span>
          </a>
        </div>
      </aside>

      <main className="sw-main">
        <header className="sw-topbar">
          <div>
            <h1 className="sw-greeting">Hi, {firstName}!</h1>
            <div className="sw-subtle">
              {prettyDate(todayString(), { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ExpandButton
              icon={IconPlus}
              label="Add reading"
              onClick={() => navigate('/readings', { state: { focusAdd: Date.now() } })}
            />
            <Menu position="bottom-end" radius="lg" shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton className="sw-avatar" aria-label="Account menu">
                  {initials(user?.name)}
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user?.email}</Menu.Label>
                <Menu.Item leftSection={<IconLogout size={14} />} onClick={handleLogout}>
                  Log out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
