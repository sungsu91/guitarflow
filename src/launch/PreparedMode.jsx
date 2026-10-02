import { Activity, Suspense } from 'react';

// Reuse the real mode tree. Hidden Activity prepares DOM/state without starting
// microphone, playback, subscriptions, or a second mobile/desktop screen.
export default function PreparedMode({ activity, mode, children, fallback = null }) {
  return (
    <Activity mode={activity}>
      <Suspense fallback={fallback}>
        {children}
        <span hidden data-prepared-mode={mode} />
      </Suspense>
    </Activity>
  );
}
