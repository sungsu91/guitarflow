import { Translation } from "./i18n/react.jsx";
import React from "react";
import { syncDocumentLanguage } from './i18n/core.js';
import { createRoot } from "react-dom/client";
import SplashIntro from "./launch/SplashIntro.jsx";
import { createAppLaunchController } from "./launch/appLaunch.js";
import "./launch/splash-intro.css";
import { keepScreenAwake } from "./ui/screenWakeLock.js";

const launchController = createAppLaunchController();
syncDocumentLanguage();
const DeferredAppRuntime = React.lazy(() => import("./AppRuntime.jsx"));

const AppRuntime = React.memo(function AppRuntime() {
  return (
    <React.Suspense fallback={null}>
      <DeferredAppRuntime onReady={launchController.markReady} />
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
  const finishLaunch = React.useCallback(() => setLaunching(false), []);

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
          onComplete={finishLaunch}
          readyPromise={launchController.readyPromise}
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
