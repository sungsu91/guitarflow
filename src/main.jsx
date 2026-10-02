import "./metronome/modePanel.css";
import "./layouts/tablet-layer-order.css";
import { Translation } from "./i18n/react.jsx";
import React from "react";
import { syncDocumentLanguage } from './i18n/core.js';
import { createRoot } from "react-dom/client";
import SplashIntro from "./launch/SplashIntro.jsx";
import { createAppLaunchController } from "./launch/appLaunch.js";
import { prepareInitialSurface } from "./launch/prepareInitialSurface.js";
import { observeAppResume } from "./launch/appResume.js";
import "./launch/splash-intro.css";
import { keepScreenAwake } from "./ui/screenWakeLock.js";

const launchController = createAppLaunchController();
syncDocumentLanguage();
const DeferredAppRuntime = React.lazy(() => import("./AppRuntime.jsx"));

let preparingInitialSurface = false;
function prepareRuntimeForLaunch(modePreparation) {
  if (preparingInitialSurface) return;
  preparingInitialSurface = true;
  void Promise.resolve(modePreparation).catch(() => undefined)
    .then(() => prepareInitialSurface({ root: document.querySelector('.appRuntime') })).then(
    () => launchController.markReady('initial-surface-ready'),
    () => launchController.markReady('initial-surface-preparation-skipped'),
  );
}

const AppRuntime = React.memo(function AppRuntime() {
  return (
    <React.Suspense fallback={null}>
      <DeferredAppRuntime onReady={prepareRuntimeForLaunch} />
    </React.Suspense>
  );
});

class AppLoadBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("FRETIVA LAB application chunk failed to load.", error);
    launchController.markReady("app-load-error");
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="appLoadFallback" role="alert">
          <strong><Translation id="originalUi.fretivaLab" /></strong>
          <p><Translation id="main.couldnTLoadTheApp" /></p>
          <button onClick={() => window.location.reload()} type="button"><Translation id="main.tryAgain" /></button>
        </section>
      );
    }

    return this.props.children;
  }
}

function Root() {
  React.useEffect(() => keepScreenAwake(), []);
  const [launching, setLaunching] = React.useState(true);
  const [launchSession, setLaunchSession] = React.useState(() => ({ id: 0, readyPromise: launchController.readyPromise }));
  const launchingRef = React.useRef(true);
  const finishLaunch = React.useCallback(() => {
    launchingRef.current = false;
    setLaunching(false);
  }, []);

  React.useEffect(() => observeAppResume({ onResume() {
    if (launchingRef.current || document.documentElement.classList.contains('app-is-theme-loading')) return;
    launchingRef.current = true;
    setLaunching(true);
    const readyPromise = prepareInitialSurface({ root: document.querySelector('.appRuntime') });
    setLaunchSession(current => ({ id: current.id + 1, readyPromise }));
  } }), []);

  React.useLayoutEffect(() => {
    document.documentElement.classList.toggle("app-is-launching", launching);
    return () => document.documentElement.classList.remove("app-is-launching");
  }, [launching]);

  return (
    <>
      <div
        aria-hidden={launching || undefined}
        className={`appRuntime ${launching ? "appRuntime--launching" : ""}`}
        inert={launching}
      >
        <AppLoadBoundary>
          <AppRuntime />
        </AppLoadBoundary>
      </div>
      {launching ? (
        <SplashIntro
          key={launchSession.id}
          onComplete={finishLaunch}
          readyPromise={launchSession.readyPromise}
        />
      ) : null}
    </>
  );
}

const rootElement = document.getElementById("root");
const root = import.meta.env.DEV && window.__RIFFLAB_REACT_ROOT__
  ? window.__RIFFLAB_REACT_ROOT__
  : createRoot(rootElement);

if (import.meta.env.DEV) window.__RIFFLAB_REACT_ROOT__ = root;

root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
