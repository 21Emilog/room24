// Push Notifications utility for RentMzansi
// Shows native notifications with app icon when messages arrive

const NOTIFICATION_PERMISSION_KEY = 'notification-permission-asked';

/**
 * Check if notifications are supported
 */
export function isNotificationSupported() {
  return 'Notification' in window;
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled() {
  if (!isNotificationSupported()) return false;
  return Notification.permission === 'granted';
}

/**
 * Request notification permission from user
 * @returns {Promise<boolean>} - true if permission granted
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    console.log('Notifications not supported in this browser');
    return false;
  }

  // Already granted
  if (Notification.permission === 'granted') {
    return true;
  }

  // Already denied - can't ask again
  if (Notification.permission === 'denied') {
    console.log('Notification permission was denied');
    return false;
  }

  // Request permission
  try {
    const result = await Notification.requestPermission();
    localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
    return result === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Check if we should ask for notification permission
 * (Only ask once per session, and if not already granted/denied)
 */
export function shouldAskForPermission() {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'default') return false;
  // Check if we've already asked in this session
  const asked = sessionStorage.getItem(NOTIFICATION_PERMISSION_KEY);
  return !asked;
}

/**
 * Mark that we've asked for permission this session
 */
export function markPermissionAsked() {
  sessionStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
}

/**
 * Show a notification with the app icon
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body text
 * @param {string} options.icon - Optional custom icon URL
 * @param {string} options.tag - Optional tag to group/replace notifications
 * @param {Object} options.data - Optional data to pass to click handler
 * @param {Function} options.onClick - Optional click handler
 */
export function showNotification({ title, body, icon, tag, data, onClick }) {
  if (!areNotificationsEnabled()) {
    console.log('Notifications not enabled, skipping');
    return null;
  }

  // Check if app is in foreground - only show if in background/minimized
  if (document.visibilityState === 'visible' && !document.hidden) {
    console.log('App is in foreground, skipping native notification');
    return null;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: icon || '/android-chrome-192x192.png', // App icon
      badge: '/android-chrome-192x192.png',
      tag: tag || 'rentmzansi-message',
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200], // Vibration pattern
      data: data || {},
    });

    // Handle click
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
      if (onClick) onClick(data);
    };

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
}

/**
 * Show a message notification
 * @param {Object} message - The message object
 * @param {string} senderName - Name of the sender
 * @param {Function} onNavigate - Function to navigate to messages
 */
export function showMessageNotification(message, senderName, onNavigate) {
  const messagePreview = message.content?.length > 50 
    ? message.content.substring(0, 50) + '...' 
    : message.content;

  return showNotification({
    title: `💬 New message from ${senderName}`,
    body: messagePreview || 'You have a new message',
    tag: `message-${message.conversation_id}`, // Group by conversation
    data: { 
      type: 'message', 
      conversationId: message.conversation_id,
      messageId: message.id 
    },
    onClick: () => {
      if (onNavigate) onNavigate('messages');
    }
  });
}

/**
 * Show notification when user receives a new inquiry on their listing
 */
export function showInquiryNotification(listingTitle, renterName, onNavigate) {
  return showNotification({
    title: '🏠 New Inquiry!',
    body: `${renterName} is interested in "${listingTitle}"`,
    tag: 'new-inquiry',
    data: { type: 'inquiry' },
    onClick: () => {
      if (onNavigate) onNavigate('messages');
    }
  });
}

/**
 * Initialize notification listener for visibility change
 * This helps show notifications when the app goes to background
 */
export function initNotificationListener(callback) {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // App went to background - notifications will now be shown
      callback?.('background');
    } else {
      // App came to foreground
      callback?.('foreground');
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
