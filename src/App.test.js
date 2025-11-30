import { render, screen } from '@testing-library/react';
import App from './App';

test('renders at least one brand marker Room24', () => {
  render(<App />);
  const brands = screen.getAllByText(/Room24/i);
  expect(brands.length).toBeGreaterThan(0);
});
