import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

// Simple fetch mock to avoid network calls in effects
beforeAll(() => {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ features: [] }) }));
});

beforeEach(() => {
  localStorage.clear();
});

function seedLandlordUser() {
  const user = {
    id: 'user-test',
    type: 'landlord',
    name: 'Test Landlord',
    phone: '+27123456789',
    email: 'landlord@test.local',
    photo: '',
    landlordComplete: true,
    notificationPrefs: { updates: true, marketing: false },
    createdAt: new Date().toISOString()
  };
  localStorage.setItem('current-user', JSON.stringify(user));
  localStorage.setItem('users', JSON.stringify([user]));
  return user;
}

function seedListings() {
  const listings = [
    {
      id: 'listing-a',
      title: 'Sample Premium Verified Listing',
      price: 3000,
      location: 'Soweto, Johannesburg',
      description: 'Nice place',
      photos: [],
      status: 'available',
      amenities: ['WiFi'],
      landlordId: 'user-test',
      landlordName: 'Test Landlord',
      landlordPhone: '+27123456789',
      landlordEmail: 'landlord@test.local',
      landlordPhoto: '',
      landlordVerified: true,
      premium: true,
      createdAt: new Date().toISOString()
    }
  ];
  localStorage.setItem('listings', JSON.stringify(listings));
  return listings;
}

// Report Modal Test

test('report modal opens and persists a report', async () => {
  seedLandlordUser();
  seedListings();
  render(<App />);
  // Open listing detail by clicking title
  const card = await screen.findByText('Sample Premium Verified Listing');
  fireEvent.click(card);
  // Open report modal
  const reportBtn = await screen.findByText(/Report Listing/i);
  fireEvent.click(reportBtn);
  // Select a reason
  const reasonRadio = await screen.findByLabelText('Fraud / Scam');
  fireEvent.click(reasonRadio);
  // Submit
  const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
  fireEvent.click(submitBtn);
  // Confirm localStorage has reports
  await act(async () => Promise.resolve());
  const reportsRaw = localStorage.getItem('reports');
  expect(reportsRaw).toBeTruthy();
  const reports = JSON.parse(reportsRaw);
  const firstKey = Object.keys(reports)[0];
  expect(reports[firstKey][0].reason).toBe('Fraud / Scam');
});

// Saved Searches Test (mobile layout path)

test('saved search creates a chip', async () => {
  seedLandlordUser();
  seedListings();
  // Force mobile layout
  global.innerWidth = 375;
  render(<App />);
  // Click Save Search button (mobile)
  const saveBtn = await screen.findByRole('button', { name: /Save Search/i });
  fireEvent.click(saveBtn);
  // Chip should appear containing Any • or location label
  const chip = await screen.findByText(/Any • 0-10000|Soweto/i);
  expect(chip).toBeInTheDocument();
});

// Notification Preferences Toggle Test

test('notification prefs toggling updates localStorage', async () => {
  seedLandlordUser();
  seedListings();
  render(<App />);
  // Multiple profile buttons (header icon + bottom nav). Click all until checkbox appears.
  const profileButtons = screen.getAllByRole('button', { name: /Profile/i });
  profileButtons.forEach(btn => fireEvent.click(btn));
  const marketingCheckbox = await screen.findByLabelText(/Occasional feature & promotion emails/i);
  expect(marketingCheckbox).toBeInTheDocument();
  expect(marketingCheckbox.checked).toBe(false);
  fireEvent.click(marketingCheckbox);
  const storedUser = JSON.parse(localStorage.getItem('current-user'));
  expect(storedUser.notificationPrefs.marketing).toBe(true);
});

// Premium & Verified Badge Smoke Test (listing card)

test('premium and verified badges render on listing card', async () => {
  seedLandlordUser();
  seedListings();
  render(<App />);
  const premiumBadge = await screen.findByText(/Premium/i);
  expect(premiumBadge).toBeInTheDocument();
  const verifiedBadges = screen.getAllByText(/Verified/i);
  // Ensure at least one verified badge element (exclude marketing tagline by checking class if possible)
  expect(verifiedBadges.length).toBeGreaterThan(0);
});

// Offline snapshot test: mock service worker postMessage when adding a listing

test('offline snapshot postMessage fires on listing add', async () => {
  const user = seedLandlordUser();
  seedListings();
  const postMessage = jest.fn();
  global.navigator.serviceWorker = { controller: { postMessage } };
  render(<App />);
  // Navigate to add listing (button likely labelled List Room)
  const listRoomBtn = screen.getByRole('button', { name: /List Room/i });
  fireEvent.click(listRoomBtn);
  // Fill minimal required fields
  const titleInput = await screen.findByPlaceholderText(/Cozy backroom|e\.g\., Cozy backroom with bathroom/i);
  fireEvent.change(titleInput, { target: { value: 'New Test Listing' } });
  const priceInput = screen.getByPlaceholderText(/2500|e\.g\., 2500/i);
  fireEvent.change(priceInput, { target: { value: '2800' } });
  const locationInput = await screen.findByPlaceholderText(/Type the full street/i);
  fireEvent.change(locationInput, { target: { value: '5170 Molefe St, Ivory Park, Midrand, 1693' } });
  // Submit
  const submitBtn = screen.getByRole('button', { name: /Post Room/i });
  fireEvent.click(submitBtn);
  // Wait a tick
  await act(async () => Promise.resolve());
  expect(postMessage).toHaveBeenCalled();
  const callArg = postMessage.mock.calls[0][0];
  expect(callArg.type).toBe('SYNC_LISTINGS');
  expect(Array.isArray(callArg.payload)).toBe(true);
});

test('add listing form rehydrates from saved template and persists edits', async () => {
  const user = seedLandlordUser();
  seedListings();
  const templateKey = `landlord-listing-template-${user.id}`;
  const template = {
    title: 'Saved Template Title',
    price: '3200',
    streetAddress: '5170 Molefe St',
    location: 'Ivory Park, Midrand, 1693',
    description: 'Existing description'
  };
  localStorage.setItem(templateKey, JSON.stringify(template));

  render(<App />);
  const listRoomBtn = screen.getByRole('button', { name: /List Room/i });
  fireEvent.click(listRoomBtn);

  const titleInput = await screen.findByDisplayValue(template.title);
  expect(titleInput).toBeInTheDocument();
  expect(screen.getByDisplayValue(template.price)).toBeInTheDocument();
  expect(screen.getByDisplayValue(/Ivory Park/i)).toBeInTheDocument();

  fireEvent.change(titleInput, { target: { value: 'Updated Template Title' } });
  await act(async () => Promise.resolve());

  const storedTemplate = JSON.parse(localStorage.getItem(templateKey));
  expect(storedTemplate.title).toBe('Updated Template Title');
  expect(storedTemplate.photos).toBeUndefined();
});
