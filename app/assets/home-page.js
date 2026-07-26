(() => {
  'use strict';

  document.documentElement.classList.add('is-ready');

  const searchInput = document.getElementById('homeSearch');
  const playerSearchForm = document.querySelector('[data-player-search-form]');
  const clearButton = document.querySelector('.search-clear');
  const playerSearchRoot = document.querySelector('[data-player-search]');
  const playerSearchResults = document.querySelector('[data-player-search-results]');
  const statusNode = document.querySelector('[data-server-status]');
  const statusCount = document.querySelector('[data-server-status-count]');
  const copyServerIpButtons = document.querySelectorAll('[data-copy-server-ip]');
  const joinModal = document.querySelector('[data-join-modal]');
  const joinModalPanel = joinModal ? joinModal.querySelector('.join-modal-panel') : null;
  const joinGif = document.querySelector('[data-join-gif]');
  const openJoinModalButtons = document.querySelectorAll('[data-open-join-modal]');
  const closeJoinModalButtons = document.querySelectorAll('[data-close-join-modal]');
  const announcementModal = document.querySelector('[data-announcement-modal]');
  const announcementModalPanel = announcementModal ? announcementModal.querySelector('.announcement-modal-panel') : null;
  const announcementButtons = document.querySelectorAll('[data-open-announcement-modal]');
  const closeAnnouncementButtons = document.querySelectorAll('[data-close-announcement-modal]');
  const announcementModalEyebrow = document.querySelector('[data-announcement-modal-eyebrow]');
  const announcementModalTitle = document.querySelector('[data-announcement-modal-title]');
  const announcementModalSummary = document.querySelector('[data-announcement-modal-summary]');
  const announcementModalContent = document.querySelector('[data-announcement-modal-content]');
  const announcementModalMedia = document.querySelector('[data-announcement-modal-media]');
  const announcementModalImage = document.querySelector('[data-announcement-modal-image]');
  const announcementModalLink = document.querySelector('[data-announcement-modal-link]');
  const announcementCarousel = document.querySelector('[data-announcement-carousel]');
  const announcementTrack = document.querySelector('[data-announcement-track]');
  const announcementPrevButton = document.querySelector('[data-announcement-prev]');
  const announcementNextButton = document.querySelector('[data-announcement-next]');
  const announcementDots = document.querySelectorAll('[data-announcement-dot]');
  const creatorVideos = document.querySelector('[data-creator-videos]');
  const creatorStatus = document.querySelector('[data-creator-status]');
  const adminImageDrop = document.querySelector('[data-admin-image-drop]');
  const adminImageInput = document.querySelector('[data-admin-image-input]');
  const adminUploadLabel = document.querySelector('[data-admin-upload-label]');
  const heroVideo = document.querySelector('[data-hero-video]');
  const leaderboardPage = document.querySelector('.leaderboard-page');
  const serverIp = statusNode ? statusNode.dataset.serverIp || 'mineacle.net' : 'mineacle.net';
  const statusRefreshMs = 15000;
  const statusFetchTimeoutMs = 4200;
  const creatorFetchTimeoutMs = 4500;
  const statusCacheKey = `mineacle:server-status:${serverIp}`;
  const statusCacheMaxAgeMs = 15000;
  const playerSearchDelayMs = 160;
  let statusRequestActive = false;
  let playerSearchTimer = 0;
  let playerSearchAbort = null;
  let playerSearchRun = 0;
  let joinModalLastFocus = null;
  let announcementModalLastFocus = null;
  let leaderboardViewAbort = null;
  let leaderboardViewRun = 0;
  let leaderboardCurrentUrl = `${window.location.pathname}${window.location.search}`;
  let externalStatusFailureCount = 0;
  let lastExternalStatusCheck = 0;
  const videoFallbackSvg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"%3E%3Crect width="640" height="360" fill="%23202020"/%3E%3Cpath fill="%23ff55ff" d="M282 238V122l104 58-104 58z"/%3E%3C/svg%3E';

  const runWhenIdle = (callback, timeout = 1200) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout });
      return;
    }

    window.setTimeout(callback, Math.min(timeout, 800));
  };

  const loadHeroVideo = () => {
    if (!(heroVideo instanceof HTMLVideoElement)) return;

    const source = heroVideo.querySelector('source[data-src]');
    if (!(source instanceof HTMLSourceElement)) return;
    if (source.getAttribute('src')) return;

    source.setAttribute('src', source.dataset.src || '');
    heroVideo.load();

    const playPromise = heroVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  };

  const disableSimpleAssetGrabs = () => {
    const protectedMediaSelector = 'img, video, picture, svg, source';
    const blockEvent = (event) => {
      event.preventDefault();
    };
    const blockMediaDrag = (event) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest(protectedMediaSelector)) return;
      event.preventDefault();
    };
    const blockInspectShortcut = (event) => {
      const key = event.key.toLowerCase();
      const commandKey = event.ctrlKey || event.metaKey;
      const devToolsShortcut = event.key === 'F12'
        || (commandKey && event.shiftKey && ['c', 'i', 'j', 'k'].includes(key))
        || (event.metaKey && event.altKey && ['c', 'i', 'j', 'u'].includes(key))
        || (commandKey && ['s', 'u'].includes(key));

      if (!devToolsShortcut) return;

      event.preventDefault();
      event.stopPropagation();
    };
    const markMedia = () => {
      document.querySelectorAll('img, video').forEach((node) => {
        node.setAttribute('draggable', 'false');
      });
    };

    document.addEventListener('contextmenu', blockEvent, true);
    document.addEventListener('dragstart', blockMediaDrag, true);
    document.addEventListener('keydown', blockInspectShortcut, true);
    window.addEventListener('beforeprint', blockEvent);
    markMedia();

    if ('MutationObserver' in window) {
      new MutationObserver(markMedia).observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  };

  disableSimpleAssetGrabs();

  const fallbackCopyText = (text) => {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.left = '-999px';
    document.body.append(input);
    input.select();

    try {
      return document.execCommand('copy');
    } finally {
      input.remove();
    }
  };

  const copyServerIp = async (event) => {
    const button = event.currentTarget;
    if (!(button instanceof HTMLElement)) return;

    const label = button.querySelector('[data-copy-server-label]');
    const defaultLabel = button.dataset.defaultLabel || (label ? label.textContent : 'Copy Server IP');
    const copiedLabel = button.dataset.copiedLabel || 'IP Copied';
    const failedLabel = button.dataset.failedLabel || 'Copy Failed';
    const ip = button.dataset.serverIp || serverIp || 'mineacle.net';
    let copied;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(ip);
        copied = true;
      } else {
        copied = fallbackCopyText(ip);
      }
    } catch (_) {
      copied = fallbackCopyText(ip);
    }

    if (label) {
      label.textContent = copied ? copiedLabel : failedLabel;
    }

    button.classList.toggle('is-copied', copied);
    button.classList.toggle('is-copy-failed', !copied);

    window.setTimeout(() => {
      if (label) label.textContent = defaultLabel || 'Copy Server IP';
      button.classList.remove('is-copied', 'is-copy-failed');
    }, 2200);
  };

  const openJoinModal = () => {
    if (!joinModal || !joinModalPanel) return;

    joinModalLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (joinGif && !joinGif.getAttribute('src')) {
      joinGif.setAttribute('src', joinGif.dataset.src || '');
    }

    joinModal.hidden = false;
    document.body.classList.add('has-join-modal');
    joinModalPanel.focus({ preventScroll: true });
  };

  const closeJoinModal = () => {
    if (!joinModal) return;

    joinModal.hidden = true;
    document.body.classList.remove('has-join-modal');

    if (joinModalLastFocus) {
      joinModalLastFocus.focus({ preventScroll: true });
      joinModalLastFocus = null;
    }
  };

  const fillTextWithBreaks = (node, text) => {
    if (!node) return;

    node.textContent = '';

    String(text || '').split(/\r?\n/).forEach((line, index) => {
      if (index > 0) {
        node.append(document.createElement('br'));
      }

      node.append(document.createTextNode(line));
    });
  };

  const openAnnouncementModal = (event) => {
    const button = event.currentTarget;
    if (!(button instanceof HTMLElement) || !announcementModal || !announcementModalPanel) return;

    announcementModalLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (announcementModalEyebrow) {
      announcementModalEyebrow.textContent = button.dataset.announcementEyebrow || 'Update';
    }

    if (announcementModalTitle) {
      announcementModalTitle.textContent = button.dataset.announcementTitle || 'Announcement';
    }

    if (announcementModalSummary) {
      announcementModalSummary.textContent = button.dataset.announcementSummary || '';
    }

    fillTextWithBreaks(announcementModalContent, button.dataset.announcementContent || '');

    const imageUrl = button.dataset.announcementImage || '';
    if (announcementModalMedia && announcementModalImage) {
      if (imageUrl !== '') {
        announcementModalImage.src = imageUrl;
        announcementModalMedia.hidden = false;
      } else {
        announcementModalImage.removeAttribute('src');
        announcementModalMedia.hidden = true;
      }
    }

    const linkUrl = button.dataset.announcementLink || '#';
    if (announcementModalLink) {
      announcementModalLink.hidden = linkUrl === '#';
      announcementModalLink.href = linkUrl;
    }

    announcementModal.hidden = false;
    document.body.classList.add('has-announcement-modal');
    announcementModalPanel.focus({ preventScroll: true });
  };

  const closeAnnouncementModal = () => {
    if (!announcementModal) return;

    announcementModal.hidden = true;
    document.body.classList.remove('has-announcement-modal');

    if (announcementModalLastFocus) {
      announcementModalLastFocus.focus({ preventScroll: true });
      announcementModalLastFocus = null;
    }
  };

  const setupAnnouncementCarousel = () => {
    if (!announcementCarousel || !announcementTrack) return;

    const cards = Array.from(announcementTrack.querySelectorAll('[data-announcement-card]'));
    if (cards.length === 0) return;

    let scrollFrame = 0;
    let dragging = false;
    let dragStartX = 0;
    let dragStartScroll = 0;

    const getMaxScroll = () => Math.max(0, announcementTrack.scrollWidth - announcementTrack.clientWidth);

    const getCardScrollTarget = (index) => {
      const card = cards[Math.max(0, Math.min(cards.length - 1, index))];
      return card ? Math.min(card.offsetLeft, getMaxScroll()) : 0;
    };

    const getActiveIndex = () => {
      const scrollLeft = announcementTrack.scrollLeft;
      let activeIndex = 0;
      let shortestDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card, index) => {
        const distance = Math.abs(getCardScrollTarget(index) - scrollLeft);
        if (distance <= shortestDistance) {
          shortestDistance = distance;
          activeIndex = index;
        }
      });

      return activeIndex;
    };

    const updateCarouselState = () => {
      const activeIndex = getActiveIndex();
      const maxScroll = Math.max(0, getMaxScroll() - 2);
      let activeDotTarget = 0;

      announcementDots.forEach((dot) => {
        const dotIndex = Number(dot.getAttribute('data-announcement-dot'));
        if (dotIndex <= activeIndex) {
          activeDotTarget = dotIndex;
        }
      });

      if (announcementPrevButton) {
        announcementPrevButton.disabled = announcementTrack.scrollLeft <= 2;
      }

      if (announcementNextButton) {
        announcementNextButton.disabled = announcementTrack.scrollLeft >= maxScroll;
      }

      announcementDots.forEach((dot) => {
        const dotIndex = Number(dot.getAttribute('data-announcement-dot'));
        dot.classList.toggle('is-active', dotIndex === activeDotTarget);
      });
    };

    const scrollToAnnouncement = (index) => {
      announcementTrack.scrollTo({
        left: getCardScrollTarget(index),
        behavior: 'smooth'
      });
    };

    if (announcementPrevButton) {
      announcementPrevButton.addEventListener('click', () => {
        scrollToAnnouncement(getActiveIndex() - 1);
      });
    }

    if (announcementNextButton) {
      announcementNextButton.addEventListener('click', () => {
        scrollToAnnouncement(getActiveIndex() + 1);
      });
    }

    announcementDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        scrollToAnnouncement(Number(dot.getAttribute('data-announcement-dot')));
      });
    });

    announcementTrack.addEventListener('scroll', () => {
      if (scrollFrame) return;

      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        updateCarouselState();
      });
    }, { passive: true });

    announcementTrack.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest('button, a')) return;

      dragging = true;
      dragStartX = event.clientX;
      dragStartScroll = announcementTrack.scrollLeft;
      announcementTrack.classList.add('is-dragging');
      announcementTrack.setPointerCapture(event.pointerId);
    });

    announcementTrack.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      announcementTrack.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
    });

    const stopDragging = (event) => {
      if (!dragging) return;
      dragging = false;
      announcementTrack.classList.remove('is-dragging');

      if (announcementTrack.hasPointerCapture(event.pointerId)) {
        announcementTrack.releasePointerCapture(event.pointerId);
      }
    };

    announcementTrack.addEventListener('pointerup', stopDragging);
    announcementTrack.addEventListener('pointercancel', stopDragging);
    window.addEventListener('resize', updateCarouselState);
    updateCarouselState();
  };

  const setupAdminImageDrop = () => {
    if (!adminImageDrop || !(adminImageInput instanceof HTMLInputElement) || !adminUploadLabel) return;

    const defaultLabel = adminUploadLabel.textContent || 'Drag an image here or click to upload';

    const setFileLabel = () => {
      const file = adminImageInput.files && adminImageInput.files.length > 0 ? adminImageInput.files[0] : null;
      adminUploadLabel.textContent = file ? file.name : defaultLabel;
    };

    const setDragging = (dragging) => {
      adminImageDrop.classList.toggle('is-dragging', dragging);
    };

    ['dragenter', 'dragover'].forEach((eventName) => {
      adminImageDrop.addEventListener(eventName, (event) => {
        event.preventDefault();
        setDragging(true);
      });
    });

    ['dragleave', 'dragend'].forEach((eventName) => {
      adminImageDrop.addEventListener(eventName, () => {
        setDragging(false);
      });
    });

    adminImageDrop.addEventListener('drop', (event) => {
      event.preventDefault();
      setDragging(false);

      if (!event.dataTransfer || event.dataTransfer.files.length === 0) return;

      try {
        adminImageInput.files = event.dataTransfer.files;
      } catch (_) {
        return;
      }

      setFileLabel();
    });

    adminImageInput.addEventListener('change', setFileLabel);
    setFileLabel();
  };

  const normalizeCreatorVideo = (video) => {
    if (!video || typeof video !== 'object') return null;

    const title = String(video.title || '').trim();
    const url = String(video.url || '').trim();

    if (!title || !url) return null;

    return {
      title,
      url,
      channel: String(video.channel || 'YouTube').trim(),
      thumbnail: String(video.thumbnail || '').trim(),
      publishedAt: String(video.published_at || '').trim()
    };
  };

  const formatCreatorDate = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const createCreatorCard = (video) => {
    const card = document.createElement('a');
    card.className = 'creator-card';
    card.href = video.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    const media = document.createElement('span');
    media.className = 'creator-card-media';

    const image = document.createElement('img');
    image.src = video.thumbnail || videoFallbackSvg;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.draggable = false;

    const play = document.createElement('span');
    play.className = 'creator-play';
    play.textContent = '▶';
    play.setAttribute('aria-hidden', 'true');

    const copy = document.createElement('span');
    copy.className = 'creator-card-copy';

    const title = document.createElement('strong');
    title.textContent = video.title;

    const meta = document.createElement('small');
    const date = formatCreatorDate(video.publishedAt);
    meta.textContent = date ? `${video.channel} · ${date}` : video.channel;

    media.append(image, play);
    copy.append(title, meta);
    card.append(media, copy);

    return card;
  };

  const setupCreatorVideos = async () => {
    if (!creatorVideos) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
    }, creatorFetchTimeoutMs);

    try {
      const response = await fetch('/api/creator-videos.php', {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });

      if (!response.ok) {
        if (creatorStatus) {
          creatorStatus.hidden = false;
          creatorStatus.textContent = 'Creator videos are unavailable right now.';
        }

        return;
      }

      const payload = await response.json();
      const videos = Array.isArray(payload.videos)
        ? payload.videos.map(normalizeCreatorVideo).filter(Boolean)
        : [];

      creatorVideos.replaceChildren(...videos.slice(0, 8).map(createCreatorCard));

      if (creatorStatus) {
        creatorStatus.hidden = videos.length > 0;
        creatorStatus.textContent = payload.configured === false
          ? 'Connect a YouTube API key to show creator videos.'
          : 'No creator videos found yet.';
      }
    } catch (_) {
      if (creatorStatus) {
        creatorStatus.hidden = false;
        creatorStatus.textContent = 'Creator videos are unavailable right now.';
      }
    } finally {
      window.clearTimeout(timeout);
    }
  };

  copyServerIpButtons.forEach((button) => {
    button.addEventListener('click', copyServerIp);
  });

  openJoinModalButtons.forEach((button) => {
    button.addEventListener('click', openJoinModal);
  });

  closeJoinModalButtons.forEach((button) => {
    button.addEventListener('click', closeJoinModal);
  });

  announcementButtons.forEach((button) => {
    button.addEventListener('click', openAnnouncementModal);
  });

  closeAnnouncementButtons.forEach((button) => {
    button.addEventListener('click', closeAnnouncementModal);
  });

  setupAnnouncementCarousel();
  setupAdminImageDrop();
  runWhenIdle(loadHeroVideo, 900);
  runWhenIdle(setupCreatorVideos, 1800);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && joinModal && !joinModal.hidden) {
      closeJoinModal();
    }

    if (event.key === 'Escape' && announcementModal && !announcementModal.hidden) {
      closeAnnouncementModal();
    }
  });

  const updateClearButton = () => {
    if (!searchInput || !clearButton) return;
    clearButton.hidden = searchInput.value.trim() === '';
  };

  const setPlayerSearchExpanded = (expanded) => {
    if (!searchInput) return;
    searchInput.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };

  const stopPlayerSearchRequest = () => {
    if (!playerSearchAbort) return;
    playerSearchAbort.abort();
    playerSearchAbort = null;
  };

  const hidePlayerResults = () => {
    window.clearTimeout(playerSearchTimer);
    stopPlayerSearchRequest();
    playerSearchRun += 1;

    if (playerSearchResults) {
      playerSearchResults.hidden = true;
      playerSearchResults.textContent = '';
    }

    setPlayerSearchExpanded(false);
  };

  const playerSearchIsEnabled = () => {
    return !playerSearchForm || playerSearchForm.dataset.playerSearchEnabled !== 'false';
  };

  const normalizeLeaderboardUrl = (value) => {
    const source = new URL(value, window.location.href);
    const isLeaderboardRoute = /^\/(?:leaderboards(?:\.php)?|players(?:\.php)?)\/?$/i.test(source.pathname);

    if (!isLeaderboardRoute) return null;

    const target = new URL('/leaderboards', window.location.origin);
    target.search = source.search;

    return target;
  };

  const setLeaderboardStatus = (message) => {
    const status = document.querySelector('[data-leaderboard-status]');
    if (status) status.textContent = message;
  };

  const failLeaderboardUpdate = () => {
    setLeaderboardStatus('The leaderboard could not be updated. Please try again.');
    return false;
  };

  const transplantChildren = (current, next) => {
    const fragment = document.createDocumentFragment();

    while (next.firstChild) {
      fragment.append(next.firstChild);
    }

    current.replaceChildren(fragment);
  };

  const readLeaderboardView = (root) => {
    const board = root.querySelector('#leaderboardRankings');

    return {
      board,
      topCard: root.querySelector('.leaderboard-top-card'),
      categoryGrid: root.querySelector('.leaderboard-category-grid'),
      heading: board ? board.querySelector('.leaderboard-section-heading') : null,
      filterRow: board ? board.querySelector('.leaderboard-view-row') : null,
      results: board ? board.querySelector('[data-leaderboard-results]') : null,
      categoryInput: board ? board.querySelector('[data-leaderboard-category-input]') : null,
      viewInput: board ? board.querySelector('[data-leaderboard-view-input]') : null,
      searchForm: root.querySelector('[data-player-search-form]'),
      searchInput: root.querySelector('#homeSearch'),
      searchLabel: board ? board.querySelector('label[for="homeSearch"]') : null
    };
  };

  const hasCompleteLeaderboardView = (view) => {
    return Object.values(view).every((node) => node instanceof Element);
  };

  const loadLeaderboardView = async (url, pushHistory = true) => {
    const board = document.getElementById('leaderboardRankings');

    if (!leaderboardPage || !board) return false;

    const targetUrl = normalizeLeaderboardUrl(url);
    if (!targetUrl) return false;

    if (leaderboardViewAbort) {
      leaderboardViewAbort.abort();
    }

    const run = leaderboardViewRun + 1;
    const controller = new AbortController();
    const scrollLeft = window.scrollX;
    const scrollTop = window.scrollY;
    leaderboardViewRun = run;
    leaderboardViewAbort = controller;
    board.classList.add('is-view-loading');
    board.setAttribute('aria-busy', 'true');
    setLeaderboardStatus('Updating leaderboard...');

    try {
      const response = await fetch(targetUrl.href, {
        headers: {
          Accept: 'text/html',
          'X-Requested-With': 'fetch'
        },
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller.signal
      });

      if (!response.ok) {
        return failLeaderboardUpdate();
      }

      const html = await response.text();
      if (run !== leaderboardViewRun) return null;

      const nextDocument = new DOMParser().parseFromString(html, 'text/html');
      const currentView = readLeaderboardView(document);
      const nextView = readLeaderboardView(nextDocument);

      if (!hasCompleteLeaderboardView(currentView) || !hasCompleteLeaderboardView(nextView)) {
        return failLeaderboardUpdate();
      }

      const focusedElement = document.activeElement;
      const focusAttribute = focusedElement instanceof HTMLAnchorElement
        ? ['data-leaderboard-category-link', 'data-leaderboard-view-link'].find((attribute) => focusedElement.hasAttribute(attribute))
        : null;

      transplantChildren(currentView.topCard, nextView.topCard);
      transplantChildren(currentView.categoryGrid, nextView.categoryGrid);
      transplantChildren(currentView.heading, nextView.heading);
      transplantChildren(currentView.filterRow, nextView.filterRow);
      transplantChildren(currentView.results, nextView.results);
      currentView.topCard.setAttribute('aria-label', nextView.topCard.getAttribute('aria-label') || 'Top leaderboard entries');
      currentView.categoryInput.value = nextView.categoryInput.value;
      currentView.viewInput.value = nextView.viewInput.value;
      currentView.searchForm.dataset.playerSearchEnabled = nextView.searchForm.dataset.playerSearchEnabled || 'true';
      currentView.searchInput.placeholder = nextView.searchInput.placeholder;
      currentView.searchInput.value = nextView.searchInput.value;
      currentView.searchLabel.textContent = nextView.searchLabel.textContent;
      currentView.board.setAttribute('aria-label', nextView.board.getAttribute('aria-label') || 'Leaderboard rankings');
      hidePlayerResults();
      updateClearButton();

      if (nextDocument.title) {
        document.title = nextDocument.title;
      }

      const nextRelativeUrl = `${targetUrl.pathname}${targetUrl.search}`;

      if (pushHistory) {
        if (nextRelativeUrl !== leaderboardCurrentUrl) {
          window.history.pushState({ mineacleLeaderboardView: true }, '', nextRelativeUrl);
        }
      }

      leaderboardCurrentUrl = nextRelativeUrl;
      setLeaderboardStatus('Leaderboard updated.');

      if (focusAttribute) {
        const nextFocusedControl = document.querySelector(`[${focusAttribute}][aria-current="page"]`);

        if (nextFocusedControl instanceof HTMLElement) {
          nextFocusedControl.focus({ preventScroll: true });
        }
      }

      window.requestAnimationFrame(() => {
        window.scrollTo(scrollLeft, scrollTop);
      });

      return true;
    } catch (error) {
      if (error && error.name === 'AbortError') return null;
      return failLeaderboardUpdate();
    } finally {
      if (leaderboardViewAbort === controller) {
        leaderboardViewAbort = null;
      }

      if (run === leaderboardViewRun) {
        board.classList.remove('is-view-loading');
        board.removeAttribute('aria-busy');
      }
    }
  };

  const applyPlayerStatusClass = (row, player) => {
    const status = player && player.punishment_status && typeof player.punishment_status === 'object'
      ? player.punishment_status
      : {};

    if (status.search_state === 'permanent_ban') {
      row.classList.add('is-perm-banned');
    } else if (status.search_state === 'temporary_ban') {
      row.classList.add('is-temp-banned');
    } else if (status.search_state === 'permanent_mute' || status.search_state === 'temporary_mute') {
      row.classList.add('is-muted');
    }
  };

  const playerHeadUrl = (player) => {
    const skin = player && player.skin && typeof player.skin === 'object' ? player.skin : {};
    const url = typeof skin.head === 'string' && skin.head !== '' ? skin.head : '';

    if (url === '') {
      return '';
    }

    return url;
  };

  const playerProfileUrl = (name) => {
    return `/player/${encodeURIComponent(name)}`;
  };

  const openTypedPlayerProfile = (event) => {
    if (!searchInput) return;

    if (playerSearchForm && playerSearchForm.dataset.playerSearchSubmit === 'filter') {
      return;
    }

    const query = searchInput.value.trim();

    if (query === '') {
      event.preventDefault();
      hidePlayerResults();
      return;
    }

    event.preventDefault();
    window.location.assign(playerProfileUrl(query));
  };

  const renderPlayerResults = (players) => {
    if (!playerSearchResults) {
      return;
    }

    if (!Array.isArray(players) || players.length === 0) {
      playerSearchResults.hidden = true;
      playerSearchResults.textContent = '';
      setPlayerSearchExpanded(false);
      return;
    }

    playerSearchResults.textContent = '';

    players.slice(0, 8).forEach((player) => {
      const name = typeof player.name === 'string' ? player.name.trim() : '';
      if (name === '') return;

      const displayName = typeof player.display_name === 'string' && player.display_name.trim() !== '' ? player.display_name.trim() : name;
      const rankLabel = typeof player.rank_label === 'string' ? player.rank_label.trim() : '';
      const rankColor = typeof player.rank_color === 'string' && /^#[0-9a-f]{6}$/i.test(player.rank_color.trim()) ? player.rank_color.trim() : '#bbbbbb';
      const statusLabel = typeof player.status_label === 'string' ? player.status_label.trim() : '';
      const statusLine = typeof player.status_line === 'string' ? player.status_line.trim() : '';
      const row = document.createElement('a');
      const copyNode = document.createElement('span');
      const nameNode = document.createElement('span');
      const metaNode = document.createElement('small');
      const actionNode = document.createElement('span');
      const headUrl = playerHeadUrl(player);

      row.className = 'player-search-option';
      row.classList.toggle('is-online-player', player.online === true);
      row.classList.toggle('is-offline-player', player.online !== true);
      row.href = playerProfileUrl(name);
      row.setAttribute('role', 'option');
      applyPlayerStatusClass(row, player);

      if (headUrl !== '') {
        const head = document.createElement('img');
        head.className = 'player-search-head';
        head.src = headUrl;
        head.alt = '';
        head.loading = 'lazy';
        head.decoding = 'async';
        head.setAttribute('aria-hidden', 'true');
        head.addEventListener('error', () => {
          head.remove();
          row.classList.add('has-no-avatar');
        }, { once: true });
        row.append(head);
      } else {
        row.classList.add('has-no-avatar');
      }

      nameNode.className = 'player-search-name ranked-player-name';

      if (rankLabel === '+') {
        nameNode.classList.add('is-plus-rank');
      }

      if (rankLabel !== '') {
        const rankNode = document.createElement('span');
        rankNode.className = 'ranked-player-name__rank';
        nameNode.style.setProperty('--rank-color', rankColor);
        rankNode.textContent = rankLabel;
        nameNode.append(rankNode);
      }

      const displayNode = document.createElement('span');
      displayNode.className = 'ranked-player-name__name';
      displayNode.textContent = displayName;
      nameNode.append(displayNode);

      copyNode.className = 'player-search-copy';
      copyNode.append(nameNode);

      if (statusLabel !== '' || statusLine !== '') {
        metaNode.className = 'player-search-meta';
        metaNode.textContent = [statusLabel, statusLine].filter(Boolean).join(' · ');
        copyNode.append(metaNode);
      }

      row.append(copyNode);

      actionNode.className = 'player-search-action';
      actionNode.textContent = 'View Stats';
      row.append(actionNode);

      playerSearchResults.append(row);
    });

    if (playerSearchResults.children.length === 0) {
      hidePlayerResults();
      return;
    }

    playerSearchResults.hidden = false;
    setPlayerSearchExpanded(true);
  };

  const loadPlayerResults = async (query) => {
    if (!playerSearchResults || query === '' || !playerSearchIsEnabled()) {
      hidePlayerResults();
      return;
    }

    stopPlayerSearchRequest();

    const run = playerSearchRun + 1;
    const controller = new AbortController();
    playerSearchRun = run;
    playerSearchAbort = controller;

    try {
      const response = await fetch(`/api/player-search.php?q=${encodeURIComponent(query)}&limit=8&t=${Date.now()}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal
      });

      if (!response.ok || run !== playerSearchRun) return;

      const payload = await response.json();
      if (run !== playerSearchRun) return;
      if (!searchInput || searchInput.value.trim() !== query) return;

      renderPlayerResults(payload && payload.success ? payload.players : []);
    } catch (error) {
      if (!error || error.name !== 'AbortError') {
        hidePlayerResults();
      }
    } finally {
      if (playerSearchAbort === controller) {
        playerSearchAbort = null;
      }
    }
  };

  const queuePlayerSearch = () => {
    if (!searchInput) return;

    if (!playerSearchIsEnabled()) {
      hidePlayerResults();
      return;
    }

    window.clearTimeout(playerSearchTimer);

    const query = searchInput.value.trim();

    if (query === '') {
      hidePlayerResults();
      return;
    }

    playerSearchTimer = window.setTimeout(() => {
      loadPlayerResults(query);
    }, playerSearchDelayMs);
  };

  if (searchInput && clearButton) {
    searchInput.addEventListener('input', () => {
      updateClearButton();
      queuePlayerSearch();
    });
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim() !== '') queuePlayerSearch();
    });
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hidePlayerResults();
    });
    clearButton.addEventListener('click', () => {
      searchInput.value = '';
      updateClearButton();
      hidePlayerResults();
      searchInput.focus();
    });
    updateClearButton();
  }

  if (playerSearchForm) {
    playerSearchForm.addEventListener('submit', openTypedPlayerProfile);
    playerSearchForm.addEventListener('submit', async (event) => {
      if (!leaderboardPage || event.defaultPrevented) return;

      event.preventDefault();
      hidePlayerResults();

      const actionUrl = new URL(playerSearchForm.action, window.location.href);
      const formData = new FormData(playerSearchForm);
      actionUrl.search = new URLSearchParams(formData).toString();
      actionUrl.hash = '';

      const filterUrl = `${actionUrl.pathname}${actionUrl.search}`;
      await loadLeaderboardView(filterUrl, true);
    });
  }

  document.addEventListener('click', (event) => {
    if (!playerSearchRoot || playerSearchRoot.contains(event.target)) return;
    hidePlayerResults();
  });

  document.addEventListener('click', async (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest('[data-leaderboard-category-link], [data-leaderboard-view-link], [data-leaderboard-page-link]');
    if (!(link instanceof HTMLAnchorElement) || link.target === '_blank') return;

    if (link.getAttribute('aria-disabled') === 'true') {
      event.preventDefault();
      return;
    }

    if (link.getAttribute('aria-current') === 'page') {
      event.preventDefault();
      return;
    }

    const url = normalizeLeaderboardUrl(link.href);
    if (!url) return;

    event.preventDefault();
    hidePlayerResults();

    await loadLeaderboardView(`${url.pathname}${url.search}`, true);
  });

  if (leaderboardPage) {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    window.addEventListener('popstate', async () => {
      const loaded = await loadLeaderboardView(window.location.href, false);

      if (loaded === false) {
        window.history.replaceState({ mineacleLeaderboardView: true }, '', leaderboardCurrentUrl);
      }
    });
  } else if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'auto';
  }

  const setServerStatus = (online, onlineCount) => {
    if (!statusNode || !statusCount) return;

    const format = statusNode.dataset.statusFormat || 'default';

    statusNode.classList.remove('is-loading', 'is-online', 'is-offline');
    statusNode.classList.add(online ? 'is-online' : 'is-offline');

    if (!online) {
      statusCount.textContent = format === 'hero-join' ? 'Server Offline' : 'Server offline';
      return;
    }

    const count = Number.isFinite(onlineCount) ? onlineCount : 0;
    statusCount.textContent = format === 'hero-join'
      ? `Join ${count} ${count === 1 ? 'Player' : 'Players'} Online`
      : `${count} Currently Playing`;
  };

  const saveServerStatusCache = (payload) => {
    if (!payload || !payload.online) return;

    try {
      window.localStorage.setItem(statusCacheKey, JSON.stringify({
        online: Boolean(payload.online),
        onlineCount: Number.isFinite(payload.onlineCount) ? payload.onlineCount : 0,
        updatedAt: Date.now()
      }));
    } catch (_) {
      // Local storage can be unavailable in private or restricted browsing.
    }
  };

  const loadServerStatusCache = () => {
    try {
      const cached = JSON.parse(window.localStorage.getItem(statusCacheKey) || 'null');

      if (!cached || Date.now() - cached.updatedAt > statusCacheMaxAgeMs) {
        return null;
      }

      return {
        online: Boolean(cached.online),
        onlineCount: Number.isFinite(Number(cached.onlineCount)) ? Number(cached.onlineCount) : 0
      };
    } catch (_) {
      return null;
    }
  };

  const applyCachedServerStatus = () => {
    const cached = loadServerStatusCache();

    if (!cached) return;

    setServerStatus(cached.online, cached.onlineCount);
  };

  const readNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  };

  const normalizeStatusPayload = (payload) => {
    if (!payload || typeof payload !== 'object') return null;

    const players = payload.players && typeof payload.players === 'object' ? payload.players : {};

    return {
      online: Boolean(payload.online),
      onlineCount: readNumber(payload.players_online ?? payload.online_players ?? players.online),
      source: typeof payload.source === 'string' ? payload.source : ''
    };
  };

  const fetchStatusJson = async (url, timeoutMs = statusFetchTimeoutMs) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal
      });

      if (!response.ok) return null;

      return await response.json();
    } catch (_) {
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const loadLocalServerStatus = async () => {
    const payload = await fetchStatusJson(`/api/server-status.php?t=${Date.now()}`);

    if (payload && payload.checked === false) {
      return null;
    }

    return normalizeStatusPayload(payload);
  };

  const loadExternalServerStatus = async () => {
    if (externalStatusFailureCount >= 2 && Date.now() - lastExternalStatusCheck < 60000) {
      return null;
    }

    lastExternalStatusCheck = Date.now();

    const providers = [
      `https://api.mcsrvstat.us/3/${encodeURIComponent(serverIp)}`,
      `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(serverIp)}`
    ];

    for (const url of providers) {
      const payload = await fetchStatusJson(`${url}?t=${Date.now()}`, 2600);
      const status = normalizeStatusPayload(payload);

      if (status && status.online) {
        externalStatusFailureCount = 0;
        return status;
      }
    }

    externalStatusFailureCount += 1;
    return null;
  };

  const loadServerStatus = async () => {
    if (!statusNode || !statusCount) return;
    if (statusRequestActive) return;

    statusRequestActive = true;

    try {
      const payload = await loadLocalServerStatus() || await loadExternalServerStatus();

      if (!payload) {
        return;
      }

      setServerStatus(payload.online, payload.onlineCount);
      saveServerStatusCache(payload);
    } finally {
      statusRequestActive = false;
    }
  };

  applyCachedServerStatus();
  loadServerStatus();
  window.setInterval(loadServerStatus, statusRefreshMs);
  window.addEventListener('focus', loadServerStatus);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadServerStatus();
  });
})();
