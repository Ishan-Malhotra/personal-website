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

    // --- Touch & Drag Handlers ---
    function getPositionX(event) {
        return event.type.includes('mouse') ? event.clientX : event.touches[0].clientX;
    }

    function touchStart(event) {
        isDragging = true;
        startX = getPositionX(event);
        polaroidFrame.style.cursor = 'grabbing';
        updateTrackPosition(false); // remove transition instantly
    }

    function touchMove(event) {
        if (!isDragging) return;
        const currentPosition = getPositionX(event);
        currentTranslate = currentPosition - startX;

        // Add resistance at the start and end of the roll
        if (currentIndex === 0 && currentTranslate > 0) {
            currentTranslate *= 0.3;
        } else if (currentIndex === photos.length - 1 && currentTranslate < 0) {
            currentTranslate *= 0.3;
        }

        updateTrackPosition(false);
    }

    function touchEnd() {
        if (!isDragging) return;
        isDragging = false;
        polaroidFrame.style.cursor = 'grab';

        const threshold = polaroidFrame.clientWidth * 0.15; // 15% to trigger

        if (currentTranslate < -threshold) {
            navigateFixed('next');
        } else if (currentTranslate > threshold) {
            navigateFixed('prev');
        } else {
            currentTranslate = 0;
            updateTrackPosition(true); // Snap back to nearest photo
        }
    }

    // Mouse events
    polaroidFrame.addEventListener('mousedown', touchStart);
    window.addEventListener('mouseup', touchEnd);
    window.addEventListener('mousemove', touchMove);

    // Touch events
    polaroidFrame.addEventListener('touchstart', touchStart);
    polaroidFrame.addEventListener('touchend', touchEnd);
    polaroidFrame.addEventListener('touchmove', touchMove);

    // Keyboard Listeners
    window.addEventListener('keydown', (e) => {
        if (['ArrowRight', 'd', 's'].includes(e.key)) {
            navigateFixed('next');
        } else if (['ArrowLeft', 'a', 'w'].includes(e.key)) {
            navigateFixed('prev');
        } else if (e.key === 'Escape') {
            window.location.href = 'index.html';
        }
    });

    // Back Button
    backBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});
