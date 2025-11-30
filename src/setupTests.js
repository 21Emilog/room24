// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import React from 'react';
import '@testing-library/jest-dom';

jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
// Mock firebase utilities to avoid real network / browser API usage in Jest
jest.mock('./firebase', () => ({
	initFirebase: () => ({ mock: true }),
	initAnalytics: () => {},
	requestFcmToken: async () => null,
	listenForegroundMessages: () => {},
	trackEvent: () => {}
}));
