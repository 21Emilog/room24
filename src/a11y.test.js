import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';

const AppWithProviders = () => (
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

beforeAll(() => {
  window.scrollTo = () => {};
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ features: [] }) }));
});

beforeEach(() => {
  localStorage.clear();
});

test('app renders without crashing', async () => {
  render(<AppWithProviders />);
  // App should render buttons
  const buttons = await screen.findAllByRole('button');
  expect(buttons.length).toBeGreaterThan(0);
});

test('app renders under 3000ms', () => {
  const start = performance.now();
  render(<AppWithProviders />);
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(3000);
});
