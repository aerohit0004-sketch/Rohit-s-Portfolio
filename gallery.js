/**
 * GALLERY.JS - Interactive Cinema Experience & Lightbox
 * Powers Box01 (Reels), Box02 (Motion Graphics), Box03 (3D Animation), Box04 (Films)
 * Rohit Kol Portfolio
 */

(() => {
  // Create Lightbox DOM dynamically if not present
  let lightbox = document.getElementById('gallery-lightbox');
  let currentItems = [];
  let currentIndex = -1;

  const initLightbox = () => {
    if (lightbox) return;

    lightbox = document.createElement('div');
    lightbox.id = 'gallery-lightbox';
    lightbox.className = 'gallery-lightbox';
    lightbox.innerHTML = `
      <div class="lightbox-backdrop"></div>
      <div class="lightbox-container">
        <button class="lightbox-btn-close" aria-label="Close Lightbox">✕</button>
        <button class="lightbox-nav-btn btn-prev" aria-label="Previous Video">‹</button>
        <button class="lightbox-nav-btn btn-next" aria-label="Next Video">›</button>

        <div class="lightbox-media-wrapper">
          <div class="lightbox-video-frame">
            <video id="lightbox-video" controls autoplay playsinline></video>
          </div>
          <div class="lightbox-meta">
            <div class="meta-tags-row">
              <span id="lightbox-tag" class="meta-tag-pill">VIDEO SHOWCASE</span>
              <span id="lightbox-counter" class="meta-counter">1 / 1</span>
            </div>
            <h2 id="lightbox-title" class="lightbox-title">Video Title</h2>
            <p id="lightbox-desc" class="lightbox-desc"></p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(lightbox);

    // Event listeners for lightbox controls
    const closeBtn = lightbox.querySelector('.lightbox-btn-close');
    const backdrop = lightbox.querySelector('.lightbox-backdrop');
    const prevBtn = lightbox.querySelector('.btn-prev');
    const nextBtn = lightbox.querySelector('.btn-next');
    const video = document.getElementById('lightbox-video');

    const closeLightbox = () => {
      lightbox.classList.remove('active');
      document.body.classList.remove('lightbox-open');
      if (video) {
        video.pause();
        video.src = '';
      }
    };

    closeBtn.addEventListener('click', closeLightbox);
    backdrop.addEventListener('click', closeLightbox);

    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) openItem(currentIndex - 1);
      else openItem(currentItems.length - 1);
    });

    nextBtn.addEventListener('click', () => {
      if (currentIndex < currentItems.length - 1) openItem(currentIndex + 1);
      else openItem(0);
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevBtn.click();
      if (e.key === 'ArrowRight') nextBtn.click();
      if (e.key === ' ' && video) {
        e.preventDefault();
        if (video.paused) video.play(); else video.pause();
      }
    });
  };

  const openItem = (index) => {
    if (index < 0 || index >= currentItems.length) return;
    currentIndex = index;
    const item = currentItems[index];

    const video = document.getElementById('lightbox-video');
    const titleEl = document.getElementById('lightbox-title');
    const descEl = document.getElementById('lightbox-desc');
    const tagEl = document.getElementById('lightbox-tag');
    const counterEl = document.getElementById('lightbox-counter');
    const mediaFrame = lightbox.querySelector('.lightbox-video-frame');

    if (item.isPortrait) {
      mediaFrame.classList.add('portrait-mode');
      mediaFrame.classList.remove('landscape-mode');
    } else {
      mediaFrame.classList.add('landscape-mode');
      mediaFrame.classList.remove('portrait-mode');
    }

    video.onloadedmetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        if (video.videoHeight > video.videoWidth) {
          mediaFrame.classList.add('portrait-mode');
          mediaFrame.classList.remove('landscape-mode');
        } else {
          mediaFrame.classList.add('landscape-mode');
          mediaFrame.classList.remove('portrait-mode');
        }
      }
    };

    video.src = item.videoSrc;
    video.currentTime = 0;
    video.play().catch(() => {});

    titleEl.textContent = item.title || 'Rohit Kol Showcase';
    descEl.textContent = item.desc || '';
    tagEl.textContent = item.tag || 'VIDEO EDIT';
    counterEl.textContent = `${index + 1} / ${currentItems.length}`;

    lightbox.classList.add('active');
    document.body.classList.add('lightbox-open');
  };

  // Setup cards and hover behaviors
  const setupGalleryCards = () => {
    const cards = document.querySelectorAll('[data-video-src]');
    currentItems = [];

    cards.forEach((card, idx) => {
      const videoSrc = card.getAttribute('data-video-src');
      const title = card.getAttribute('data-title') || card.querySelector('h3, h2, h4')?.textContent || '';
      const desc = card.getAttribute('data-desc') || card.querySelector('p')?.textContent || '';
      const tag = card.getAttribute('data-tag') || card.querySelector('.reel-meta-tag, .category-tag, .film-tag')?.textContent || 'PORTFOLIO';
      const isPortrait = card.classList.contains('reel-card') || card.closest('.reels-grid') !== null;

      currentItems.push({
        videoSrc,
        title,
        desc,
        tag,
        isPortrait,
        element: card
      });

      const video = card.querySelector('video');

      // Hover to preview
      if (video) {
        card.addEventListener('mouseenter', () => {
          if (video.paused) {
            video.play().catch(() => {});
          }
        });

        card.addEventListener('mouseleave', () => {
          // Pause only if not manually unmuted
          if (video.muted) {
            video.pause();
          }
        });

        // Click sound toggle button
        const soundBtn = card.querySelector('.sound-toggle-btn');
        if (soundBtn) {
          soundBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            video.muted = !video.muted;
            const icon = soundBtn.querySelector('.sound-icon');
            if (icon) {
              icon.textContent = video.muted ? '🔇' : '🔊';
            }
            if (!video.muted && video.paused) {
              video.play().catch(() => {});
            }
          });
        }
      }

      // Card click opens Lightbox
      card.addEventListener('click', (e) => {
        // If clicking a link inside, allow navigation
        if (e.target.closest('a')) return;
        // If clicking sound button, don't open modal
        if (e.target.closest('.sound-toggle-btn')) return;

        openItem(idx);
      });
    });
  };

  // Film player tabs switching (Local Master vs YouTube Embed)
  const setupFilmTabs = () => {
    const cards = document.querySelectorAll('.theater-film-card');
    cards.forEach(card => {
      const tabs = card.querySelectorAll('.player-tab-btn');
      const localBox = card.querySelector('.player-view-local');
      const ytBox = card.querySelector('.player-view-youtube');

      if (!tabs.length || !localBox || !ytBox) return;

      tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          e.stopPropagation();
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');

          const mode = tab.getAttribute('data-player');
          if (mode === 'local') {
            localBox.style.display = 'block';
            ytBox.style.display = 'none';
            // Pause any playing iframe by resetting its src if needed
          } else {
            localBox.style.display = 'none';
            ytBox.style.display = 'block';
            const vid = localBox.querySelector('video');
            if (vid) vid.pause();
          }
        });
      });
    });
  };

  // Category filter tabs (if present)
  const setupFilterTabs = () => {
    const filterTabs = document.querySelectorAll('.gallery-filter-tab');
    if (!filterTabs.length) return;

    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const filter = tab.getAttribute('data-filter') || 'all';
        const cards = document.querySelectorAll('[data-video-src]');

        cards.forEach(card => {
          const category = card.getAttribute('data-category') || '';
          if (filter === 'all' || category === filter) {
            card.style.display = '';
            card.style.opacity = '1';
          } else {
            card.style.display = 'none';
            card.style.opacity = '0';
          }
        });
      });
    });
  };

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initLightbox();
      setupGalleryCards();
      setupFilterTabs();
      setupFilmTabs();
    });
  } else {
    initLightbox();
    setupGalleryCards();
    setupFilterTabs();
    setupFilmTabs();
  }
})();
