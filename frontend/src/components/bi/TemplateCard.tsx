import {
  BedDouble,
  Check,
  ChefHat,
  Coffee,
  Croissant,
  Hotel,
  Pill,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { BiDashboardTemplate } from "@/lib/bi-client";

const BUSINESS_ICONS: Record<string, typeof Coffee> = {
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  bakery: Croissant,
  retail: ShoppingBag,
  pharmacy: Pill,
  salon: Scissors,
  hotel: Hotel,
};

const ICONS_BY_NAME: Record<string, typeof Coffee> = {
  Coffee,
  ChefHat,
  Croissant,
  ShoppingCart,
  Pill,
  Sparkles,
  BedDouble,
};

type Props = {
  template: BiDashboardTemplate;
  selected: boolean;
  onSelect: (businessType: string) => void;
  recommended?: boolean;
};

function listSummary(items: string[] | undefined, cap: number): string | null {
  if (!items || items.length === 0) return null;
  const shown = items.slice(0, cap);
  const extra = items.length - shown.length;
  return `${shown.join(", ")}${extra > 0 ? ` +${extra}` : ""}`;
}

export function TemplateCard({ template, selected, onSelect, recommended }: Props) {
  const Icon = (template.image && ICONS_BY_NAME[template.image]) || BUSINESS_ICONS[template.businessType] || Coffee;
  const kpis = template.kpis || [];
  const dimensions = listSummary(template.dimensions, 4);
  const facts = listSummary(template.facts, 4);
  return (
    <button
      type="button"
      onClick={() => onSelect(template.businessType)}
      aria-pressed={selected}
      className={cn(
        "relative text-left rounded-lg border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border hover:border-primary/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{template.name}</span>
            {recommended && <Badge className="bg-primary/10 text-primary border-primary/20">Recommandé</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description || template.businessType}</p>
        </div>
      </div>
      {kpis.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {kpis.slice(0, 3).map((kpi) => (
            <Badge key={kpi} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              {kpi}
            </Badge>
          ))}
          {kpis.length > 3 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
              +{kpis.length - 3}
            </Badge>
          )}
        </div>
      )}
      {dimensions && <p className="text-[10px] text-muted-foreground mt-1 truncate">Dimensions : {dimensions}</p>}
      {facts && <p className="text-[10px] text-muted-foreground truncate">Faits : {facts}</p>}
      <span
        aria-hidden
        className={cn(
          "absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
          selected ? "bg-primary border-primary text-primary-foreground" : "border-border text-transparent"
        )}
      >
        <Check className="w-3 h-3" />
      </span>
    </button>
  );
}
