import React from "react";
import { createRoot } from "react-dom/client";
import SplashIntro from "./launch/SplashIntro.jsx";
import { createAppLaunchController } from "./launch/appLaunch.js";
import "./launch/splash-intro.css";

const launchController = createAppLaunchController();
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
    console.error("RIFFLAB application chunk failed to load.", error);
    launchController.markReady("app-load-error");
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="appLoadFallback" role="alert">
          <strong>JUST PLAY</strong>
          <p>앱을 준비하지 못했습니다.</p>
          <button onClick={() => window.location.reload()} type="button">다시 시도</button>
        </section>
      );
    }

    return this.props.children;
  }
}

function Root() {
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
