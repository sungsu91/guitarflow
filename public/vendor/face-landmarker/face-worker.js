// Classic worker: the MediaPipe WASM loader uses importScripts.
self.exports = {};
importScripts('./vision_bundle.js');
let landmarker;
self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    try {
      const root = new URL('./', self.location.href).href;
      const { FaceLandmarker, FilesetResolver } = self.exports;
      landmarker = await FaceLandmarker.createFromOptions(await FilesetResolver.forVisionTasks(root), {
        baseOptions: { modelAssetPath: root + 'face_landmarker.task', delegate: 'CPU' },
        runningMode: 'VIDEO', numFaces: 1,
        minFaceDetectionConfidence: 0.6, minFacePresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
        outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
      });
      self.postMessage({ type: 'ready' });
    } catch { self.postMessage({ type: 'unavailable' }); }
  } else if (data.type === 'frame') {
    try {
      const started = performance.now();
      const points = landmarker.detectForVideo(data.bitmap, data.timestamp).faceLandmarks[0];
      self.postMessage({ type: 'face', points: points ? [132, 361, 172, 397, 1, 33, 133, 362, 263, 145, 374, 152].map(i => ({ x: points[i].x, y: points[i].y, z: points[i].z })) : null, elapsed: performance.now() - started });
    } catch { self.postMessage({ type: 'unavailable' }); }
    finally { data.bitmap.close(); }
  }
};
