/**
 * Anti-Tampering & Console Protection for RentMzansi
 * Prevents console attacks, debugging, and code tampering
 */

(function() {
  
  // Only apply in production
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  // ===========================
  // 1. DISABLE CONSOLE IN PRODUCTION
  // ===========================
  
  const noop = () => {};
  
  // Store original console for internal use if needed
  const _console = { ...console };
  
  // Disable console methods
  if (typeof window !== 'undefined') {
    window.console = {
      log: noop,
      warn: noop,
      error: noop,
      info: noop,
      debug: noop,
      table: noop,
      trace: noop,
      dir: noop,
      dirxml: noop,
      group: noop,
      groupEnd: noop,
      groupCollapsed: noop,
      clear: noop,
      count: noop,
      countReset: noop,
      assert: noop,
      profile: noop,
      profileEnd: noop,
      time: noop,
      timeEnd: noop,
      timeLog: noop,
      timeStamp: noop,
    };
  }

  // ===========================
  // 2. DETECT DEVTOOLS OPEN
  // ===========================
  
  let devtoolsOpen = false;
  const threshold = 160;
  
  const detectDevTools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        onDevToolsOpen();
      }
    } else {
      devtoolsOpen = false;
    }
  };
  
  const onDevToolsOpen = () => {
    // Log attempt (you could send this to your server)
    // Show warning
    document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div style="font-size: 64px; margin-bottom: 20px;">🛡️</div>
        <h1 style="font-size: 24px; margin-bottom: 10px;">Security Alert</h1>
        <p style="color: #888; max-width: 400px;">
          Developer tools detected. For security reasons, 
          please close developer tools to continue using RentMzansi.
        </p>
        <button onclick="window.location.reload()" style="
          margin-top: 20px;
          padding: 12px 24px;
          background: #E63946;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
        ">
          Reload Page
        </button>
      </div>
    `;
  };
  
  // Check periodically
  setInterval(detectDevTools, 1000);
  
  // ===========================
  // 3. DISABLE RIGHT-CLICK
  // ===========================
  
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
  
  // ===========================
  // 4. DISABLE KEYBOARD SHORTCUTS
  // ===========================
  
  document.addEventListener('keydown', (e) => {
    // F12 - DevTools
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+I - DevTools
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+J - Console
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+Shift+C - Element picker
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+U - View source
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      return false;
    }
    
    // Ctrl+S - Save page
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      return false;
    }
  });
  
  // ===========================
  // 5. DETECT DEBUGGER STATEMENTS
  // ===========================
  
  // This runs continuously and will trigger if someone uses debugger
  const antiDebug = () => {
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const end = performance.now();
    
    // If debugger paused execution, more than 100ms passed
    if (end - start > 100) {
      onDevToolsOpen();
    }
  };
  
  // Run anti-debug check periodically (less frequently to avoid performance issues)
  setInterval(antiDebug, 5000);
  
  // ===========================
  // 6. PROTECT AGAINST PROTOTYPE POLLUTION
  // ===========================
  
  // Freeze Object prototype to prevent pollution attacks
  if (Object.freeze) {
    Object.freeze(Object.prototype);
  }
  
  // ===========================
  // 7. INTEGRITY CHECK
  // ===========================
  
  // Check if critical functions have been tampered with
  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest;
  
  const checkIntegrity = () => {
    if (window.fetch !== originalFetch) {
      _console.warn('Fetch has been tampered with!');
      window.fetch = originalFetch;
    }
    if (window.XMLHttpRequest !== originalXHR) {
      _console.warn('XMLHttpRequest has been tampered with!');
      window.XMLHttpRequest = originalXHR;
    }
  };
  
  setInterval(checkIntegrity, 3000);
  
  // ===========================
  // 8. PREVENT IFRAME EMBEDDING
  // ===========================
  
  if (window.self !== window.top) {
    // We're in an iframe - break out
    window.top.location = window.self.location;
  }

})();

// Export empty object for module compatibility
const antiTamper = {};
export default antiTamper;
