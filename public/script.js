// Ensure all resources are loaded
window.addEventListener('load', () => {
    console.log('All resources loaded successfully');
});

document.addEventListener('DOMContentLoaded', () => {
    // --- Physics Engine ---
    const container = document.getElementById('physics-container');
    const floaters = document.querySelectorAll('.floater');

    // Randomize initial positions
    floaters.forEach(floater => {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        floater.style.left = `${x}px`;
        floater.style.top = `${y}px`;
    });

    // Mouse/Touch Interaction
    document.addEventListener('mousemove', (e) => {
        repelFloaters(e.clientX, e.clientY);
    });

    document.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        repelFloaters(touch.clientX, touch.clientY);
    });

    function repelFloaters(cursorX, cursorY) {
        floaters.forEach(floater => {
            const rect = floater.getBoundingClientRect();
            const floaterX = rect.left + rect.width / 2;
            const floaterY = rect.top + rect.height / 2;

            const dist = Math.hypot(cursorX - floaterX, cursorY - floaterY);
            const maxDist = 200; // Interaction radius

            if (dist < maxDist) {
                const angle = Math.atan2(floaterY - cursorY, floaterX - cursorX);
                const force = (maxDist - dist) / maxDist;
                const moveX = Math.cos(angle) * force * 50;
                const moveY = Math.sin(angle) * force * 50;

                floater.style.transform = `translate(${moveX}px, ${moveY}px)`;
            } else {
                floater.style.transform = '';
            }
        });
    }

    // --- API Integration ---
    const reportForm = document.getElementById('report-form');
    const itemsGrid = document.getElementById('items-grid');
    const notificationArea = document.getElementById('notification-area');
    const searchInput = document.getElementById('item-search');
    const itemsMapContainer = document.getElementById('items-map');
    const toggleMapBtn = document.getElementById('toggle-map-view');
    let allItems = [];
    let pickerMap, itemsMap;
    let pickerMarker;
    let itemMarkers = [];

    // Initialize Maps
    function initMapPicker() {
        // Default to New York or user's location if possible
        const defaultLat = 40.7128;
        const defaultLng = -74.0060;

        pickerMap = L.map('map-picker').setView([defaultLat, defaultLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(pickerMap);

        // Handle map clicks
        pickerMap.on('click', function (e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;

            if (pickerMarker) {
                pickerMarker.setLatLng(e.latlng);
            } else {
                pickerMarker = L.marker(e.latlng).addTo(pickerMap);
            }

            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lng;

            // Reverse Geocoding (Optional: Fetch address from lat/lng)
            // For now, we just rely on user input for text location, but this sets the precise pin.
        });

        // Try to get user location with timeout
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    pickerMap.setView([lat, lng], 15);
                },
                error => {
                    console.log('Geolocation error:', error.message);
                    // Keep default location
                },
                {
                    timeout: 5000,
                    enableHighAccuracy: false
                }
            );
        }
    }

    function initItemsMap() {
        itemsMap = L.map('items-map').setView([40.7128, -74.0060], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(itemsMap);
    }

    // Toggle Map View
    let isMapView = false;
    toggleMapBtn.addEventListener('click', () => {
        isMapView = !isMapView;
        if (isMapView) {
            itemsGrid.style.display = 'none';
            itemsMapContainer.style.display = 'block';
            toggleMapBtn.innerHTML = '<i class="fas fa-th-large"></i> Toggle Grid View';
            setTimeout(() => {
                itemsMap.invalidateSize(); // Fix rendering issues
                populateItemsMap(allItems);
            }, 100);
        } else {
            itemsGrid.style.display = 'grid';
            itemsMapContainer.style.display = 'none';
            toggleMapBtn.innerHTML = '<i class="fas fa-map-marked-alt"></i> Toggle Map View';
        }
    });

    function populateItemsMap(items) {
        // Clear existing markers
        itemMarkers.forEach(marker => itemsMap.removeLayer(marker));
        itemMarkers = [];

        items.forEach(item => {
            if (item.latitude && item.longitude) {
                const marker = L.marker([item.latitude, item.longitude])
                    .addTo(itemsMap)
                    .bindPopup(`
                        <div class="map-popup-content">
                            <h3>${item.item_name}</h3>
                            <p><i class="fas fa-map-marker-alt"></i> ${item.location}</p>
                            <p><i class="far fa-calendar-alt"></i> ${new Date(item.date_found_lost).toLocaleDateString()}</p>
                            <div class="popup-actions" style="display: flex; flex-direction: column; gap: 5px; margin-top: 10px;">
                                <a href="https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}" 
                                   target="_blank" 
                                   class="btn secondary" style="font-size: 0.8rem; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 5px;">
                                   <i class="fas fa-location-arrow"></i> Open in Google Maps
                                </a>
                                <button class="btn primary contact-btn-map" style="font-size: 0.8rem;" 
                                        data-contact="${item.contact_info}" 
                                        data-item="${item.item_name}">
                                        <i class="fas fa-envelope"></i> Contact
                                </button>
                            </div>
                        </div>
                    `);
                itemMarkers.push(marker);
            }
        });

        // Fit bounds if markers exist
        if (itemMarkers.length > 0) {
            const group = new L.featureGroup(itemMarkers);
            itemsMap.fitBounds(group.getBounds());
        }
    }

    // Handle popup clicks (Event delegation doesn't work easily inside Leaflet popups, so we attach listener globally)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('contact-btn-map')) {
            const contact = e.target.getAttribute('data-contact');
            const item = e.target.getAttribute('data-item');
            openContactModal(contact, item);
        }
    });

    // Fetch and Display Items
    async function fetchItems() {
        try {
            const response = await fetch('/api/items');
            allItems = await response.json(); // Store all items
            renderItems(allItems);
            if (isMapView) {
                populateItemsMap(allItems);
            }
        } catch (error) {
            console.error('Error fetching items:', error);
        }
    }

    // Search Functionality
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        if (!query) {
            renderItems(allItems);
            if (isMapView) populateItemsMap(allItems);
            return;
        }

        const filteredItems = allItems.filter(item => {
            // Approximate match logic: check name, location, and type
            return (
                item.item_name.toLowerCase().includes(query) ||
                item.location.toLowerCase().includes(query) ||
                item.type.toLowerCase().includes(query) ||
                (item.unique_identifiers && item.unique_identifiers.toLowerCase().includes(query))
            );
        });

        renderItems(filteredItems);
        if (isMapView) populateItemsMap(filteredItems);
    });

    function renderItems(items) {
        if (items.length === 0) {
            itemsGrid.innerHTML = '<p style="text-align: center; width: 100%; grid-column: 1/-1; color: #94a3b8;">No items found matching your search.</p>';
            return;
        }
        itemsGrid.innerHTML = items.map(item => `
            <div class="item-card">
                <img src="${item.image_url || 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22300%22%20height%3D%22200%22%20fill%3D%22%23334155%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2220%22%20fill%3D%22%2394a3b8%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E'}" alt="${item.item_name}" class="item-image" onerror="this.onerror=null;this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22300%22%20height%3D%22200%22%20fill%3D%22%23334155%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2220%22%20fill%3D%22%2394a3b8%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E'">
                <div class="item-details">
                    <span class="item-tag tag-${item.type}">${item.type}</span>
                    <h3>${item.item_name}</h3>
                    <p><i class="fas fa-map-marker-alt"></i> ${item.location}</p>
                    <p><i class="far fa-clock"></i> ${new Date(item.date_found_lost).toLocaleDateString()} at ${item.time_found_lost}</p>
                    <button class="btn secondary contact-btn" data-contact="${item.contact_info}" data-item="${item.item_name}">Contact</button>
                </div>
            </div>
        `).join('');

        // Attach event listeners to contact buttons
        document.querySelectorAll('.contact-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const contactInfo = e.target.getAttribute('data-contact');
                const itemName = e.target.getAttribute('data-item');
                openContactModal(contactInfo, itemName);
            });
        });
    }

    // --- Contact Modal Logic ---
    const contactModal = document.getElementById('contact-modal');
    const modalCloseBtn = contactModal.querySelector('.modal-close');
    const modalItemName = document.getElementById('modal-item-name');
    const modalContactInfo = document.getElementById('modal-contact-info');
    const copyContactBtn = document.getElementById('copy-contact-btn');

    function openContactModal(contactInfo, itemName) {
        modalItemName.textContent = itemName;
        modalContactInfo.textContent = contactInfo;
        contactModal.classList.add('active');
    }

    function closeContactModal() {
        contactModal.classList.remove('active');
    }

    modalCloseBtn.addEventListener('click', closeContactModal);

    contactModal.addEventListener('click', (e) => {
        if (e.target === contactModal) {
            closeContactModal();
        }
    });

    // Event Delegation for Contact Buttons
    itemsGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('contact-btn')) {
            const contact = e.target.dataset.contact;
            const item = e.target.dataset.item;
            openContactModal(contact, item);
        }
    });

    // Copy to Clipboard
    copyContactBtn.addEventListener('click', () => {
        const text = modalContactInfo.textContent;
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Contact info copied to clipboard!', 'success');
            // Visual feedback on button
            const originalIcon = copyContactBtn.innerHTML;
            copyContactBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                copyContactBtn.innerHTML = originalIcon;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            showNotification('Failed to copy contact info.', 'error');
        });
    });

    // --- File Upload UI ---
    const fileInput = document.getElementById('image');
    const fileNameDisplay = document.getElementById('file-name');

    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = fileInput.files[0].name;
            fileInput.parentElement.classList.remove('input-error');
        } else {
            fileNameDisplay.textContent = 'Tap to Capture or Upload Image';
        }
    });

    // --- Form Validation & Submission ---
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Manual Validation
        let isValid = true;
        const requiredInputs = reportForm.querySelectorAll('[required]');

        requiredInputs.forEach(input => {
            if (!input.value) {
                isValid = false;
                if (input.type === 'file') {
                    input.parentElement.classList.add('input-error');
                } else {
                    input.classList.add('input-error');
                }
            } else {
                if (input.type === 'file') {
                    input.parentElement.classList.remove('input-error');
                } else {
                    input.classList.remove('input-error');
                }
            }
        });

        if (!isValid) {
            // Shake animation or focus first error
            const firstError = reportForm.querySelector('.input-error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        const formData = new FormData(reportForm);

        try {
            const response = await fetch('/api/items', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                // alert('Item reported successfully!');
                reportForm.reset();
                fileNameDisplay.textContent = 'Tap to Capture or Upload Image';

                // Reset time picker display
                document.getElementById('time-display').value = '';
                document.getElementById('time_found_lost').value = '';

                // Remove all error styles
                requiredInputs.forEach(input => {
                    input.classList.remove('input-error');
                    if (input.parentElement.classList.contains('file-upload-wrapper')) {
                        input.parentElement.classList.remove('input-error');
                    }
                });

                fetchItems(); // Refresh grid
                showNotification('Report submitted successfully!', 'success');
            } else {
                const errorData = await response.json();
                showNotification('Failed to report item: ' + (errorData.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error reporting item:', error);
            showNotification('Error reporting item. Please try again.', 'error');
        }
    });

    // Clear errors on input
    const inputs = reportForm.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('input-error');
        });
        input.addEventListener('change', () => {
            input.classList.remove('input-error');
        });
    });

    // --- Notifications ---
    function playNotificationSound(type) {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';

        if (type === 'success') {
            oscillator.frequency.setValueAtTime(500, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
        } else if (type === 'error') {
            oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
            oscillator.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.2);
            oscillator.type = 'sawtooth';
        } else {
            oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
        }

        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    }

    function showNotification(message, type = 'info', duration = 5000) {
        playNotificationSound(type);

        const notif = document.createElement('div');
        notif.className = `notification ${type}`;

        let iconClass = 'fa-info-circle';
        let title = 'Info';
        if (type === 'success') { iconClass = 'fa-check-circle'; title = 'Success'; }
        if (type === 'error') { iconClass = 'fa-exclamation-circle'; title = 'Error'; }

        notif.innerHTML = `
            <div class="notification-icon"><i class="fas ${iconClass}"></i></div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close"><i class="fas fa-times"></i></button>
            <div class="notification-progress" style="animation-duration: ${duration}ms"></div>
        `;

        // Close button logic
        const closeBtn = notif.querySelector('.notification-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideNotification(notif);
        });

        // Click to dismiss
        notif.addEventListener('click', () => {
            hideNotification(notif);
        });

        notificationArea.appendChild(notif);

        // Auto dismiss
        const timeout = setTimeout(() => {
            hideNotification(notif);
        }, duration);

        // Pause on hover (optional enhancement, requires more complex logic for progress bar)
    }

    function hideNotification(notif) {
        notif.classList.add('hiding');
        notif.addEventListener('animationend', () => {
            notif.remove();
        });
    }

    // Poll for notifications (Mock)
    setInterval(async () => {
        try {
            const response = await fetch('/api/notifications');
            const notifications = await response.json();
            notifications.forEach(n => showNotification(n.message, 'info'));
        } catch (error) {
            // console.error('Error polling notifications:', error);
        }
    }, 10000);

    // --- Audio Context for Scroll Sound ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function playTick(type = 'default') {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';

        // Different tones for hours vs minutes
        if (type === 'hour') {
            // Lower, warmer tone for hours
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.06);
            gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.06);
        } else if (type === 'minute') {
            // Higher, crisper tone for minutes
            oscillator.frequency.setValueAtTime(900, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        } else {
            // Default tick sound
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        }

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    }

    // --- Custom Time Picker Logic ---
    const hourScroll = document.getElementById('hour-scroll');
    const minuteScroll = document.getElementById('minute-scroll');
    const timeInput = document.getElementById('time_found_lost');
    const timeDisplay = document.getElementById('time-display');
    const timePickerContainer = document.querySelector('.time-picker-container');

    let lastHourIndex = -1;
    let lastMinuteIndex = -1;

    // Toggle Picker
    timeDisplay.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasActive = timePickerContainer.classList.contains('active');
        timePickerContainer.classList.toggle('active');

        if (!wasActive) {
            // Picker is opening, set scroll position
            setTimeout(() => {
                // Default to 12:00 if not set, or parse current value
                let [h, m] = timeInput.value.split(':').map(Number);
                if (isNaN(h)) h = 12;
                if (isNaN(m)) m = 0;

                hourScroll.scrollTop = h * 40;
                minuteScroll.scrollTop = m * 40;
                updateTimeInput();
            }, 50); // Small delay to allow display:flex to apply
        }
    });

    // Close Picker on Outside Click
    document.addEventListener('click', (e) => {
        if (!timePickerContainer.contains(e.target) && e.target !== timeDisplay) {
            timePickerContainer.classList.remove('active');
        }
    });

    function populateTimePicker() {
        // ... (existing code) ...
        // Padding for top
        hourScroll.innerHTML = '<div class="time-item"></div>';
        minuteScroll.innerHTML = '<div class="time-item"></div>';

        // Hours 00-23
        for (let i = 0; i < 24; i++) {
            const div = document.createElement('div');
            div.className = 'time-item';
            div.textContent = i.toString().padStart(2, '0');
            div.dataset.value = i.toString().padStart(2, '0');
            hourScroll.appendChild(div);
        }

        // Minutes 00-59
        for (let i = 0; i < 60; i++) {
            const div = document.createElement('div');
            div.className = 'time-item';
            div.textContent = i.toString().padStart(2, '0');
            div.dataset.value = i.toString().padStart(2, '0');
            minuteScroll.appendChild(div);
        }

        // Padding for bottom
        hourScroll.appendChild(document.createElement('div'));
        hourScroll.lastChild.className = 'time-item';
        minuteScroll.appendChild(document.createElement('div'));
        minuteScroll.lastChild.className = 'time-item';
    }

    function updateTimeInput() {
        const itemHeight = 40; // Match CSS height

        // Calculate selected index based on scroll position
        const hourIndex = Math.round(hourScroll.scrollTop / itemHeight);
        const minuteIndex = Math.round(minuteScroll.scrollTop / itemHeight);

        // Play sound if index changed with different tones for hours vs minutes
        if (hourIndex !== lastHourIndex) {
            if (lastHourIndex !== -1) {
                playTick('hour'); // Lower tone for hours
            }
            lastHourIndex = hourIndex;
        }

        if (minuteIndex !== lastMinuteIndex) {
            if (lastMinuteIndex !== -1) {
                playTick('minute'); // Higher tone for minutes
            }
            lastMinuteIndex = minuteIndex;
        }

        // Get the actual elements (index + 1 because of top padding)
        const hourItems = hourScroll.querySelectorAll('.time-item');
        const minuteItems = minuteScroll.querySelectorAll('.time-item');

        // Remove active class from all
        hourItems.forEach(item => item.classList.remove('active'));
        minuteItems.forEach(item => item.classList.remove('active'));

        // Add active class to selected (safeguard bounds)
        if (hourItems[hourIndex + 1]) hourItems[hourIndex + 1].classList.add('active');
        if (minuteItems[minuteIndex + 1]) minuteItems[minuteIndex + 1].classList.add('active');

        // Update hidden input and display
        const validHour = Math.max(0, Math.min(23, hourIndex)).toString().padStart(2, '0');
        const validMinute = Math.max(0, Math.min(59, minuteIndex)).toString().padStart(2, '0');
        const timeString = `${validHour}:${validMinute}`;

        timeInput.value = timeString;
        timeDisplay.value = timeString;
    }

    // Debounce scroll event for performance
    let scrollTimeout;
    function handleScroll() {
        // Immediate update for responsiveness and sound
        updateTimeInput();
    }

    hourScroll.addEventListener('scroll', handleScroll);
    minuteScroll.addEventListener('scroll', handleScroll);

    // Initialize
    populateTimePicker();

    // Fix Map Initialization
    setTimeout(() => {
        if (!pickerMap) {
            initMapPicker();
        }
        if (pickerMap) {
            pickerMap.invalidateSize();
        }
    }, 1000); // Increased timeout to ensure rendering

    initItemsMap();

    // Initialize Flatpickr (Calendar)
    flatpickr("#date_found_lost", {
        theme: "dark",
        dateFormat: "Y-m-d",
        maxDate: "today", // Restrict future dates
        disableMobile: "true", // Force custom UI on mobile
        onChange: function (selectedDates, dateStr, instance) {
            // Optional: Add sound or effect here too
        }
    });

    // Initial Load
    fetchItems();

    // --- PWA Install Prompt ---
    let deferredPrompt;
    const installButton = document.createElement('button');
    installButton.id = 'pwa-install-btn';
    installButton.className = 'pwa-install-button';
    installButton.innerHTML = `
        <i class="fas fa-download"></i>
        <span>Install App</span>
    `;
    installButton.style.display = 'none';
    document.body.appendChild(installButton);

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        // Show the install button
        installButton.style.display = 'flex';
        console.log('PWA install prompt is ready');
    });

    // Handle install button click
    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) {
            return;
        }
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // Clear the deferredPrompt for next time
        deferredPrompt = null;
        // Hide the install button
        installButton.style.display = 'none';
    });

    // Hide install button after successful installation
    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed successfully');
        installButton.style.display = 'none';
        deferredPrompt = null;
        showNotification('App installed successfully!', 'success');
    });
});
