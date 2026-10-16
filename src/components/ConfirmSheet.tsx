import { Sheet } from './Sheet';

interface Props {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmSheet({ open, title, body, confirmLabel = 'Delete', onConfirm, onClose }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="mb-6 text-muted">{body}</p>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn bg-danger text-white"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
