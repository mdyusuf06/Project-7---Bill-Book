/**
 * Lightweight tactile haptic feedback using the Web Vibration API.
 * Gracefully no-ops on desktop browsers or unsupported iOS Safari devices.
 */
function canVibrate(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
}

export function triggerHaptic(
  pattern: 'tap' | 'remove' | 'success' | 'warning',
  enabled = true
): void {
  if (!enabled || !canVibrate()) return;

  try {
    switch (pattern) {
      case 'tap':
        navigator.vibrate(14);
        break;
      case 'remove':
        navigator.vibrate(8);
        break;
      case 'success':
        navigator.vibrate([22, 45, 38]);
        break;
      case 'warning':
        navigator.vibrate([25, 30, 25]);
        break;
    }
  } catch {
    // Ignore errors in restricted browser contexts
  }
}

