import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h1>
            <p className="text-gray-500 mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-500 hover:from-[#E63946] hover:to-[#c5303c] text-white rounded-xl font-semibold shadow-md transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-6 p-4 bg-red-50 rounded-xl text-left">
                <p className="text-xs font-mono text-red-600 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
