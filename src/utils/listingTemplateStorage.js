const TEMPLATE_PREFIX = 'landlord-listing-template-';

export function loadListingTemplate(landlordId) {
  if (!landlordId) return null;
  try {
    const raw = localStorage.getItem(`${TEMPLATE_PREFIX}${landlordId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.warn('Failed to load listing template', error);
    return null;
  }
}

export function saveListingTemplate(landlordId, template) {
  if (!landlordId || !template) return;
  try {
    const { photos, ...persistable } = template;
    localStorage.setItem(`${TEMPLATE_PREFIX}${landlordId}`, JSON.stringify(persistable));
  } catch (error) {
    console.warn('Failed to save listing template', error);
  }
}

export function clearListingTemplate(landlordId) {
  if (!landlordId) return;
  try {
    localStorage.removeItem(`${TEMPLATE_PREFIX}${landlordId}`);
  } catch (error) {
    console.warn('Failed to clear listing template', error);
  }
}
