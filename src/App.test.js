import { render, screen } from '@testing-library/react';
import App from './App';

test('renders at least one brand marker RentMzansi', () => {
  render(<App />);
  const brands = screen.getAllByText(/RentMzansi/i);
  expect(brands.length).toBeGreaterThan(0);
});
