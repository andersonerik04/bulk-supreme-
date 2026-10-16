import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function EmptyState({ icon, title, body, action, tone = 'text-muted' }: { icon: IconName; title: string; body?: string; action?: ReactNode; tone?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <div className={`mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-elevated ${tone}`}>
        <Icon name={icon} size={26} />
      </div>
      <p className="font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-xs text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
