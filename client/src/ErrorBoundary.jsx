import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <span className="text-4xl mb-4">⚠️</span>
          <h2 className="text-xl font-bold text-surface-100 mb-2">Something went wrong</h2>
          <p className="text-sm text-surface-400 mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
