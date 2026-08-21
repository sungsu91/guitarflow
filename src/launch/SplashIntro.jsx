import { useEffect, useId, useRef, useState } from "react";
import { APP_LAUNCH_TIMINGS } from "./appLaunch";

export const APP_MASTER_LOGO_SRC = "/assets/branding/just-play-master-logo.png?v=21b0905a";

const GUITAR_STRING_PATHS = [
  "M 838 903 C 851 704 870 474 897 260",
  "M 849 904 C 863 701 883 469 914 248",
  "M 860 905 C 875 699 897 464 931 241",
  "M 871 906 C 888 696 911 460 948 236",
  "M 882 907 C 900 694 925 458 965 234",
  "M 893 908 C 912 692 939 457 982 236",
];

// These vector contours are traced from the bright letterforms in the original
// 1254px master. They keep neighboring letters and guitar details out of each
// flying piece without creating extra raster assets.
const JUST_PIECE_CLIP_PATH = `M 221 667 L 232 641 L 243 631 L 256 626 L 281 628 L 288 637 L 289 659 L 298 655 L 313 626 L 321 594 L 325 593 L 337 521 L 343 452 L 291 467 L 248 464 L 241 453 L 241 434 L 249 416 L 262 404 L 292 388 L 368 363 L 434 351 L 472 351 L 490 359 L 496 373 L 492 403 L 475 416 L 420 431 L 416 495 L 402 587 L 387 639 L 365 679 L 341 703 L 315 718 L 295 724 L 260 725 L 241 718 L 231 709 L 225 690 L 221 690 Z M 418 561 L 424 511 L 440 466 L 448 457 L 459 452 L 487 453 L 497 462 L 498 492 L 482 557 L 480 585 L 484 596 L 491 602 L 505 597 L 515 585 L 530 547 L 541 447 L 558 434 L 583 434 L 595 442 L 599 454 L 599 494 L 587 574 L 571 613 L 541 646 L 519 658 L 496 664 L 469 664 L 442 655 L 433 646 L 420 618 Z M 589 587 L 595 571 L 608 562 L 633 563 L 643 577 L 654 584 L 668 575 L 676 561 L 667 549 L 625 526 L 612 513 L 609 503 L 605 503 L 604 468 L 617 441 L 641 420 L 669 408 L 709 406 L 727 413 L 736 426 L 736 447 L 732 460 L 715 468 L 699 468 L 684 457 L 670 468 L 667 476 L 676 486 L 717 506 L 735 527 L 738 562 L 734 580 L 724 598 L 701 620 L 679 631 L 658 636 L 629 636 L 606 627 L 596 613 L 592 613 Z M 728 418 L 733 405 L 744 395 L 804 373 L 858 362 L 885 363 L 898 373 L 898 400 L 889 412 L 872 421 L 840 430 L 819 584 L 813 599 L 801 608 L 775 609 L 763 607 L 760 602 L 763 543 L 778 446 L 745 447 L 738 441 L 730 441 Z`;
const PLAY_PIECE_CLIP_PATH = `M 232 793 L 247 768 L 290 735 L 329 715 L 372 701 L 421 698 L 443 703 L 463 718 L 471 736 L 470 782 L 454 818 L 427 848 L 399 872 L 352 900 L 322 912 L 308 989 L 299 1001 L 287 1009 L 253 1009 L 247 1001 L 252 935 L 276 818 L 264 824 L 237 825 L 232 814 Z M 578 857 L 606 750 L 638 673 L 651 660 L 663 654 L 695 652 L 706 656 L 715 665 L 720 677 L 737 752 L 752 756 L 760 767 L 758 794 L 747 802 L 751 830 L 748 860 L 732 869 L 709 868 L 697 851 L 692 819 L 644 837 L 635 876 L 626 890 L 617 896 L 593 896 L 585 891 L 582 882 L 578 882 Z M 734 653 L 739 643 L 752 634 L 782 634 L 797 646 L 821 692 L 855 628 L 871 609 L 885 602 L 909 601 L 919 605 L 926 613 L 925 641 L 854 761 L 825 876 L 815 889 L 803 895 L 773 893 L 769 885 L 772 835 L 787 760 L 745 690 L 738 688 L 734 675 Z M 454 904 L 480 737 L 481 711 L 486 701 L 500 691 L 529 691 L 541 703 L 542 731 L 522 854 L 552 843 L 573 843 L 584 850 L 587 874 L 577 892 L 560 904 L 494 928 L 460 928 L 454 919 Z`;

