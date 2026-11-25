(() => {
  const FRAME_COUNT = 94;
  const LERP_EASE = 0.09; // Smooth momentum scrub factor

  const canvas = document.getElementById('frame-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderText = document.getElementById('loader-text');

  // Pre-allocated array of Image objects (index 1 to 94)
  const images = new Array(FRAME_COUNT + 1);
  let loadedCount = 0;
  let loaderHidden = false;

  // Frame URL generator (cachebuster v=2 for cleaned unwatermarked frames)
  const getFrameUrl = (index) => {
    const padded = String(index).padStart(4, '0');
    return `./video_frames_under_20mb/frame_${padded}.jpg?v=2`;
  };

  // State
  let targetProgress = 0;
  let currentProgress = 0;
  let targetFrameIndex = 1;
  let lastDrawnFrameIndex = -1;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let dpr = 1;

  // Resize canvas to fill viewport with High-DPI scaling
  const resizeCanvas = () => {
    dpr = window.devicePixelRatio || 1;
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);

    // Force re-render of current frame
    renderFrame(targetFrameIndex);
  };

  // Find nearest loaded frame if the requested frame is still downloading
  const findNearestLoadedFrame = (targetIdx) => {
    // 1. Direct check
    if (images[targetIdx] && images[targetIdx].complete && images[targetIdx].naturalWidth > 0) {
      return { img: images[targetIdx], index: targetIdx };
    }
    // 2. Outward search for closest available frame
    for (let offset = 1; offset < FRAME_COUNT; offset++) {
      const prev = targetIdx - offset;
      if (prev >= 1 && images[prev] && images[prev].complete && images[prev].naturalWidth > 0) {
        return { img: images[prev], index: prev };
      }
      const next = targetIdx + offset;
      if (next <= FRAME_COUNT && images[next] && images[next].complete && images[next].naturalWidth > 0) {
        return { img: images[next], index: next };
      }
    }
    return null;
  };

  // Render a specific frame with "cover" fit mode (aspect ratio preserved, centered)
  const renderFrame = (desiredIndex) => {
    const nearest = findNearestLoadedFrame(desiredIndex);
    if (!nearest || !nearest.img) return;

    const img = nearest.img;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    if (imgWidth === 0 || imgHeight === 0) return;

    // Calculate scaling to 'cover' canvas while preserving aspect ratio
    const scale = Math.max(canvas.width / imgWidth, canvas.height / imgHeight);
    const renderW = imgWidth * scale;
    const renderH = imgHeight * scale;
    const offsetX = (canvas.width - renderW) / 2;
    let offsetY = (canvas.height - renderH) / 2;

    // Mobile / Tablet portrait headroom optimization
    if (canvasWidth < 768 && canvasHeight > canvasWidth) {
      // In mobile portrait, scale covers height so renderH === canvas.height.
      // Setting offsetY = 0 perfectly places Rohit's head with ideal headroom below the navbar.
      offsetY = 0;
    }

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);

    lastDrawnFrameIndex = nearest.index;
  };

  // Calculate normalized scroll progress across the whole page (0.0 to 1.0)
  const updateScrollProgress = () => {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    targetProgress = Math.max(0, Math.min(1, scrollY / maxScroll));
  };

  // Main animation / render loop with LERP interpolation
  const tick = () => {
    // Smooth interpolation towards target scroll progress
    const diff = targetProgress - currentProgress;
    if (Math.abs(diff) > 0.0001) {
      currentProgress += diff * LERP_EASE;
    } else {
      currentProgress = targetProgress;
    }

    // Map progress (0.0 to 1.0) to frame index (1 to FRAME_COUNT)
    targetFrameIndex = Math.min(
      FRAME_COUNT,
      Math.max(1, Math.round(1 + currentProgress * (FRAME_COUNT - 1)))
    );

    // Re-render if target frame differs from what's currently drawn
    if (targetFrameIndex !== lastDrawnFrameIndex) {
      renderFrame(targetFrameIndex);
    }

    requestAnimationFrame(tick);
  };

  const updateLoader = (count) => {
    const percent = Math.min(100, Math.round((count / FRAME_COUNT) * 100));
    if (loaderBar) loaderBar.style.width = `${percent}%`;
    if (loaderText) loaderText.textContent = `${percent}%`;
  };

  const hideLoader = () => {
    if (loaderHidden) return;
    loaderHidden = true;
    if (loader) {
      loader.classList.add('hidden');
    }
  };

  // Preload all frames concurrently
  const preloadFrames = () => {
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.src = getFrameUrl(i);
      images[i] = img;

      img.onload = () => {
        loadedCount++;
        updateLoader(loadedCount);

        // Instant first paint
        if (i === 1 && lastDrawnFrameIndex === -1) {
          renderFrame(1);
        }

        // If this loaded frame matches the target or improves current view, re-render
        if (targetFrameIndex !== lastDrawnFrameIndex) {
          renderFrame(targetFrameIndex);
        }

        if (loadedCount >= FRAME_COUNT) {
          hideLoader();
        }
      };

      img.onerror = () => {
        console.warn(`Failed to load frame ${i}`);
        loadedCount++;
        updateLoader(loadedCount);
        if (loadedCount >= FRAME_COUNT) {
          hideLoader();
        }
      };
    }

    // Safety timeout: automatically hide loader after 1.5s so it never lingers
    setTimeout(() => {
      hideLoader();
    }, 1500);
  };

  // Event Listeners for smooth scrolling
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  document.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', () => {
    resizeCanvas();
    updateScrollProgress();
  }, { passive: true });

  // Initialize
  resizeCanvas();
  updateScrollProgress();
  currentProgress = targetProgress;
  preloadFrames();
  requestAnimationFrame(tick);

  // Card hover video preview playback
  document.querySelectorAll('.project-card').forEach(card => {
    const video = card.querySelector('video');
    if (video) {
      card.addEventListener('mouseenter', () => {
        video.play().catch(() => {});
      });
      card.addEventListener('mouseleave', () => {
        video.pause();
      });
    }
  });
})();
