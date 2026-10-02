# Cloud sanctuary background video

## Current approved app version

On 2026-10-02 the user approved the new **16-second desktop V3 / mobile V2**
cloud compositions and asked to install them and continue to the desert map.
Active videos are `public/assets/shooter/desktop-maps/02-cloud-sanctuary-motion-v3.mp4`
(1920x1080) and `public/assets/maps/above-the-clouds/above-the-clouds-motion-v2.mp4`
(854x1844), both 24 fps. Playback is shared; UI compositions remain separate.
See `docs/basic-map-motion.md` and `work/basic-map-motion/above-the-clouds/`.
The eight-second file below is archived unchanged, not the active catalog entry.

## Previous eight-second version

The desktop cloud sanctuary map previously used the silent **eight-second** 1920×1080 H.264 loop at 24 fps, restored at the user's request on 2026-10-02 before approval of the new sixteen-second version. Its archived file is `public/assets/shooter/desktop-maps/02-cloud-sanctuary-loop.mp4` (9,713,196 bytes).

The restored file is an exact copy of `work/cloud-sanctuary-video/loop-v4.mp4`, SHA256 `93156D0B95FCEAA6C76AA7A63BAC6F3DCB8CC770087AE386F35EB86C370AEF40`. This version uses procedural cloud, foliage and waterfall motion, with fixed architecture. It is not AI-generated footage. The app URL includes `?v=8s-v4-93156d0b` so the replaced six-second file is not reused from a browser cache. The existing eight-second preview is `work/cloud-sanctuary-video/preview.html`.

## Archived six-second local AI experiment (not used in the app)

The six-second experiment was generated locally with the public Lightricks LTX-Video 2B 0.9.8 distilled model on an NVIDIA RTX 3060 12GB. Its motion was too subtle to meet the user's expectations, and it must not replace the selected eight-second version. It remains at `work/cloud-sanctuary-local/outputs/final-loop/cloud-sanctuary-ai-loop.mp4`. Inference ran offline. No paid service, subscription, cloud inference, or additional image upload was used.

The native AI output is 768×432, 161 frames at 24 fps. This is not native 1080p AI footage. It uses the original map as both the first and last image condition, seed `20261003`, and a prompt for thin distant clouds drifting gently sideways while the camera, architecture, exposure and sunset stay fixed. A candidate with large rising clouds was rejected during visual review.

For the map, the AI cloud/waterfall regions are enlarged and composited with the original high-resolution architecture, terrace and islands. The final export is 1920×1080. Foreground foliage remains part of the still architecture layer. Broad color matching preserves the sunset palette. No displacement field or image-stretch animation is used in this version.

The first and last 17 frames overlap with a smooth transition. The result contains 144 frames, exactly six seconds, without reverse playback. Before encoding, the boundary RGB change is 0.0919/255 versus a mean adjacent-frame change of 0.1013/255 (0.91×). The fixed foreground floor has zero temporal or boundary change. These are continuity checks, not a guarantee that every generated detail is perfect.

## Playback

The browser's native decoder operates independently of the game clock. It pauses during game pause, skin selection, page invisibility, viewport exit and component cleanup. Reduced-motion or data-saver preferences keep the static image. Decode or unsupported-media failures fall back to the PNG. Temporary autoplay-policy rejections and interrupted play requests keep the video mounted and retry on a pointer/key gesture, media readiness, page restoration or visibility change. Pending play requests are coalesced, and these recovery events still respect intentional pauses. Desktop controls placement; mobile layouts and other map images are unchanged.

The approximately 11.74GB of model weights and Python/CUDA environment live only in the ignored `work/cloud-sanctuary-local` folder. They are not bundled into the app. App users download the selected composition's MP4 (current desktop V3 approximately 7.2MB; mobile V2 approximately 4.6MB).

## Archived AI reproduction and review

The prepared Python environment is `work/cloud-sanctuary-local/venv/Scripts/python.exe`.

```powershell
& .\work\cloud-sanctuary-local\venv\Scripts\python.exe work/cloud-sanctuary-local/generate_local.py --width 768 --height 432 --frames 161 --seed 20261003 --name final-ai-v2
& .\work\cloud-sanctuary-local\venv\Scripts\python.exe work/cloud-sanctuary-local/finish_loop.py final-ai-v2
```

The scripts stage model loading to reduce RAM/VRAM pressure, use local safetensors, and disable Hugging Face network access during inference. The accepted generation took approximately 106 seconds after installation. Model sizes and verified SHA256 values are recorded in `work/cloud-sanctuary-local/model-manifest.json`; installed dependencies are in `requirements-installed.txt` there.

Review `work/cloud-sanctuary-local/preview.html` through the development server. It provides original-image comparison, AI-only footage, and a jump-to-loop-boundary control. Native frames, the AI-only loop, the composited loop, and continuity metrics remain under `work/cloud-sanctuary-local/outputs`.

Sources: [Lightricks LTX-Video](https://github.com/Lightricks/LTX-Video), [official model weights](https://huggingface.co/Lightricks/LTX-Video), and [ComfyUI text-encoder guidance](https://blog.comfy.org/p/ltx-video-095-day-1-support-in-comfyui).

## Restored eight-second version

The restored eight-second file uses procedural image displacement. `scripts/render-cloud-sanctuary-loop.py` retains that implementation and the hand-drawn protection polygons. Its verification is saved in `work/cloud-sanctuary-video/verification.json`: 192 frames, 8 seconds, 1920×1080, 24 fps and no audio. The prior Higgsfield attempt was rejected by its Free-plan restriction and consumed no credits; it did not generate the current footage.

Archived AI validation (not the active app asset): all 144 H.264 frames decode; duration is 6 seconds with no audio stream. Boundary RGB delta is 0.283/255, 1.59 times the adjacent-frame mean; fixed-floor boundary delta is 0.021/255. Fixed QP 4, a single GOP and no B-frames reduce boundary texture changes.
