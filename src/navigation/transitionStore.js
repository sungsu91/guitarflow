const IDLE_NAVIGATION_TRANSITION = Object.freeze({
  active: false,
  categoryId: null,
  key: "",
  mode: null,
  theme: "dark",
  token: 0,
  viewerMode: null,
});

let transitionSnapshot = IDLE_NAVIGATION_TRANSITION;
let nextTransitionToken = 0;
const transitionListeners = new Set();

function emitTransitionChange() {
  transitionListeners.forEach((listener) => listener());
}

export function subscribeNavigationTransition(listener) {
  transitionListeners.add(listener);
  return () => transitionListeners.delete(listener);
}

export function getNavigationTransitionSnapshot() {
  return transitionSnapshot;
}

export function beginNavigationTransition(target) {
  const token = nextTransitionToken + 1;
  nextTransitionToken = token;
  transitionSnapshot = Object.freeze({
    active: true,
    categoryId: target.categoryId ?? null,
    key: target.key,
    mode: target.mode,
    theme: target.theme ?? "dark",
    token,
    viewerMode: target.viewerMode ?? null,
  });
  emitTransitionChange();
  return token;
}

export function completeNavigationTransition(token) {
  if (!transitionSnapshot.active || transitionSnapshot.token !== token) return false;
  transitionSnapshot = Object.freeze({
    ...IDLE_NAVIGATION_TRANSITION,
    token,
  });
  emitTransitionChange();
  return true;
}

export function cancelNavigationTransition(token = null) {
  if (!transitionSnapshot.active) return false;
  if (token != null && transitionSnapshot.token !== token) return false;
  const canceledToken = transitionSnapshot.token;
  transitionSnapshot = Object.freeze({
    ...IDLE_NAVIGATION_TRANSITION,
    token: canceledToken,
  });
  emitTransitionChange();
  return true;
}
