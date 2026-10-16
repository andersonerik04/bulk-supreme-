import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Today', icon: 'home' },
  { to: '/log', label: 'Log', icon: 'plus' },
  { to: '/trends', label: 'Trends', icon: 'chart' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/settings', label: 'Settings', icon: 'gear' },
];

export function TabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/[0.06] bg-bg/80 backdrop-blur-xl backdrop-saturate-150"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
      aria-label="Main"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5" style={{ height: 'var(--tabbar-h)' }}>
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `tap flex flex-col items-center justify-center gap-1 text-[10px] font-semibold tracking-wide transition-colors ${isActive ? 'text-ink' : 'text-muted/80'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`grid h-8 w-12 place-items-center rounded-full transition-colors ${isActive ? 'bg-ink/10' : ''}`}>
                  <Icon name={t.icon} size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                {t.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
