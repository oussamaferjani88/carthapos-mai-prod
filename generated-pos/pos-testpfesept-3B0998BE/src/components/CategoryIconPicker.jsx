import { useState, useMemo } from 'react';
import {
  Pizza,
  Coffee,
  Apple,
  Sandwich,
  Beef,
  Wine,
  CupSoda,
  Beer,
  Utensils,
  CakeSlice,
  IceCreamBowl,
  Popcorn,
  CookingPot,
  ChefHat,
  Soup,
  Salad,
  Fish,
  Egg,
  Milk,
  Citrus,
  ShoppingBag,
  Package,
  Gift,
  Flower2,
  Shirt,
  Scissors,
  Wrench,
  Cog,
  Box,

  Tags,
  Star,
  Heart,
  Flame,
  Sun,
  Moon,
  Cloud,
  Zap,
  Leaf,
  Gem,
  Sparkles,
  Smile,
  Frown,
  Meh
} from 'lucide-react';

export const ICONS_LIST = [
  { name: 'Pizza', component: Pizza },
  { name: 'Coffee', component: Coffee },
  { name: 'Apple', component: Apple },
  { name: 'Sandwich', component: Sandwich },
  { name: 'Beef', component: Beef },
  { name: 'Wine', component: Wine },
  { name: 'CupSoda', component: CupSoda },
  { name: 'Beer', component: Beer },
  { name: 'Utensils', component: Utensils },
  { name: 'CakeSlice', component: CakeSlice },
  { name: 'IceCreamBowl', component: IceCreamBowl },
  { name: 'Popcorn', component: Popcorn },
  { name: 'CookingPot', component: CookingPot },
  { name: 'ChefHat', component: ChefHat },
  { name: 'Soup', component: Soup },
  { name: 'Salad', component: Salad },
  { name: 'Fish', component: Fish },
  { name: 'Egg', component: Egg },
  { name: 'Milk', component: Milk },
  { name: 'Citrus', component: Citrus },
  { name: 'ShoppingBag', component: ShoppingBag },
  { name: 'Package', component: Package },
  { name: 'Gift', component: Gift },
  { name: 'Flower2', component: Flower2 },
  { name: 'Shirt', component: Shirt },
  { name: 'Scissors', component: Scissors },
  { name: 'Wrench', component: Wrench },
  { name: 'Cog', component: Cog },
  { name: 'Box', component: Box },
  { name: 'Tags', component: Tags },
  { name: 'Star', component: Star },
  { name: 'Heart', component: Heart },
  { name: 'Flame', component: Flame },
  { name: 'Sun', component: Sun },
  { name: 'Moon', component: Moon },
  { name: 'Cloud', component: Cloud },
  { name: 'Zap', component: Zap },
  { name: 'Leaf', component: Leaf },
  { name: 'Gem', component: Gem },
  { name: 'Sparkles', component: Sparkles },
  { name: 'Smile', component: Smile },
  { name: 'Frown', component: Frown },
  { name: 'Meh', component: Meh }
];

const CategoryIconPicker = ({ selectedIcon, onSelect }) => {
  const [search, setSearch] = useState('');

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return ICONS_LIST;
    const q = search.toLowerCase();
    return ICONS_LIST.filter(icon => icon.name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher une icône..."
        className="w-full px-2 py-1 text-xs border rounded"
      />
      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 border rounded">
        {filteredIcons.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2">Aucune icône trouvée</p>
        ) : (
          filteredIcons.map(({ name, component: Icon }) => (
            <button
              key={name}
              type="button"
              onClick={() => onSelect(selectedIcon === name ? '' : name)}
              className={`p-1.5 rounded border transition-all ${
                selectedIcon === name
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-transparent hover:border-gray-300 hover:bg-gray-50'
              }`}
              title={name}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export const getIconComponent = (iconName) => {
  if (!iconName) return null;
  const found = ICONS_LIST.find(i => i.name === iconName);
  return found ? found.component : null;
};

export default CategoryIconPicker;
