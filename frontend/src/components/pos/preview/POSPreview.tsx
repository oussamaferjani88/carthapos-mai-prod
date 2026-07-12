import { useState } from 'react';
import { POSNavbar } from './POSNavbar';
import { POSContent } from './POSContent';
import { POSHeader } from './POSHeader';
import { POSConfiguration } from '../../../config/POSConfiguration';

interface POSPreviewProps {
  configuration?: Record<string, any>;
  modules?: string[];
  navbarPosition?: string;
  isDragMode?: boolean;
  onComponentSelect?: (name: string) => void;
}

const POSPreview = ({ configuration = {}, modules = [], navbarPosition = 'left', isDragMode = false, onComponentSelect }: POSPreviewProps) => {
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [notification, setNotification] = useState<string | null>(null);

  const config = POSConfiguration.createConfig({ navbarPosition, isPreviewMode: true, ...configuration });
  const styles = POSConfiguration.getStyles(config);
  const glassEffect = POSConfiguration.getGlassEffect(config);

  const isVisible = (componentId: string) => true;

  return (
    <div className="pos-preview h-full w-full bg-background overflow-hidden" style={{
      maxHeight: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column',
      margin: 0, padding: 0, boxSizing: 'border-box',
      ...POSConfiguration.getStyleVars(config), ...styles.container,
      fontFamily: config.fontFamily, fontSize: config.fontSize, fontWeight: config.fontWeight,
      transition: config.animations ? 'all 0.2s ease-in-out' : 'none',
    }}>
      <div className="flex-1 w-full flex" style={{
        flexDirection: config.navbarPosition === 'top' ? 'column' : config.navbarPosition === 'right' ? 'row-reverse' : 'row',
        position: 'relative', maxHeight: '100%', maxWidth: '100%', height: '100%',
        margin: 0, padding: 0, boxSizing: 'border-box', transition: styles.animation,
      }}>
        <POSNavbar config={config} isNavbarCollapsed={isNavbarCollapsed} setIsNavbarCollapsed={setIsNavbarCollapsed}
          activePage={activePage} setActivePage={setActivePage} modules={modules} isDragMode={isDragMode}
          onComponentSelect={onComponentSelect} isVisible={isVisible} />

        <div className="flex-1 flex flex-col min-w-0">
          <POSHeader config={config} isNavbarCollapsed={isNavbarCollapsed} setIsNavbarCollapsed={setIsNavbarCollapsed} />
          <POSContent config={config} activePage={activePage} modules={modules} notification={notification}
            setNotification={setNotification} isDragMode={isDragMode} onComponentSelect={onComponentSelect} isVisible={isVisible} />
        </div>
      </div>
    </div>
  );
};

export default POSPreview;
