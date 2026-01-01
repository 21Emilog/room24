// Saved Contacts Management (like WhatsApp contacts)
// Stores tenant contacts locally for quick access

const STORAGE_KEY = 'rentmzansi_saved_contacts';

// Get all saved contacts
export function getSavedContacts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Save a new contact
export function saveContact(contact) {
  const contacts = getSavedContacts();
  
  // Check if contact with same phone already exists
  const existingIndex = contacts.findIndex(c => c.phone === contact.phone);
  
  if (existingIndex >= 0) {
    // Update existing contact
    contacts[existingIndex] = {
      ...contacts[existingIndex],
      ...contact,
      updatedAt: new Date().toISOString()
    };
  } else {
    // Add new contact
    contacts.push({
      id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: contact.name,
      phone: contact.phone,
      email: contact.email || null,
      notes: contact.notes || null,
      userId: contact.userId || null, // If linked to a user account
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  return contacts;
}

// Delete a contact
export function deleteContact(contactId) {
  const contacts = getSavedContacts();
  const filtered = contacts.filter(c => c.id !== contactId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}

// Update a contact
export function updateContact(contactId, updates) {
  const contacts = getSavedContacts();
  const index = contacts.findIndex(c => c.id === contactId);
  
  if (index >= 0) {
    contacts[index] = {
      ...contacts[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  }
  
  return contacts;
}

// Search contacts by name or phone
export function searchContacts(query) {
  if (!query || query.length < 2) return [];
  
  const contacts = getSavedContacts();
  const lowerQuery = query.toLowerCase();
  
  return contacts.filter(c => 
    c.name?.toLowerCase().includes(lowerQuery) ||
    c.phone?.includes(query)
  );
}

// Link a contact to a user account (when they sign up)
export function linkContactToUser(phone, userId) {
  const contacts = getSavedContacts();
  const index = contacts.findIndex(c => c.phone === phone);
  
  if (index >= 0) {
    contacts[index].userId = userId;
    contacts[index].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  }
  
  return contacts;
}

// Get contact by phone number
export function getContactByPhone(phone) {
  const contacts = getSavedContacts();
  return contacts.find(c => c.phone === phone) || null;
}

// Import contacts from array (for bulk import)
export function importContacts(contactsArray) {
  const existing = getSavedContacts();
  const existingPhones = new Set(existing.map(c => c.phone));
  
  const newContacts = contactsArray
    .filter(c => c.phone && !existingPhones.has(c.phone))
    .map(c => ({
      id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: c.name || 'Unknown',
      phone: c.phone,
      email: c.email || null,
      notes: c.notes || null,
      userId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  
  const all = [...existing, ...newContacts];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}

// Export all contacts
export function exportContacts() {
  return getSavedContacts();
}
