import assert from 'node:assert/strict';
import test from 'node:test';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { StatusView } from '../src/components/StatusView';

test('error boundary renders children when nothing has thrown', () => {
  const boundary = new ErrorBoundary({ children: 'child content' });

  assert.equal(boundary.state.hasError, false);
  assert.equal(boundary.render(), 'child content');
});

test('getDerivedStateFromError flips the boundary into its error state', () => {
  assert.deepEqual(ErrorBoundary.getDerivedStateFromError(), { hasError: true });
});

test('error boundary shows a reload action instead of leaving the screen blank', () => {
  const boundary = new ErrorBoundary({ children: 'child content' });
  boundary.state = { hasError: true };

  const fallback = boundary.render();

  assert.equal(fallback.type, StatusView);
  assert.equal(fallback.props.title, 'Đã có lỗi xảy ra');
  assert.equal(fallback.props.action.label, 'Tải lại');
  assert.equal(typeof fallback.props.action.onClick, 'function');
});
