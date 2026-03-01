document.addEventListener('DOMContentLoaded', function() {
    const consultationToggle = document.getElementById('consultation-toggle');
    if (consultationToggle) {
        const toggle = () => consultationToggle.classList.toggle('on');
        consultationToggle.addEventListener('click', toggle);
        consultationToggle.addEventListener('keydown', function(e) {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                toggle();
            }
        });
    }

    const submitBtn = document.getElementById('service-submit');
    const draftBtn = document.getElementById('service-save-draft');

    function collectServiceData() {
        const titleEl = document.getElementById('service-title');
        const categoryEl = document.getElementById('service-category');
        const descEl = document.getElementById('service-description');
        const radiusEl = document.getElementById('service-radius');

        const title = (titleEl?.value || '').trim();
        const category = (categoryEl?.value || '').trim();
        const description = (descEl?.value || '').trim();
        const radius = (radiusEl?.value || '').trim();
        const consultationOffered = consultationToggle?.classList.contains('on') || false;

        const creatorId = sessionStorage.getItem('bricksnexus_initials') || '';
        const creatorName = sessionStorage.getItem('bricksnexus_name') || '';
        const creatorEmail = sessionStorage.getItem('bricksnexus_email') || '';

        const service = {
            id: Date.now(),
            title,
            category,
            description,
            radius,
            consultationOffered,
            createdAt: new Date().toISOString(),
            creatorId,
            creatorName,
            creatorEmail
        };

        return { service, titleEl };
    }

    function saveServiceToStorage(key, service) {
        try {
            const existingRaw = localStorage.getItem(key);
            const list = existingRaw ? JSON.parse(existingRaw) : [];
            list.unshift(service);
            localStorage.setItem(key, JSON.stringify(list));
        } catch (e) {
            console.error('Failed to save service to localStorage', e);
        }
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            const result = collectServiceData();
            if (!result) return;
            const { service, titleEl } = result;

            if (!service.title) {
                alert('Please enter a service title before publishing.');
                titleEl?.focus();
                return;
            }

            saveServiceToStorage('bricksnexus_services', service);
            window.location.href = 'index.html';
        });
    }

    if (draftBtn) {
        draftBtn.addEventListener('click', function() {
            const result = collectServiceData();
            if (!result) return;
            const { service, titleEl } = result;

            if (!service.title) {
                alert('Please enter at least a service title to save a draft.');
                titleEl?.focus();
                return;
            }

            saveServiceToStorage('bricksnexus_service_drafts', service);
            alert('Draft saved locally. You can safely leave this page and come back later.');
        });
    }
});

