import { useState } from 'react';
import {
  Warehouse,
  Boxes,
  Table2,
  ChevronRight,
  KeyRound,
  Database,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { cn } from '@/lib/utils';

function num(n) {
  return Number.isFinite(n) ? n.toLocaleString('fr-FR') : String(n);
}

function Group({ icon, label, tone, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold hover:bg-accent"
      >
        <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-90')} />
        <span className={tone}>{icon}</span>
        {label}
      </button>
      {open && <div className="mt-0.5 space-y-0.5 pl-5">{children}</div>}
    </div>
  );
}

function Item({ icon, name, count, tone, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-accent',
        selected && 'bg-accent font-semibold'
      )}
    >
      <span className={tone}>{icon}</span>
      <span className="min-w-0 flex-1 truncate font-mono">{name}</span>
      <Badge variant="outline" className="shrink-0 px-1 text-[9px]">{num(count)}</Badge>
    </button>
  );
}

export default function ModelExplorer({ model, selectedNode, onSelect }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-lg border bg-card p-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-bold text-blue-700 hover:bg-accent"
      >
        <ChevronRight className={cn('h-4 w-4 transition-transform', open && 'rotate-90')} />
        <Warehouse className="h-4 w-4" />
        Entrepôt
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          <Group icon={<Boxes className="h-3.5 w-3.5 text-blue-600" />} label="Dimensions" tone="text-blue-600">
            {model.dimensions.map((d) => (
              <Item
                key={d.name}
                icon={<Database className="h-3.5 w-3.5" />}
                name={d.name}
                count={d.count}
                tone="text-blue-600"
                selected={selectedNode?.kind === 'dimension' && selectedNode.name === d.name}
                onClick={() => onSelect({ kind: 'dimension', name: d.name })}
              />
            ))}
          </Group>
          <Group icon={<Table2 className="h-3.5 w-3.5 text-orange-600" />} label="Faits" tone="text-orange-600">
            {model.facts.map((f) => (
              <Item
                key={f.name}
                icon={<KeyRound className="h-3.5 w-3.5" />}
                name={f.name}
                count={f.count}
                tone="text-orange-600"
                selected={selectedNode?.kind === 'fact' && selectedNode.name === f.name}
                onClick={() => onSelect({ kind: 'fact', name: f.name })}
              />
            ))}
          </Group>
        </div>
      )}
    </div>
  );
}
