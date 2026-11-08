import { IconDroplet } from '@tabler/icons-react';

/** Split layout shared by the login and register pages. */
export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="sw-auth">
      <div className="sw-auth-hero">
        <div className="sw-logo" style={{ padding: 0 }}>
          <IconDroplet size={26} stroke={2.2} />
          Sweety
        </div>

        <div>
          <h1 style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 12px', fontWeight: 600 }}>
            Know your numbers,
            <br />
            every single day.
          </h1>
          <div className="sw-subtle" style={{ fontSize: 15, maxWidth: 380 }}>
            Log up to four glucose readings a day and see your month at a glance.
          </div>
        </div>

        <div />
      </div>

      <div className="sw-auth-form">
        <div className="sw-card">
          <h2 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</h2>
          <div className="sw-subtle" style={{ marginBottom: 24 }}>
            {subtitle}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
