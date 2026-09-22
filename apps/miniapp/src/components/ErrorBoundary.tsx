import { Component, type ReactNode } from 'react';
import { StatusView } from './StatusView';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Không có boundary này thì bất kỳ lỗi render nào (kể cả trong một nhánh sâu)
// làm React gỡ trắng toàn bộ #app — người dùng thấy màn hình đen, không dấu vết.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('[app] Uncaught render error', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <StatusView
          title="Đã có lỗi xảy ra"
          message="Ứng dụng gặp sự cố khi hiển thị. Vui lòng tải lại."
          action={{ label: 'Tải lại', onClick: () => window.location.reload() }}
        />
      );
    }
    return this.props.children;
  }
}
