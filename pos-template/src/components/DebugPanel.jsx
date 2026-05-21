import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Copy, RefreshCw } from 'lucide-react';

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [debugInfo, setDebugInfo] = useState({
    config: null,
    database: null,
    user: null,
    modules: null,
    errors: []
  });

  // Listen for Ctrl+D to toggle debug panel
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setIsOpen(!isOpen);
        console.log('🔧 Debug panel toggled');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  // Fetch debug info
  const refreshDebugInfo = async () => {
    console.log('🔄 Refreshing debug info...');
    
    try {
      if (window.electronAPI?.getAppConfig) {
        const config = await window.electronAPI.getAppConfig();
        setDebugInfo(prev => ({ ...prev, config }));
      }

      if (window.electronAPI?.getDatabaseStats) {
        const database = await window.electronAPI.getDatabaseStats();
        setDebugInfo(prev => ({ ...prev, database }));
      }

      const user = localStorage.getItem('currentUser');
      setDebugInfo(prev => ({ ...prev, user }));

      const modules = JSON.parse(localStorage.getItem('enabledModules') || '[]');
      setDebugInfo(prev => ({ ...prev, modules }));
    } catch (error) {
      console.error('Failed to fetch debug info:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshDebugInfo();
    }
  }, [isOpen]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(JSON.stringify(text, null, 2));
    console.log('✅ Copied to clipboard');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition z-40"
        title="Debug Panel (Ctrl+D)"
      >
        <RefreshCw className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-96 bg-gray-900 text-white rounded-t-lg shadow-2xl border-t-2 border-blue-500 z-50 max-h-96 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 flex items-center justify-between border-b border-blue-700">
        <h3 className="font-bold text-lg">🔧 Debug Panel</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshDebugInfo}
            className="p-1 hover:bg-blue-700 rounded transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-blue-700 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1">
        {/* App Config */}
        <DebugSection
          title="App Configuration"
          isExpanded={expandedSection === 'config'}
          onToggle={() => setExpandedSection(expandedSection === 'config' ? null : 'config')}
          data={debugInfo.config}
        />

        {/* Database */}
        <DebugSection
          title="Database"
          isExpanded={expandedSection === 'database'}
          onToggle={() => setExpandedSection(expandedSection === 'database' ? null : 'database')}
          data={debugInfo.database}
        />

        {/* Modules */}
        <DebugSection
          title="Modules"
          isExpanded={expandedSection === 'modules'}
          onToggle={() => setExpandedSection(expandedSection === 'modules' ? null : 'modules')}
          data={debugInfo.modules}
        />

        {/* User */}
        <DebugSection
          title="Current User"
          isExpanded={expandedSection === 'user'}
          onToggle={() => setExpandedSection(expandedSection === 'user' ? null : 'user')}
          data={debugInfo.user}
        />

        {/* Tips */}
        <div className="border-t border-gray-700 p-3 text-xs text-gray-300">
          <p className="font-bold mb-2">💡 Tips:</p>
          <p>• Press <code className="bg-gray-700 px-1 rounded">Ctrl+D</code> to toggle this panel</p>
          <p>• Type <code className="bg-gray-700 px-1 rounded">window.POSDebug.status()</code> for full check</p>
          <p>• Type <code className="bg-gray-700 px-1 rounded">window.POSDebug.toggle()</code> for debug logs</p>
          <p>• Open Console (Ctrl+Shift+I) for detailed logs</p>
        </div>
      </div>
    </div>
  );
}

function DebugSection({ title, isExpanded, onToggle, data }) {
  return (
    <div className="border-b border-gray-700">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 transition flex items-center justify-between"
      >
        <span className="font-semibold text-sm">{title}</span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {isExpanded && (
        <div className="p-3 bg-gray-800/50 text-xs space-y-2 max-h-48 overflow-y-auto">
          {data ? (
            <>
              <pre className="bg-gray-900 p-2 rounded overflow-auto text-gray-300 whitespace-pre-wrap break-words">
                {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}
                className="w-full mt-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white flex items-center justify-center gap-2 transition"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </>
          ) : (
            <p className="text-gray-400">Loading...</p>
          )}
        </div>
      )}
    </div>
  );
}

export default DebugPanel;
