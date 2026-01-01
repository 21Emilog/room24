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
});

beforeEach(() => {
  localStorage.clear();
});

test('renders RentMzansi branding', async () => {
  render(<AppWithProviders />);
  const brandElements = await screen.findAllByText(/Rent|Mzansi/i);
  expect(brandElements.length).toBeGreaterThan(0);
});

test('renders navigation buttons', async () => {
  render(<AppWithProviders />);
  const buttons = await screen.findAllByRole('button');
  expect(buttons.length).toBeGreaterThan(3);
});
