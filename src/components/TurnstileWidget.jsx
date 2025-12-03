import { useEffect, useRef, useCallback } from 'react';

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptLoadPromise = null;

function loadTurnstileScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }
  
  if (window.turnstile) {
    return Promise.resolve();
  }
  
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      // Script tag exists, wait for it to load
      if (window.turnstile) {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      resolve();
    };
    
    script.onerror = (err) => {
      scriptLoadPromise = null;
      reject(err);
    };
    
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export default function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = 'light',
  size = 'normal',
  className = '',
  refreshTrigger = 0,
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const mountedRef = useRef(true);
  
  // Keep callbacks in ref to avoid re-renders causing widget resets
  const callbacksRef = useRef({ onVerify, onExpire, onError });
  useEffect(() => {
    callbacksRef.current = { onVerify, onExpire, onError };
  }, [onVerify, onExpire, onError]);

  const renderWidget = useCallback(async () => {
    if (!siteKey || !containerRef.current) {
      return;
    }

    try {
      await loadTurnstileScript();
      
      if (!mountedRef.current || !window.turnstile || !containerRef.current) {
        return;
      }

      // Remove existing widget if any
      if (widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore removal errors
        }
        widgetIdRef.current = null;
      }

      // Clear the container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Render new widget
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: theme,
        size: size,
        callback: (token) => {
          if (mountedRef.current) {
            callbacksRef.current.onVerify?.(token);
          }
        },
        'expired-callback': () => {
          if (mountedRef.current) {
            callbacksRef.current.onExpire?.();
          }
        },
        'error-callback': (errorCode) => {
          if (mountedRef.current) {
            callbacksRef.current.onError?.(errorCode);
          }
        },
      });
    } catch (err) {
      console.error('Turnstile render error:', err);
      if (mountedRef.current) {
        callbacksRef.current.onError?.(err);
      }
    }
  }, [siteKey, theme, size]);

  useEffect(() => {
    mountedRef.current = true;
    renderWidget();

    return () => {
      mountedRef.current = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget, refreshTrigger]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className={className}>
      <div ref={containerRef} className="flex justify-center min-h-[65px]" />
    </div>
  );
}
