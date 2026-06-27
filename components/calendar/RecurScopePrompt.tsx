'use client';
import Sheet from '../primitives/Sheet';

export type Scope = 'all' | 'single' | 'following';

// Google-Calendar's "This event / This and following / All events" chooser,
// shown when editing or deleting an occurrence of a recurring series.
export default function RecurScopePrompt({
  open,
  title,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  title: string;
  onOpenChange: (o: boolean) => void;
  onPick: (s: Scope) => void;
}) {
  const opts: [Scope, string][] = [
    ['single', 'This event'],
    ['following', 'This and following events'],
    ['all', 'All events'],
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <h3>{title}</h3>
      <div className="rs-opts">
        {opts.map(([v, l]) => (
          <button key={v} className="rs-opt" onClick={() => onPick(v)}>
            {l}
          </button>
        ))}
      </div>
      <button className="btn block" onClick={() => onOpenChange(false)} style={{ marginTop: 6 }}>
        Cancel
      </button>
    </Sheet>
  );
}
