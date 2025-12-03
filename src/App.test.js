import { render, screen } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  window.scrollTo = () => {};
});

beforeEach(() => {
  localStorage.clear();
});

test('renders RentMzansi branding', async () => {
  render(<App />);
  const brandElements = await screen.findAllByText(/Rent|Mzansi/i);
  expect(brandElements.length).toBeGreaterThan(0);
});

test('renders navigation buttons', async () => {
  render(<App />);
  const buttons = await screen.findAllByRole('button');
  expect(buttons.length).toBeGreaterThan(3);
});
