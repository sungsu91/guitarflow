import App from "./App.jsx";
import DesktopLayout from "./layouts/DesktopLayout.jsx";
import "./style.css";
import "./components/brand-header.css";
import "./layouts/desktop-layout.css";
import "./components/backing-loop.css";
import "./polish.css";

export default function AppRuntime({ onReady }) {
  return (
    <DesktopLayout>
      <App onReady={onReady} />
    </DesktopLayout>
  );
}
