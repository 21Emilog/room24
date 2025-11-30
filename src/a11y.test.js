import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  // Silence scrollTo not implemented warnings
  window.scrollTo = () => {};
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ features: [] }) }));
});

beforeEach(() => {
  localStorage.clear();
});

function seedUser() {
  const user = {
    id: 'user-a11y',
    type: 'landlord',
    name: 'A11y Landlord',
    phone: '+27000000000',
    email: 'a11y@test.local',
    landlordComplete: true,
    notificationPrefs: { updates: true, marketing: false },
    createdAt: new Date().toISOString()
  };
  localStorage.setItem('current-user', JSON.stringify(user));
  localStorage.setItem('users', JSON.stringify([user]));
  return user;
}

function seedListingWithPhoto() {
  const listing = {
    id: 'listing-photo',
    title: 'Accessible Listing',
    price: 2500,
    location: 'Cape Town, South Africa',
    description: 'A description here',
    photos: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'],
    status: 'available',
    amenities: ['WiFi'],
    landlordId: 'user-a11y',
    landlordName: 'A11y Landlord',
    landlordPhone: '+27000000000',
    landlordEmail: 'a11y@test.local',
    landlordPhoto: '',
    landlordVerified: true,
    premium: true,
    createdAt: new Date().toISOString()
  };
  localStorage.setItem('listings', JSON.stringify([listing]));
  return listing;
}

// Image alt attributes

test('listing image has alt attribute', async () => {
  seedUser();
  seedListingWithPhoto();
  render(<App />);
  const img = await screen.findByAltText(/Room|Accessible Listing|Room Details?/i);
  expect(img).toBeInTheDocument();
  expect(img.getAttribute('alt')).toBeTruthy();
});

// Report modal focus cycle

test('report modal controls are focusable', async () => {
  seedUser();
  seedListingWithPhoto();
  render(<App />);
  // Open details
  const cardTitle = await screen.findByText('Accessible Listing');
  fireEvent.click(cardTitle);
  const reportBtn = await screen.findByText(/Report Listing/i);
  fireEvent.click(reportBtn);
  const firstRadio = await screen.findByLabelText('Fraud / Scam');
  expect(firstRadio).toBeInTheDocument();
  firstRadio.focus();
  expect(firstRadio).toHaveFocus();
  const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
  cancelBtn.focus();
  expect(cancelBtn).toHaveFocus();
});

// Basic performance baseline (non-strict threshold)

test('app renders under 3000ms baseline', () => {
  seedUser();
  seedListingWithPhoto();
  const start = performance.now();
  render(<App />);
  const elapsed = performance.now() - start;
  // Allow generous headroom in CI
  expect(elapsed).toBeLessThan(3000);
});
