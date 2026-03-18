document.addEventListener('DOMContentLoaded', async () => {
    const polaroidFrame = document.getElementById('polaroid-frame');
    const photoTrack = document.getElementById('photo-track');
    const backBtn = document.getElementById('back-btn');
    const thumbnailNav = document.getElementById('thumbnail-nav');

    let photos = [];
    let currentIndex = 0;

    // Swipe & Drag State
    let startX = 0;
    let currentTranslate = 0;
    let isDragging = false;

    // Fetch Gallery Data
    try {
        const response = await fetch('./galleryData.json');
        photos = await response.json();

        // Shuffle photos using Fisher-Yates
        for (let i = photos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [photos[i], photos[j]] = [photos[j], photos[i]];
        }

        if (photos.length > 0) {
            generateThumbnails();
            generateSlides();
        } else {
            photoTrack.innerHTML = '<p style="color:black;">No photos found.</p>';
        }
    } catch (error) {
        console.error('Error loading gallery data:', error);
        photoTrack.innerHTML = '<p style="color:black;">Error loading gallery.</p>';
    }

    // Generate Thumbnails
    function generateThumbnails() {
        photos.forEach((photo, index) => {
            const thumb = document.createElement('img');
            thumb.src = photo.url;
            thumb.classList.add('thumbnail');
            if (index === currentIndex) thumb.classList.add('active');

            thumb.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the polaroidFrame drag
                if (currentIndex === index) return;
                navigateTo(index);
            });

            thumbnailNav.appendChild(thumb);
        });
    }

    // Generate Track Slides
    function generateSlides() {
        photoTrack.innerHTML = '';
        photos.forEach((photo) => {
            const slide = document.createElement('div');
            slide.className = 'photo-slide';
            slide.innerHTML = `
                <img src="${photo.url}" alt="${photo.caption}">
                <div class="caption-container">
                    <p id="caption">${photo.caption}</p>
                    <p id="date">${photo.date}</p>
                </div>
            `;
            // Drag protection for the image
            const img = slide.querySelector('img');
            if (img) img.addEventListener('dragstart', (e) => e.preventDefault());
            photoTrack.appendChild(slide);
        });
        updateTrackPosition(false);
    }

    function syncThumbnails() {
        const thumbs = thumbnailNav.querySelectorAll('.thumbnail');
        thumbs.forEach((thumb, index) => {
            if (index === currentIndex) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
    }

    // Move the track container
    function updateTrackPosition(transition = true) {
        if (transition) {
            photoTrack.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        } else {
            photoTrack.style.transition = 'none';
        }
        // Move the track by 100% of the slide width per index, plus finger drag translate
        photoTrack.style.transform = `translateX(calc(-${currentIndex * 100}% + ${currentTranslate}px))`;
    }

    // Navigate to a specific index
    function navigateTo(index) {
        currentIndex = index;
        currentTranslate = 0;
        updateTrackPosition(true);
        syncThumbnails();
    }

    // Arrow controls navigation
    function navigateFixed(direction) {
        if (photos.length === 0) return;

        let newIndex = currentIndex;
        if (direction === 'next' && currentIndex < photos.length - 1) {
            newIndex++;
        } else if (direction === 'prev' && currentIndex > 0) {
            newIndex--;
        } else if (direction === 'next' && currentIndex === photos.length - 1) {
            newIndex = 0; // Loop forward
        } else if (direction === 'prev' && currentIndex === 0) {
            newIndex = photos.length - 1; // Loop backward
        }

        navigateTo(newIndex);
    }

    // --- Touch, Pan & Zoom Engine ---
    let lastTapTime = 0;
    let isZoomed = false;
    let zoomLevel = 1;
    let panX = 0, panY = 0;
    let lastPanX = 0, lastPanY = 0;

    // Pinch variables
    let initialPinchDistance = null;
    let baseZoomLevel = 1;
    let startY = 0;

    function resetZoom() {
        isZoomed = false;
        zoomLevel = 1;
        panX = 0; panY = 0;
        lastPanX = 0; lastPanY = 0;
        document.body.classList.remove('zoomed-in');

        const currentImg = document.querySelectorAll('.photo-slide img')[currentIndex];
        if (currentImg) {
            currentImg.style.transform = `translate(0px, 0px) scale(1)`;
            currentImg.classList.remove('dragging');
        }
    }

    function toggleZoom() {
        if (isZoomed) {
            resetZoom();
        } else {
            isZoomed = true;
            zoomLevel = 2; // Default tap zoom level
            panX = 0; panY = 0;
            document.body.classList.add('zoomed-in');

            const currentImg = document.querySelectorAll('.photo-slide img')[currentIndex];
            if (currentImg) {
                currentImg.style.transform = `translate(0px, 0px) scale(2)`;
            }
        }
    }

    function getDistance(touches) {
        return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    }

    function getPositionX(event) { return event.type.includes('mouse') ? event.clientX : event.touches[0].clientX; }
    function getPositionY(event) { return event.type.includes('mouse') ? event.clientY : event.touches[0].clientY; }

    function touchStart(event) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;

        // Double tap or Single tap (we'll map single click on the image directly to toggle if zoomed in later, but standard double-tap is universal)
        if (tapLength < 300 && tapLength > 0 && event.touches && event.touches.length === 1) {
            toggleZoom();
            event.preventDefault();
        }
        lastTapTime = currentTime;

        // Pinch to Zoom init
        if (event.touches && event.touches.length === 2) {
            isDragging = false; // kill swipe
            initialPinchDistance = getDistance(event.touches);
            baseZoomLevel = zoomLevel;

            const currentImg = document.querySelectorAll('.photo-slide img')[currentIndex];
            if (currentImg) currentImg.classList.add('dragging');

            // Native polaroid enters zoom state immediately
            document.body.classList.add('zoomed-in');
            isZoomed = true;
            return;
        }

        // Standard 1 finger interaction
        isDragging = true;
        startX = getPositionX(event);
        startY = getPositionY(event);
        polaroidFrame.style.cursor = 'grabbing';

        if (isZoomed) {
            // Initiate Pan
            lastPanX = panX;
            lastPanY = panY;
            const currentImg = document.querySelectorAll('.photo-slide img')[currentIndex];
            if (currentImg) currentImg.classList.add('dragging');
        } else {
            // Initiate Swipe
            updateTrackPosition(false);
        }
    }

    function clampPan(val, maxRange) {
        if (val > maxRange) return maxRange;
        if (val < -maxRange) return -maxRange;
        return val;
    }

    function touchMove(event) {
        if (event.touches && event.touches.length === 2) {
            // Handle Pinch
            const currentDistance = getDistance(event.touches);
            const scaleFactor = currentDistance / initialPinchDistance;
            zoomLevel = Math.max(0.5, baseZoomLevel * scaleFactor); // Limit min pinch out

            const currentImg = document.querySelectorAll('.photo-slide img')[currentIndex];
            if (currentImg) {
                currentImg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
            }
            return;
        }

        if (!isDragging) return;

        const currentX = getPositionX(event);
        const currentY = getPositionY(event);

        if (isZoomed) {
            // Handle Panning
            const dx = currentX - startX;
            const dy = currentY - startY;

            // Swipe down to dismiss gesture detection (only if zoomed out far or pan at top edge)
            if (dy > 100 && zoomLevel <= 1.5 && Math.abs(dx) < 50) {
                resetZoom();
                isDragging = false;
                return;
            }

            // Calculate basic panning constraint based on zoom level
            const maxPan = (zoomLevel - 1) * 200; // rough heuristic constraint
            if (maxPan > 0) {
                panX = clampPan(lastPanX + dx, maxPan);
                panY = clampPan(lastPanY + dy, maxPan);
            }

            const currentImg = document.querySelectorAll('.photo-slide img')[currentIndex];
            if (currentImg) {
                currentImg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
            }
        } else {
            // Handle Gallery Swipe
            currentTranslate = currentX - startX;
            if (currentIndex === 0 && currentTranslate > 0) currentTranslate *= 0.3;
            else if (currentIndex === photos.length - 1 && currentTranslate < 0) currentTranslate *= 0.3;
            updateTrackPosition(false);
        }
    }

    function touchEnd(event) {
        // Pinch end logic
        if (isZoomed && event.touches && event.touches.length === 0) {
            const currentImg = document.querySelectorAll('.photo-slide img')[currentIndex];
            if (currentImg) currentImg.classList.remove('dragging');

            if (zoomLevel < 1) {
                // Snap back to normal
                resetZoom();
                return;
            }

            // Keep zoomed, lock in new pan
            lastPanX = panX;
            lastPanY = panY;
            isDragging = false;
            return;
        }

        if (!isDragging) return;
        isDragging = false;
        polaroidFrame.style.cursor = 'grab';

        if (!isZoomed) {
            const threshold = polaroidFrame.clientWidth * 0.15;
            if (currentTranslate < -threshold) navigateFixed('next');
            else if (currentTranslate > threshold) navigateFixed('prev');
            else {
                currentTranslate = 0;
                updateTrackPosition(true);
            }
        }
    }

    // Attach interaction to Track instead of Frame so clicks map correctly
    photoTrack.addEventListener('mousedown', touchStart);
    window.addEventListener('mouseup', touchEnd);
    window.addEventListener('mousemove', touchMove);

    photoTrack.addEventListener('touchstart', touchStart, { passive: false });
    photoTrack.addEventListener('touchend', touchEnd);
    photoTrack.addEventListener('touchmove', touchMove, { passive: false });

    // Single click/tap toggles zoom if active
    photoTrack.addEventListener('click', (e) => {
        if (!isZoomed) return;
        // Allows single tap to close zoom on desktop/mobile if already zoomed
        if (!e.target.closest('.thumbnail')) resetZoom();
    });

    // Keyboard Listeners
    window.addEventListener('keydown', (e) => {
        if (['ArrowRight', 'd', 's'].includes(e.key)) {
            if (isZoomed) resetZoom();
            navigateFixed('next');
        } else if (['ArrowLeft', 'a', 'w'].includes(e.key)) {
            if (isZoomed) resetZoom();
            navigateFixed('prev');
        } else if (e.key === 'Escape') {
            if (isZoomed) resetZoom();
            else window.location.href = 'index.html';
        }
    });

    // Back Button
    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});
