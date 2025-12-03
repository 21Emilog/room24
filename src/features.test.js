import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  window.scrollTo = () => {};
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ features: [] }) }));
});

beforeEach(() => {
  localStorage.clear();
});

test('search input is present', async () => {
  render(<App />);
  const searchInput = await screen.findByPlaceholderText(/Search/i);
  expect(searchInput).toBeInTheDocument();
});

test('clicking List Room shows auth or form', async () => {
  render(<App />);
  const listBtns = await screen.findAllByRole('button', { name: /List Room/i });
  fireEvent.click(listBtns[0]);
  // Should show auth modal or listing form - use findAll since there can be multiple matches
  const authElements = await screen.findAllByText(/Sign In|Create Your Account|Title/i);
  expect(authElements.length).toBeGreaterThan(0);
});

test('navigation buttons are present', async () => {
  render(<App />);
  const buttons = await screen.findAllByRole('button');
  expect(buttons.length).toBeGreaterThan(2);
});
