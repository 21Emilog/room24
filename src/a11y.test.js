import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  window.scrollTo = () => {};
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ features: [] }) }));
});

beforeEach(() => {
  localStorage.clear();
});

test('app renders without crashing', async () => {
  render(<App />);
  // App should render buttons
  const buttons = await screen.findAllByRole('button');
  expect(buttons.length).toBeGreaterThan(0);
});

test('app renders under 3000ms', () => {
  const start = performance.now();
  render(<App />);
  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(3000);
});
