/**
 * Step 2: Module Selection
 * Display and manage module selection
 */

import ModuleGrid from '../forms/ModuleGrid';

export default function Step2ModuleSelection({
  modulesByCategory,
  selectedModules,
  onModuleToggle,
  isModuleRequired,
}) {
  return (
    <ModuleGrid
      modulesByCategory={modulesByCategory}
      selectedModules={selectedModules}
      onModuleToggle={onModuleToggle}
      isModuleRequired={isModuleRequired}
    />
  );
}
