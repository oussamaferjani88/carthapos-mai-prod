import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log to console with full details
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ ERROR BOUNDARY CAUGHT AN ERROR');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Error Message:', error?.message);
    console.error('Error Stack:', error?.stack);
    console.error('Component Stack:', errorInfo?.componentStack);
    console.error('Error Count:', this.state.errorCount + 1);
    console.error('═══════════════════════════════════════════════════════════');

    // Try to log to main process for file logging
    if (window.electronAPI?.invoke) {
      window.electronAPI.invoke('log-error', {
        message: error?.message,
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString()
      }).catch(err => console.error('Failed to log to main process:', err));
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.hash = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full border-l-4 border-red-500 p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-red-600">Application Error</h1>
                <p className="text-sm text-gray-600">Something went wrong in the application</p>
              </div>
            </div>

            {/* Error Details */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 max-h-64 overflow-auto">
              <p className="font-mono text-sm text-red-800 break-words whitespace-pre-wrap">
                {this.state.error?.message}
              </p>
            </div>

            {/* Stack Trace */}
            {this.state.errorInfo && (
              <details className="mb-4 cursor-pointer">
                <summary className="font-semibold text-gray-700 hover:text-gray-900 py-2">
                  📋 Technical Details (Click to expand)
                </summary>
                <div className="mt-2 bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-auto max-h-48 font-mono">
                  <p className="text-red-400 mb-2">Stack Trace:</p>
                  <p className="whitespace-pre-wrap">{this.state.error?.stack}</p>
                  <p className="text-blue-400 mt-4 mb-2">Component Stack:</p>
                  <p className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</p>
                </div>
              </details>
            )}

            {/* Error Count */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Errors Caught:</strong> {this.state.errorCount}
                {this.state.errorCount > 3 && (
                  <span className="ml-2 text-red-600">⚠️ Multiple errors detected. Please check console.</span>
                )}
              </p>
            </div>

            {/* Debug Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Debug Tip:</strong> Press <code className="bg-blue-100 px-2 py-1 rounded">Ctrl+Shift+I</code> to open DevTools and check the Console for detailed logs.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleHome}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Reload App
              </button>
            </div>

            {/* Footer */}
            <p className="text-xs text-gray-500 mt-4 text-center">
              If the problem persists, please check the console logs (Ctrl+Shift+I) and report the error.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
