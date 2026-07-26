import React from 'react';
import { Building, Palette, Paintbrush, Type, Sparkles, Layout, Settings } from 'lucide-react';

const sections = [
  { id: 'brand', label: 'Brand', icon: Building, tab: 'design' },
  { id: 'themes', label: 'Thèmes', icon: Palette, tab: 'design' },
  { id: 'colors', label: 'Couleurs', icon: Paintbrush, tab: 'design' },
  { id: 'typography', label: 'Typo', icon: Type, tab: 'design' },
  { id: 'effects', label: 'Effets', icon: Sparkles, tab: 'design' },
  { id: 'components', label: 'Layout', icon: Layout, tab: 'layout' },
  { id: 'advanced', label: 'Avancé', icon: Settings, tab: 'advanced' },
];

const CustomizerNavigation = ({
  selectedTab,
  setSelectedTab,
  selectedSubTab,
  setSelectedSubTab,
  mode = 'inline',
}) => {
  const activeSection = selectedTab === 'advanced' ? 'advanced' : selectedSubTab;

  const handleSectionClick = (section) => {
    setSelectedTab(section.tab);
    if (section.id !== 'advanced') {
      setSelectedSubTab(section.id);
    }
  };

  return (
    <nav className="w-12 h-full bg-white border-r border-gray-200 flex flex-col items-center py-2 gap-1 shrink-0">
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            onClick={() => handleSectionClick(section)}
            className={`
              w-10 h-10 flex flex-col items-center justify-center rounded-lg
              transition-all duration-150
              ${isActive
                ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600'
                : 'text-gray-500 hover:bg-gray-100 border-l-2 border-transparent'
              }
            `}
            title={section.label}
          >
            <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[9px] mt-0.5 font-medium leading-none">{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default CustomizerNavigation;
