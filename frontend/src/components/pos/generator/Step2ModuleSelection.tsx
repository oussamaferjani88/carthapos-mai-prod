import { Card, CardContent } from '../../ui/card';
import ModuleGrid from '../forms/ModuleGrid';

interface Step2ModuleSelectionProps {
  modulesByCategory: Record<string, any[]>;
  selectedModules: string[];
  onModuleToggle: (moduleId: string) => void;
  isModuleRequired: (moduleName: string) => boolean;
}

export default function Step2ModuleSelection({
  modulesByCategory, selectedModules, onModuleToggle, isModuleRequired,
}: Step2ModuleSelectionProps) {
  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="p-4">
        <ModuleGrid
          modulesByCategory={modulesByCategory}
          selectedModules={selectedModules}
          onModuleToggle={onModuleToggle}
          isModuleRequired={isModuleRequired}
        />
      </CardContent>
    </Card>
  );
}
