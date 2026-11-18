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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/[0.06] bg-bg/85 backdrop-blur-xl"
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
              `tap flex flex-col items-center justify-center gap-0.5 text-[9px] font-semibold transition-colors ${isActive ? 'text-ink' : 'text-muted/70'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className="grid h-8 w-12 place-items-center">
                  <Icon name={t.icon} size={22} strokeWidth={isActive ? 2.1 : 1.6} />
                </span>
                <span className="uppercase tracking-[0.12em]">{t.label}</span>
                <span className={`h-1 w-1 rounded-full bg-accent transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
