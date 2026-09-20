// Mobile UI Adapter for Oldale Town
// Detects mobile devices and injects a GBA-style controller interface

(function () {
    // 1. Detection: check for mobile width
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    if (!isMobile) return;

    console.log('Mobile device detected. Initializing GBA Adapter...');

    // 2. UI Injection
    const gameCanvas = document.getElementById('game-canvas');
    if (!gameCanvas) {
        console.error('Game canvas not found!');
        return;
    }

    // Create Wrapper (Shell)
    const wrapper = document.createElement('div');
    wrapper.className = 'gba-body';

    // Create Screen Container
    const screenDiv = document.createElement('div');
    screenDiv.className = 'screen';

    // Insert Wrapper before Canvas, then move Canvas inside
    gameCanvas.parentNode.insertBefore(wrapper, gameCanvas);
    screenDiv.appendChild(gameCanvas);

    // Also move the transition overlay if it exists
    const overlay = document.getElementById('transition-overlay');
    if (overlay) screenDiv.appendChild(overlay);

    wrapper.appendChild(screenDiv);

    // Create Controls
    const controlsHTML = `
        <div class="controls">
            <div class="controls-top">
                <div class="d-pad">
                    <button data-key="ArrowUp" class="d-btn up"></button>
                    <button data-key="ArrowLeft" class="d-btn left"></button>
                    <button data-key="ArrowRight" class="d-btn right"></button>
                    <button data-key="ArrowDown" class="d-btn down"></button>
                    <div class="d-center"></div>
                </div>
                <div class="action-pad">
                    <button data-key="Enter" class="a-btn" aria-label="Interact with boombox">A</button>
                </div>
            </div>
            <div class="spotify-pad spotify-hidden" aria-label="Spotify player" aria-hidden="true">
                <iframe
                    class="spotify-embed-frame-mobile"
                    src="https://open.spotify.com/embed/playlist/7C6Ex5Rah9aCJxBHNxscch?utm_source=generator&theme=0&compact=1"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy">
                </iframe>
            </div>
        </div>
    `;

    // Inject controls safely
    const controlsDiv = document.createElement('div');
    controlsDiv.innerHTML = controlsHTML;
    // Append the children of controlsDiv to wrapper (to avoid extra div)
    while (controlsDiv.firstChild) {
        wrapper.appendChild(controlsDiv.firstChild);
    }

    // 3. Input Bridge
    const buttons = wrapper.querySelectorAll('button[data-key]');

    // 4. Mobile-only Spotify embed: force compact single-row UI
    const spotifyIframe = wrapper.querySelector('.spotify-embed-frame-mobile');
    if (spotifyIframe && window.innerWidth <= 768) {
        spotifyIframe.src = 'https://open.spotify.com/embed/playlist/7C6Ex5Rah9aCJxBHNxscch?utm_source=generator&theme=0&compact=1';
    }

    // 5. Mobile-only: scale the compact Spotify embed to fit the pad width.
    // Compact embeds need ~300px minimum; the GBA shell is often narrower, so we
    // scale down from a fixed native size instead of clipping the play button.
    function scaleSpotifyEmbed() {
        if (window.innerWidth > 768) return;
        const iframe = document.querySelector('.spotify-embed-frame-mobile');
        const container = iframe ? iframe.parentElement : null; // .spotify-pad
        if (!iframe || !container || container.classList.contains('spotify-hidden')) return;

        const nativeWidth = 300;
        const nativeHeight = 80;
        // Subtract inset ring (2px each side) so content stays inside the pad
        const availableWidth = Math.max(0, container.clientWidth - 4);
        if (availableWidth <= 0) return;

        const scale = Math.min(1, availableWidth / nativeWidth);

        iframe.style.width = nativeWidth + 'px';
        iframe.style.height = nativeHeight + 'px';
        iframe.style.transformOrigin = 'top left';
        iframe.style.transform = scale < 1 ? `scale(${scale})` : 'none';

        container.style.height = Math.ceil(nativeHeight * scale) + 'px';
        container.style.overflow = 'hidden';
    }

    // Expose for game logic + resize handler
    window.scaleSpotifyEmbed = scaleSpotifyEmbed;
    window.addEventListener('resize', () => {
        if (typeof window.scaleSpotifyEmbed === 'function') {
            window.scaleSpotifyEmbed();
        }
    }, { passive: true });

    // Re-scale after layout settles (panel max-height transition / font load)
    const scheduleScale = () => {
        requestAnimationFrame(() => {
            scaleSpotifyEmbed();
            setTimeout(scaleSpotifyEmbed, 200);
        });
    };
    // Observe class changes on the pad (spotify-hidden toggled by game loop)
    const pad = wrapper.querySelector('.spotify-pad');
    if (pad && typeof MutationObserver !== 'undefined') {
        new MutationObserver(scheduleScale).observe(pad, {
            attributes: true,
            attributeFilter: ['class', 'aria-hidden']
        });
    }

    // Helper to dispatch key events
    const triggerKey = (key, type) => {
        const event = new KeyboardEvent(type, {
            key: key,
            bubbles: true,
            cancelable: true,
            view: window
        });
        window.dispatchEvent(event);
    };

    buttons.forEach(btn => {
        const key = btn.getAttribute('data-key');

        const preventDefault = (e) => {
            if (e.cancelable) e.preventDefault();
        };

        // Pointer Down -> KeyDown
        btn.addEventListener('pointerdown', (e) => {
            preventDefault(e);
            btn.classList.add('active');
            triggerKey(key, 'keydown');
        });

        // Pointer Up/Leave -> KeyUp
        const endHandler = (e) => {
            preventDefault(e);
            btn.classList.remove('active');
            triggerKey(key, 'keyup');
        };

        btn.addEventListener('pointerup', endHandler);
        btn.addEventListener('pointerleave', endHandler);
        btn.addEventListener('pointercancel', endHandler);

        // Disable context menu
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
    });

    console.log('GBA Adapter initialized.');

})();
