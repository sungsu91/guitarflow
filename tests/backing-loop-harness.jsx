import React from "react";
import { createRoot } from "react-dom/client";
import BackingLoop from "../src/components/BackingLoop";
import "../src/components/backing-loop.css";

function createSilentWavBlob(durationSeconds = 2.72, sampleRate = 8_000) {
  const sampleCount = Math.floor(durationSeconds * sampleRate);
  const bytesPerSample = 2;
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset, text) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);
  return new Blob([buffer], { type: "audio/wav" });
}

class HarnessMediaRecorder {
  static isTypeSupported() {
    return false;
  }

  constructor() {
    this.mimeType = "audio/wav";
    this.state = "inactive";
    this.ondataavailable = null;
    this.onerror = null;
    this.onstop = null;
  }

  start() {
    this.state = "recording";
  }

  stop() {
    if (this.state === "inactive") return;
    this.state = "inactive";
    this.ondataavailable?.({ data: createSilentWavBlob() });
    this.onstop?.();
  }
}

Object.defineProperty(window.navigator, "mediaDevices", {
  configurable: true,
  value: {
    getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
  },
});
window.MediaRecorder = HarnessMediaRecorder;

function Harness() {
  return (
    <main className="app theme-brand backingLoopHarness">
      <BackingLoop mobile />
    </main>
  );
}

const style = document.createElement("style");
style.textContent = `
  html, body, #root { min-height: 100%; margin: 0; }
  body {
    display: grid;
    place-items: start center;
    background: #0b0f12;
    font-family: Inter, system-ui, sans-serif;
  }
  .backingLoopHarness {
    box-sizing: border-box;
    width: min(100%, 390px);
    padding: 24px 17px;
  }
`;
document.head.append(style);

window.__riffLabBackingLoopHarnessRoot ??= createRoot(document.getElementById("root"));
window.__riffLabBackingLoopHarnessRoot.render(<Harness />);
