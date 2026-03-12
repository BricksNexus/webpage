(function() {
    'use strict';

    var STORAGE_KEYS = {
        name: 'bricksnexus_profile_name',
        title: 'bricksnexus_profile_title',
        bio: 'bricksnexus_profile_bio',
        location: 'bricksnexus_profile_location',
        memberSince: 'bricksnexus_profile_member_since',
        photo: 'bricksnexus_photo',
        coverPhoto: 'bricksnexus_cover_photo'
    };

    var initials = sessionStorage.getItem('bricksnexus_initials') || '';
    var sessionName = sessionStorage.getItem('bricksnexus_name') || '';
    var sessionEmail = sessionStorage.getItem('bricksnexus_email') || '';

    function getProfile() {
        return {
            displayName: sessionStorage.getItem(STORAGE_KEYS.name) || sessionName || 'Profile',
            professionalTitle: sessionStorage.getItem(STORAGE_KEYS.title) || '',
            bio: sessionStorage.getItem(STORAGE_KEYS.bio) || '',
            location: sessionStorage.getItem(STORAGE_KEYS.location) || '',
            memberSince: sessionStorage.getItem(STORAGE_KEYS.memberSince) || '',
            photo: sessionStorage.getItem(STORAGE_KEYS.photo) || '',
            coverPhoto: sessionStorage.getItem(STORAGE_KEYS.coverPhoto) || ''
        };
    }

    function saveProfile(updates) {
        var p = getProfile();
        if (updates.displayName !== undefined) sessionStorage.setItem(STORAGE_KEYS.name, updates.displayName);
        if (updates.professionalTitle !== undefined) sessionStorage.setItem(STORAGE_KEYS.title, updates.professionalTitle);
        if (updates.bio !== undefined) sessionStorage.setItem(STORAGE_KEYS.bio, updates.bio);
        if (updates.location !== undefined) sessionStorage.setItem(STORAGE_KEYS.location, updates.location);
        if (updates.memberSince !== undefined) sessionStorage.setItem(STORAGE_KEYS.memberSince, updates.memberSince);
        if (updates.photo !== undefined) sessionStorage.setItem(STORAGE_KEYS.photo, updates.photo);
        if (updates.coverPhoto !== undefined) sessionStorage.setItem(STORAGE_KEYS.coverPhoto, updates.coverPhoto);
    }

    function escapeHtml(s) {
        var div = document.createElement('div');
        div.textContent = s == null ? '' : String(s);
        return div.innerHTML;
    }

    // Top bar avatar
    var topBarAvatar = document.getElementById('top-bar-avatar');
    if (topBarAvatar) topBarAvatar.textContent = (initials || 'U').toUpperCase();

    // Sidebar display
    function renderSidebar() {
        var p = getProfile();
        setText('user-display-name', p.displayName || '—');
        setText('user-professional-title-display', p.professionalTitle || '—');
        setText('user-bio-display', p.bio || '—');
        setText('user-location-display', p.location || '—');
        setText('user-member-since-display', p.memberSince ? 'Member since ' + p.memberSince : '—');
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // Cover & profile photo
    function renderPhotos() {
        var p = getProfile();
        var coverImg = document.getElementById('cover-photo');
        var coverPlace = document.getElementById('cover-photo-placeholder');
        var avatarImg = document.getElementById('profile-photo');
        var avatarPlace = document.getElementById('profile-photo-placeholder');

        if (p.coverPhoto && coverImg) {
            coverImg.src = p.coverPhoto;
            coverImg.style.display = 'block';
            if (coverPlace) coverPlace.style.display = 'none';
        } else if (coverPlace) coverPlace.style.display = '';

        if (p.photo && avatarImg) {
            avatarImg.src = p.photo;
            avatarImg.style.display = 'block';
            if (avatarPlace) avatarPlace.style.display = 'none';
        } else if (avatarPlace) {
            avatarPlace.style.display = 'flex';
            avatarPlace.textContent = (initials || 'U').toUpperCase();
        }
    }

    var editPhotosBtn = document.getElementById('profile-edit-photos-btn');
    var editPhotosMenu = document.getElementById('profile-edit-photos-menu');
    var coverInput = document.getElementById('cover-photo-input');
    var profilePhotoInput = document.getElementById('profile-photo-input');

    if (editPhotosBtn && editPhotosMenu) {
        editPhotosBtn.addEventListener('click', function() {
            var isOpen = editPhotosMenu.classList.toggle('open');
            editPhotosBtn.setAttribute('aria-expanded', isOpen);
            editPhotosMenu.setAttribute('aria-hidden', !isOpen);
        });
        document.addEventListener('click', function(e) {
            if (editPhotosMenu.classList.contains('open') && !editPhotosBtn.contains(e.target) && !editPhotosMenu.contains(e.target)) {
                editPhotosMenu.classList.remove('open');
                editPhotosBtn.setAttribute('aria-expanded', 'false');
                editPhotosMenu.setAttribute('aria-hidden', 'true');
            }
        });
    }

    function handleFileUpload(input, key) {
        if (!input || !input.files || !input.files[0]) return;
        var file = input.files[0];
        if (!file.type || !file.type.startsWith('image/')) return;
        var reader = new FileReader();
        reader.onload = function() {
            var dataUrl = reader.result;
            if (key === 'coverPhoto') saveProfile({ coverPhoto: dataUrl });
            else saveProfile({ photo: dataUrl });
            renderPhotos();
        };
        reader.readAsDataURL(file);
        input.value = '';
    }

    if (coverInput) {
        coverInput.addEventListener('change', function() { handleFileUpload(coverInput, 'coverPhoto'); });
    }
    if (profilePhotoInput) {
        profilePhotoInput.addEventListener('change', function() { handleFileUpload(profilePhotoInput, 'photo'); });
    }

    var uploadCover = document.getElementById('profile-upload-cover');
    var uploadAvatar = document.getElementById('profile-upload-avatar');
    if (uploadCover && coverInput) uploadCover.addEventListener('click', function() { coverInput.click(); editPhotosMenu.classList.remove('open'); });
    if (uploadAvatar && profilePhotoInput) uploadAvatar.addEventListener('click', function() { profilePhotoInput.click(); editPhotosMenu.classList.remove('open'); });

    // Edit Profile modal
    var modal = document.getElementById('profile-edit-modal');
    var editForm = document.getElementById('profile-edit-form');
    var editProfileBtn = document.getElementById('profile-edit-profile-btn');
    var modalCancel = document.getElementById('profile-modal-cancel');

    function openEditModal() {
        var p = getProfile();
        var nameInput = document.getElementById('user-name-input');
        var titleInput = document.getElementById('user-title-input');
        var bioInput = document.getElementById('user-bio-input');
        var locationInput = document.getElementById('user-location-input');
        if (nameInput) nameInput.value = p.displayName || '';
        if (titleInput) titleInput.value = p.professionalTitle || '';
        if (bioInput) bioInput.value = p.bio || '';
        if (locationInput) locationInput.value = p.location || '';
        if (modal) modal.showModal();
    }

    function closeEditModal() {
        if (modal) modal.close();
    }

    if (editProfileBtn) editProfileBtn.addEventListener('click', openEditModal);
    if (modalCancel) modalCancel.addEventListener('click', closeEditModal);
    if (modal) {
        modal.addEventListener('cancel', closeEditModal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeEditModal();
        });
    }
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var name = (document.getElementById('user-name-input') && document.getElementById('user-name-input').value) || '';
            var title = (document.getElementById('user-title-input') && document.getElementById('user-title-input').value) || '';
            var bio = (document.getElementById('user-bio-input') && document.getElementById('user-bio-input').value) || '';
            var location = (document.getElementById('user-location-input') && document.getElementById('user-location-input').value) || '';
            saveProfile({ displayName: name.trim(), professionalTitle: title.trim(), bio: bio.trim(), location: location.trim() });
            renderSidebar();
            closeEditModal();
        });
    }

    // Public / Private view toggle
    var viewContent = document.querySelector('.profile-content');
    var viewPrivate = document.getElementById('profile-view-private');
    var viewPublic = document.getElementById('profile-view-public');

    function setViewMode(mode) {
        if (!viewContent) return;
        viewContent.setAttribute('data-view', mode);
        if (viewPrivate) viewPrivate.classList.toggle('active', mode === 'private');
        if (viewPublic) viewPublic.classList.toggle('active', mode === 'public');
    }

    if (viewPrivate) viewPrivate.addEventListener('click', function() { setViewMode('private'); });
    if (viewPublic) viewPublic.addEventListener('click', function() { setViewMode('public'); });

    // Tabs
    var tabButtons = document.querySelectorAll('.profile-tab');
    var panels = document.querySelectorAll('.profile-tab-panel');

    tabButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var tab = btn.getAttribute('data-tab');
            tabButtons.forEach(function(b) {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            panels.forEach(function(panel) {
                panel.classList.remove('active');
                panel.hidden = true;
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            var panel = document.getElementById('panel-' + tab);
            if (panel) {
                panel.classList.add('active');
                panel.hidden = false;
            }
        });
    });

    // Data
    var opportunities = [];
    var services = [];
    var interests = [];
    try {
        opportunities = JSON.parse(localStorage.getItem('bricksnexus_opportunities') || '[]');
        services = JSON.parse(localStorage.getItem('bricksnexus_services') || '[]');
        interests = JSON.parse(localStorage.getItem('bricksnexus_interests') || '[]');
    } catch (err) {
        console.error('Profile data load error', err);
    }

    var myOpportunities = Array.isArray(opportunities) ? opportunities.filter(function(o) {
        return (String(o.creatorId || '').toUpperCase() === String(initials).toUpperCase());
    }) : [];
    var myServices = Array.isArray(services) ? services.filter(function(s) {
        return (String(s.creatorId || '').toUpperCase() === String(initials).toUpperCase());
    }) : [];
    var myOpenToWork = []; // No localStorage for open-to-work yet

    function getInterestsForCard(cardId) {
        return interests.filter(function(i) { return String(i.cardId) === String(cardId); });
    }

    var isPrivateView = function() {
        return !viewContent || viewContent.getAttribute('data-view') !== 'public';
    };

    function renderOpportunityCard(opp) {
        var title = opp.title || 'Opportunity';
        var summary = opp.summary || '';
        var city = opp.city || '';
        var region = opp.region || '';
        var budget = opp.budget || '';
        var hasImage = !!opp.imageDataUrl;
        var cardInterests = getInterestsForCard(opp.id);
        var interestsHtml = '';
        if (isPrivateView() && cardInterests.length) {
            interestsHtml = '<div class="profile-interests-block"><p class="profile-interests-heading">Who expressed interest</p><ul class="profile-interests-list">' +
                cardInterests.map(function(i) {
                    var by = (i.interestedByName || i.interestedBy || 'Someone').trim() || 'Someone';
                    var inits = (i.interestedBy || '?').toUpperCase();
                    return '<li><span class="profile-interest-initials">' + escapeHtml(inits) + '</span>' + escapeHtml(by) + '</li>';
                }).join('') + '</ul></div>';
        } else if (isPrivateView()) {
            interestsHtml = '<div class="profile-interests-block"><p class="profile-interests-heading">Who expressed interest</p><p class="profile-no-interests">No one yet.</p></div>';
        }

        var metaParts = [];
        if (city) metaParts.push(escapeHtml(city));
        if (region) metaParts.push(escapeHtml(region));
        if (budget) metaParts.push('Budget: ' + escapeHtml(budget));

        var card = document.createElement('article');
        card.className = 'feed-card';
        card.dataset.cardId = String(opp.id);
        card.dataset.cardType = 'opportunity';
        card.innerHTML =
            '<div class="card-type">Opportunity</div>' +
            (hasImage ? '<img class="card-image" src="' + escapeHtml(opp.imageDataUrl) + '" alt="">' : '<div class="card-image-placeholder">Opportunity</div>') +
            '<div class="card-body">' +
            '<h3 class="card-title">' + escapeHtml(title) + '</h3>' +
            '<div class="card-meta">' + (metaParts.length ? metaParts.join(' · ') : '') + '</div>' +
            '<div class="card-details">' + escapeHtml(summary) + '</div>' +
            '<div class="card-actions"><button type="button">View</button></div>' +
            interestsHtml +
            '</div>';
        return card;
    }

    function renderServiceCard(service) {
        var title = service.title || 'Service';
        var category = service.category || 'Service';
        var description = service.description || '';
        var radius = service.radius || '';
        var cardInterests = getInterestsForCard(service.id);
        var interestsHtml = '';
        if (isPrivateView() && cardInterests.length) {
            interestsHtml = '<div class="profile-interests-block"><p class="profile-interests-heading">Who expressed interest</p><ul class="profile-interests-list">' +
                cardInterests.map(function(i) {
                    var by = (i.interestedByName || i.interestedBy || 'Someone').trim() || 'Someone';
                    var inits = (i.interestedBy || '?').toUpperCase();
                    return '<li><span class="profile-interest-initials">' + escapeHtml(inits) + '</span>' + escapeHtml(by) + '</li>';
                }).join('') + '</ul></div>';
        } else if (isPrivateView()) {
            interestsHtml = '<div class="profile-interests-block"><p class="profile-interests-heading">Who expressed interest</p><p class="profile-no-interests">No one yet.</p></div>';
        }

        var card = document.createElement('article');
        card.className = 'feed-card compact';
        card.dataset.cardId = String(service.id);
        card.dataset.cardType = 'service';
        card.innerHTML =
            '<div class="card-type">Service</div>' +
            '<div class="card-body">' +
            '<h3 class="card-title">' + escapeHtml(title) + '</h3>' +
            '<div class="card-meta"><span>' + escapeHtml(category) + '</span>' + (radius ? '<span>' + escapeHtml(radius) + '</span>' : '') + '</div>' +
            '<div class="card-details">' + escapeHtml(description) + '</div>' +
            '<div class="card-actions"><button type="button">View</button></div>' +
            interestsHtml +
            '</div>';
        return card;
    }

    var oppList = document.getElementById('profile-opportunities-list');
    var oppEmpty = document.getElementById('profile-opportunities-empty');
    var svcList = document.getElementById('profile-services-list');
    var svcEmpty = document.getElementById('profile-services-empty');
    var otwList = document.getElementById('profile-open-to-work-list');
    var otwEmpty = document.getElementById('profile-open-to-work-empty');

    function renderAllTabs() {
        if (oppList) {
            oppList.innerHTML = '';
            myOpportunities.forEach(function(opp) { oppList.appendChild(renderOpportunityCard(opp)); });
        }
        if (oppEmpty) oppEmpty.style.display = myOpportunities.length === 0 ? 'flex' : 'none';

        if (svcList) {
            svcList.innerHTML = '';
            myServices.forEach(function(s) { svcList.appendChild(renderServiceCard(s)); });
        }
        if (svcEmpty) svcEmpty.style.display = myServices.length === 0 ? 'flex' : 'none';

        if (otwList) otwList.innerHTML = '';
        if (otwEmpty) otwEmpty.style.display = myOpenToWork.length === 0 ? 'flex' : 'none';
    }

    // Member since: set once from first card or keep existing
    (function ensureMemberSince() {
        var current = sessionStorage.getItem(STORAGE_KEYS.memberSince);
        if (current) return;
        var first = null;
        myOpportunities.concat(myServices).forEach(function(item) {
            if (item.createdAt) {
                var d = new Date(item.createdAt);
                if (!first || d < first) first = d;
            }
        });
        if (first) {
            var month = first.toLocaleString('default', { month: 'short' });
            var year = first.getFullYear();
            sessionStorage.setItem(STORAGE_KEYS.memberSince, month + ' ' + year);
        }
    })();

    renderSidebar();
    renderPhotos();
    renderAllTabs();
    setViewMode('private');
})();
