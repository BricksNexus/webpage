document.addEventListener('DOMContentLoaded', function() {
    const app = window.BricksNexusApp;
    const query = new URLSearchParams(window.location.search);
    const editId = query.get('edit');
    const isDraftEdit = query.get('draft') === '1';
    const editingStorageKey = isDraftEdit ? app.KEYS.serviceDrafts : app.KEYS.services;
    let editingRecord = null;
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

        const currentUser = app.getCurrentUser();
        const creatorId = currentUser ? currentUser.initials : (sessionStorage.getItem('bricksnexus_initials') || '');
        const creatorName = currentUser ? currentUser.name : (sessionStorage.getItem('bricksnexus_name') || '');
        const creatorEmail = currentUser ? currentUser.email : (sessionStorage.getItem('bricksnexus_email') || '');

        const service = {
            id: Date.now(),
            title,
            category,
            description,
            radius,
            consultationOffered,
            createdAt: new Date().toISOString(),
            status: 'published',
            creatorUserId: currentUser ? currentUser.id : '',
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
            const existingIndex = list.findIndex(item => String(item.id) === String(service.id));
            if (existingIndex >= 0) {
                list[existingIndex] = service;
            } else {
                list.unshift(service);
            }
            localStorage.setItem(key, JSON.stringify(list));
        } catch (e) {
            console.error('Failed to save service to localStorage', e);
        }
    }

    function removeFromStorage(key, itemId) {
        try {
            const existingRaw = localStorage.getItem(key);
            const list = existingRaw ? JSON.parse(existingRaw) : [];
            localStorage.setItem(key, JSON.stringify(list.filter(item => String(item.id) !== String(itemId))));
        } catch (e) {
            console.error('Failed to remove service from localStorage', e);
        }
    }

    function loadEditingRecord() {
        if (!editId) return;
        try {
            const list = JSON.parse(localStorage.getItem(editingStorageKey) || '[]');
            editingRecord = list.find(item => String(item.id) === String(editId)) || null;
        } catch (e) {
            console.error('Failed to load editable service record', e);
        }
        if (!editingRecord) return;

        const titleEl = document.getElementById('service-title');
        const categoryEl = document.getElementById('service-category');
        const descEl = document.getElementById('service-description');
        const radiusEl = document.getElementById('service-radius');

        if (titleEl) titleEl.value = editingRecord.title || '';
        if (categoryEl) categoryEl.value = editingRecord.category || '';
        if (descEl) descEl.value = editingRecord.description || '';
        if (radiusEl) radiusEl.value = editingRecord.radius || '';
        if (consultationToggle) {
            consultationToggle.classList.toggle('on', !!editingRecord.consultationOffered);
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

            if (editingRecord) {
                service.id = editingRecord.id;
                service.createdAt = editingRecord.createdAt || service.createdAt;
                removeFromStorage(editingStorageKey, editingRecord.id);
            }
            saveServiceToStorage('bricksnexus_services', service);
            window.location.href = 'dashboard.html';
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

            if (editingRecord) {
                service.id = editingRecord.id;
                service.createdAt = editingRecord.createdAt || service.createdAt;
                removeFromStorage(editingStorageKey, editingRecord.id);
            }
            service.status = 'draft';
            saveServiceToStorage('bricksnexus_service_drafts', service);
            window.location.href = 'dashboard.html';
        });
    }

    loadEditingRecord();
});