function normalizeProgress(progress) {
  if (!Number.isFinite(progress)) return null;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

function getProgressStep(progress) {
  if (progress >= 100) return "complete";
  if (progress >= 80) return "guitar";
  if (progress >= 55) return "play";
  if (progress >= 25) return "just";
  return "start";
}

export default function SplashIntro({
  ariaLabel = "JUST PLAY 준비 중",
  exitMs = APP_LAUNCH_TIMINGS.exitMs,
  fallbackMs = APP_LAUNCH_TIMINGS.fallbackMs,
  minimumIntroMs = APP_LAUNCH_TIMINGS.minimumIntroMs,
  onComplete,
  progress = null,
  readySettleMs = APP_LAUNCH_TIMINGS.readySettleMs,
  readyPromise,
  statusText = "JUST PLAY 앱을 준비하고 있습니다.",
}) {
  const [phase, setPhase] = useState("entering");
  const launchStartedAtRef = useRef(Date.now());
  const instanceId = useId().replace(/:/g, "");
  const logoAssetId = `just-play-launch-asset-${instanceId}`;
  const wordMaskFilterId = `just-play-word-mask-filter-${instanceId}`;
  const guitarMaskFilterId = `just-play-guitar-mask-filter-${instanceId}`;
  const justClipId = `just-play-just-clip-${instanceId}`;
  const playClipId = `just-play-play-clip-${instanceId}`;
  const guitarClipId = `just-play-guitar-clip-${instanceId}`;
  const justMaskId = `just-play-just-mask-${instanceId}`;
  const playMaskId = `just-play-play-mask-${instanceId}`;
  const guitarMaskId = `just-play-guitar-mask-${instanceId}`;
  const fullMaskId = `just-play-full-mask-${instanceId}`;
  const sheenGradientId = `just-play-launch-sheen-${instanceId}`;
  const normalizedProgress = normalizeProgress(progress);
  const controlledProgress = normalizedProgress !== null;
  const progressStep = controlledProgress ? getProgressStep(normalizedProgress) : null;
  const readyToExit = phase === "ready" || phase === "exiting";
  const showJustPiece = controlledProgress && normalizedProgress >= 25;
  const showPlayPiece = controlledProgress && normalizedProgress >= 55;
  const showGuitarPiece = controlledProgress && normalizedProgress >= 80;
  const showFinalPiece = controlledProgress && normalizedProgress >= 100;

  useEffect(() => {
    let cancelled = false;
    let exitTimerId = null;
    let fallbackTimerId = null;
    let minimumTimerId = null;
    let readyTimerId = null;

    const minimumIntro = minimumIntroMs > 0
      ? new Promise((resolve) => {
        minimumTimerId = window.setTimeout(resolve, minimumIntroMs);
      })
      : Promise.resolve();
    const fallback = new Promise((resolve) => {
      fallbackTimerId = window.setTimeout(() => resolve("fallback"), fallbackMs);
    });
    const appReady = Promise.resolve(readyPromise).then(
      () => "ready",
      () => "ready-error",
    );

    Promise.all([minimumIntro, Promise.race([appReady, fallback])]).then(([, result]) => {
      if (cancelled) return;
      if (result === "fallback") {
        console.warn("JUST PLAY launch fallback released the splash before the app-ready signal.");
      }
      setPhase("ready");
      const elapsedMs = Date.now() - launchStartedAtRef.current;
      const autonomousCompletionRemainingMs = Math.max(
        0,
        APP_LAUNCH_TIMINGS.autonomousSequenceMs
          + APP_LAUNCH_TIMINGS.completeHoldMs
          - elapsedMs,
      );
      const settleBeforeExitMs = controlledProgress
        ? readySettleMs
        : Math.max(readySettleMs, autonomousCompletionRemainingMs);
      readyTimerId = window.setTimeout(() => {
        if (cancelled) return;
        setPhase("exiting");
        exitTimerId = window.setTimeout(() => onComplete?.(), exitMs);
      }, settleBeforeExitMs);
    });

    return () => {
      cancelled = true;
      if (minimumTimerId !== null) window.clearTimeout(minimumTimerId);
      if (fallbackTimerId !== null) window.clearTimeout(fallbackTimerId);
      if (exitTimerId !== null) window.clearTimeout(exitTimerId);
      if (readyTimerId !== null) window.clearTimeout(readyTimerId);
    };
  }, [controlledProgress, exitMs, fallbackMs, minimumIntroMs, onComplete, readyPromise, readySettleMs]);

  return (
    <section
      aria-label={ariaLabel}
      aria-live="polite"
      className={`launchSplash launchSplash--${phase} ${
        controlledProgress
          ? `launchSplash--controlled launchSplash--step-${progressStep}`
          : "launchSplash--autonomous"
      }`}
      role="status"
      style={{
        "--launch-exit-ms": `${exitMs}ms`,
      }}
    >
      <div className="launchSplash__content">
        <div className="launchSplash__stage">
          <svg
            aria-hidden="true"
            className="launchSplash__logo"
            focusable="false"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 1254 1254"
          >
            <defs>
              <image
                height="1254"
                href={APP_MASTER_LOGO_SRC}
                id={logoAssetId}
                preserveAspectRatio="xMidYMid meet"
                width="1254"
                x="0"
                y="0"
              />
              <filter
                colorInterpolationFilters="sRGB"
                height="120%"
                id={wordMaskFilterId}
                width="120%"
                x="-10%"
                y="-10%"
              >
                <feColorMatrix
                  type="matrix"
                  values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.15 0.1 1 0 -0.28"
                />
                <feComponentTransfer>
                  <feFuncA intercept="-0.02" slope="1.7" type="linear" />
                </feComponentTransfer>
                <feMorphology operator="dilate" radius="8" />
              </filter>
              <filter
                colorInterpolationFilters="sRGB"
                height="120%"
                id={guitarMaskFilterId}
                width="120%"
                x="-10%"
                y="-10%"
              >
                <feColorMatrix type="luminanceToAlpha" />
                <feComponentTransfer>
                  <feFuncA intercept="-0.16" slope="2.1" type="linear" />
                </feComponentTransfer>
              </filter>
              <clipPath id={justClipId}>
                <path d={JUST_PIECE_CLIP_PATH} />
              </clipPath>
              <clipPath id={playClipId}>
                <path d={PLAY_PIECE_CLIP_PATH} />
              </clipPath>
              <clipPath id={guitarClipId}>
                <path d="M 782 0 H 1138 V 474 H 1068 V 552 H 1188 V 1254 H 778 V 1014 H 846 V 788 H 790 Z" />
              </clipPath>
              <mask
                height="1254"
                id={justMaskId}
                maskUnits="userSpaceOnUse"
                style={{ maskType: "alpha" }}
                width="1254"
                x="0"
                y="0"
              >
                <g clipPath={`url(#${justClipId})`} filter={`url(#${wordMaskFilterId})`}>
                  <use href={`#${logoAssetId}`} />
                </g>
              </mask>
              <mask
                height="1254"
                id={playMaskId}
                maskUnits="userSpaceOnUse"
                style={{ maskType: "alpha" }}
                width="1254"
                x="0"
                y="0"
              >
                <g clipPath={`url(#${playClipId})`} filter={`url(#${wordMaskFilterId})`}>
                  <use href={`#${logoAssetId}`} />
                </g>
              </mask>
              <mask
                height="1254"
                id={guitarMaskId}
                maskUnits="userSpaceOnUse"
                style={{ maskType: "alpha" }}
                width="1254"
                x="0"
                y="0"
              >
                <g clipPath={`url(#${guitarClipId})`} filter={`url(#${guitarMaskFilterId})`}>
                  <use href={`#${logoAssetId}`} />
                </g>
              </mask>
              <mask
                height="1254"
                id={fullMaskId}
                maskUnits="userSpaceOnUse"
                style={{ maskType: "alpha" }}
                width="1254"
                x="0"
                y="0"
              >
                <use href={`#${logoAssetId}`} />
              </mask>
              <linearGradient id={sheenGradientId} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#ffd66f" stopOpacity="0" />
                <stop offset="0.5" stopColor="#fff4ca" stopOpacity="0.34" />
                <stop offset="1" stopColor="#ffd66f" stopOpacity="0" />
              </linearGradient>
            </defs>

            <g
              className={`launchSplash__piece launchSplash__piece--guitar${showGuitarPiece ? " launchSplash__piece--visible" : ""}`}
              mask={`url(#${guitarMaskId})`}
            >
              <use href={`#${logoAssetId}`} />
            </g>
            <g
              className={`launchSplash__piece launchSplash__piece--just${showJustPiece ? " launchSplash__piece--visible" : ""}`}
              mask={`url(#${justMaskId})`}
            >
              <use href={`#${logoAssetId}`} />
            </g>
            <g
              className={`launchSplash__piece launchSplash__piece--play${showPlayPiece ? " launchSplash__piece--visible" : ""}`}
              mask={`url(#${playMaskId})`}
            >
              <use href={`#${logoAssetId}`} />
            </g>
            <use
              className={`launchSplash__pieceFinal${showFinalPiece ? " launchSplash__piece--visible" : ""}`}
              href={`#${logoAssetId}`}
            />
            <rect
              className="launchSplash__sheen"
              fill={`url(#${sheenGradientId})`}
              height="1500"
              mask={`url(#${fullMaskId})`}
              width="220"
              x="-360"
              y="-120"
            />
            <g className="launchSplash__stringMotion">
              {GUITAR_STRING_PATHS.map((path) => (
                <path d={path} key={path} pathLength="1" />
              ))}
            </g>
          </svg>
        </div>
        {controlledProgress ? (
          <div
            aria-label={readyToExit ? "테마 준비 완료" : `테마 준비 ${normalizedProgress}%`}
            aria-valuemax="100"
            aria-valuemin="0"
            aria-valuenow={readyToExit ? 100 : normalizedProgress}
            className="launchSplash__progress"
            role="progressbar"
          >
            <span aria-hidden="true" className="launchSplash__progressTrack">
              <span
                className="launchSplash__progressValue"
                style={{ "--launch-progress-scale": normalizedProgress / 100 }}
              />
            </span>
            <strong>{readyToExit ? "READY!" : `LOADING... ${normalizedProgress}%`}</strong>
          </div>
        ) : null}
      </div>
      <span className="launchSplash__statusText">{statusText}</span>
    </section>
  );
}
