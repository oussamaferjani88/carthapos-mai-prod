import React from 'react';
import { Palette, Paintbrush, Type, Sparkles, Store, LayoutGrid, LayoutTemplate, Settings } from 'lucide-react';

const SECTIONS = [
  { id: 'brand', label: 'Marque', icon: Store, tab: 'design', subTab: 'brand' },
  { id: 'themes', label: 'Thème', icon: Palette, tab: 'design', subTab: 'themes' },
  { id: 'colors', label: 'Couleurs', icon: Paintbrush, tab: 'design', subTab: 'colors' },
  { id: 'typography', label: 'Typo', icon: Type, tab: 'design', subTab: 'typography' },
  { id: 'effects', label: 'Effets', icon: Sparkles, tab: 'design', subTab: 'effects' },
  { id: 'layout', label: 'Layout', icon: LayoutGrid, tab: 'layout', subTab: 'components' },
  { id: 'pages', label: 'Pages', icon: LayoutTemplate, tab: 'pages', subTab: null },
  { id: 'advanced', label: 'Avancé', icon: Settings, tab: 'advanced', subTab: null },
];

const CustomizerNavigation = ({
  selectedTab,
  setSelectedTab,
  selectedSubTab,
  setSelectedSubTab,
  mode = 'inline',
}) => {
  const activeSection = selectedTab === 'advanced'
    ? 'advanced'
    : selectedTab === 'pages'
      ? 'pages'
      : selectedTab === 'layout'
        ? 'layout'
        : selectedSubTab;

  const handleSectionClick = (section) => {
    setSelectedTab(section.tab);
    setSelectedSubTab(section.subTab || section.id);
  };

  return (
    <nav
      className={`w-14 h-full bg-background border-r border-border flex flex-col items-stretch py-2 gap-1 shrink-0 ${mode === 'inline' ? 'hidden sm:flex' : 'flex'}`}
      aria-label="Sections de personnalisation"
    >
      {SECTIONS.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            onClick={() => handleSectionClick(section)}
            title={section.label}
            className={`
              relative w-full flex flex-col items-center justify-center gap-1 py-2.5 rounded-md
              transition-colors duration-150 group
              ${isActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }
            `}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-blue-600" />
            )}
            <Icon
              className="w-[18px] h-[18px]"
              strokeWidth={isActive ? 2.4 : 2}
            />
            <span className="text-[9px] font-medium leading-none tracking-tight">{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default CustomizerNavigation;
