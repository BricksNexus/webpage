(function() {
    'use strict';

    var app = window.BricksNexusApp;
    var currentUser = app.getCurrentUser();
    if (!currentUser) return;

    var STORAGE_KEYS = {
        coverPhoto: 'bricksnexus_cover_photo',
        memberSince: 'bricksnexus_profile_member_since'
    };

    function escapeHtml(value) {
        var div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    }

    function getProfileData() {
        currentUser = app.getCurrentUser() || currentUser;
        return {
            displayName: currentUser.name || 'Profile',
            professionalTitle: currentUser.professionalTitle || '',
            bio: currentUser.bio || '',
            location: currentUser.location || '',
            memberSince: sessionStorage.getItem(STORAGE_KEYS.memberSince) || '',
            photo: currentUser.profileImage || '',
            coverPhoto: sessionStorage.getItem(STORAGE_KEYS.coverPhoto) || '',
            publishRoleCard: !!currentUser.publishRoleCard
        };
    }

    function setText(id, value) {
        var element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function renderSidebar() {
        var profile = getProfileData();
        setText('user-display-name', profile.displayName || '—');
        setText('user-professional-title-display', profile.professionalTitle || '—');
        setText('user-bio-display', profile.bio || '—');
        setText('user-location-display', profile.location || '—');
        setText('user-member-since-display', profile.memberSince ? 'Member since ' + profile.memberSince : '—');
        var publishToggle = document.getElementById('profile-publish-toggle');
        if (publishToggle) publishToggle.checked = !!profile.publishRoleCard;
    }

    function renderSmartAvatars() {
        app.applySmartAvatar(document.getElementById('top-bar-avatar'), currentUser);
    }

    function renderPhotos() {
        var profile = getProfileData();
        var coverImg = document.getElementById('cover-photo');
        var coverPlaceholder = document.getElementById('cover-photo-placeholder');
        var avatarImg = document.getElementById('profile-photo');
        var avatarPlaceholder = document.getElementById('profile-photo-placeholder');

        if (profile.coverPhoto && coverImg) {
            coverImg.src = profile.coverPhoto;
            coverImg.style.display = 'block';
            if (coverPlaceholder) coverPlaceholder.style.display = 'none';
        } else if (coverPlaceholder) {
            coverPlaceholder.style.display = '';
        }

        if (profile.photo && avatarImg) {
            avatarImg.src = profile.photo;
            avatarImg.style.display = 'block';
            if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
        } else if (avatarPlaceholder) {
            avatarPlaceholder.style.display = 'flex';
            avatarPlaceholder.textContent = app.getInitials(currentUser.name, currentUser.email);
        }
    }

    function handleImageUpload(input, type) {
        if (!input || !input.files || !input.files[0]) return;
        var file = input.files[0];
        if (!file.type || !file.type.startsWith('image/')) return;

        var reader = new FileReader();
        reader.onload = function() {
            if (type === 'cover') {
                sessionStorage.setItem(STORAGE_KEYS.coverPhoto, reader.result);
            } else {
                currentUser = app.updateCurrentUser({ profileImage: reader.result }) || currentUser;
            }
            renderSmartAvatars();
            renderPhotos();
            if (currentUser.publishRoleCard) {
                app.setRoleCardVisibility(true);
            }
        };
        reader.readAsDataURL(file);
        input.value = '';
    }

    var editPhotosBtn = document.getElementById('profile-edit-photos-btn');
    var editPhotosMenu = document.getElementById('profile-edit-photos-menu');
    var coverInput = document.getElementById('cover-photo-input');
    var avatarInput = document.getElementById('profile-photo-input');
    var uploadCover = document.getElementById('profile-upload-cover');
    var uploadAvatar = document.getElementById('profile-upload-avatar');

    if (editPhotosBtn && editPhotosMenu) {
        editPhotosBtn.addEventListener('click', function() {
            var isOpen = editPhotosMenu.classList.toggle('open');
            editPhotosBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
        document.addEventListener('click', function(event) {
            if (!editPhotosMenu.classList.contains('open')) return;
            if (editPhotosMenu.contains(event.target) || editPhotosBtn.contains(event.target)) return;
            editPhotosMenu.classList.remove('open');
            editPhotosBtn.setAttribute('aria-expanded', 'false');
        });
    }
    if (uploadCover && coverInput) uploadCover.addEventListener('click', function() { coverInput.click(); });
    if (uploadAvatar && avatarInput) uploadAvatar.addEventListener('click', function() { avatarInput.click(); });
    if (coverInput) coverInput.addEventListener('change', function() { handleImageUpload(coverInput, 'cover'); });
    if (avatarInput) avatarInput.addEventListener('change', function() { handleImageUpload(avatarInput, 'avatar'); });

    var modal = document.getElementById('profile-edit-modal');
    var editProfileBtn = document.getElementById('profile-edit-profile-btn');
    var modalCancel = document.getElementById('profile-modal-cancel');
    var editForm = document.getElementById('profile-edit-form');

    function openEditModal() {
        var profile = getProfileData();
        var nameInput = document.getElementById('user-name-input');
        var titleInput = document.getElementById('user-title-input');
        var bioInput = document.getElementById('user-bio-input');
        var locationInput = document.getElementById('user-location-input');
        if (nameInput) nameInput.value = profile.displayName || '';
        if (titleInput) titleInput.value = profile.professionalTitle || '';
        if (bioInput) bioInput.value = profile.bio || '';
        if (locationInput) locationInput.value = profile.location || '';
        if (modal) modal.showModal();
    }

    function closeEditModal() {
        if (modal) modal.close();
    }

    if (editProfileBtn) editProfileBtn.addEventListener('click', openEditModal);
    if (modalCancel) modalCancel.addEventListener('click', closeEditModal);
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) closeEditModal();
        });
    }
    if (editForm) {
        editForm.addEventListener('submit', function(event) {
            event.preventDefault();
            currentUser = app.updateCurrentUser({
                name: (document.getElementById('user-name-input').value || '').trim(),
                professionalTitle: (document.getElementById('user-title-input').value || '').trim(),
                bio: (document.getElementById('user-bio-input').value || '').trim(),
                location: (document.getElementById('user-location-input').value || '').trim()
            }) || currentUser;
            renderSmartAvatars();
            renderSidebar();
            renderAllTabs();
            if (currentUser.publishRoleCard) {
                app.setRoleCardVisibility(true);
            }
            closeEditModal();
        });
    }

    var viewPrivate = document.getElementById('profile-view-private');
    var viewPublic = document.getElementById('profile-view-public');
    var viewContent = document.querySelector('.profile-content');

    function setViewMode(mode) {
        if (!viewContent) return;
        viewContent.setAttribute('data-view', mode);
        if (viewPrivate) viewPrivate.classList.toggle('active', mode === 'private');
        if (viewPublic) viewPublic.classList.toggle('active', mode === 'public');
    }
    if (viewPrivate) viewPrivate.addEventListener('click', function() { setViewMode('private'); });
    if (viewPublic) viewPublic.addEventListener('click', function() { setViewMode('public'); });

    document.querySelectorAll('.profile-tab').forEach(function(button) {
        button.addEventListener('click', function() {
            var tab = button.getAttribute('data-tab');
            document.querySelectorAll('.profile-tab').forEach(function(item) {
                item.classList.toggle('active', item === button);
                item.setAttribute('aria-selected', item === button ? 'true' : 'false');
            });
            document.querySelectorAll('.profile-tab-panel').forEach(function(panel) {
                var isActive = panel.id === 'panel-' + tab;
                panel.classList.toggle('active', isActive);
                panel.hidden = !isActive;
            });
        });
    });

    function getInterests(cardId) {
        return app.readJson(app.KEYS.interests, []).filter(function(entry) {
            return String(entry.cardId) === String(cardId);
        });
    }

    function renderInterestBlock(itemId) {
        var entries = getInterests(itemId);
        if (!entries.length) {
            return '<div class="profile-interests-block"><p class="profile-interests-heading">Who expressed interest</p><p class="profile-no-interests">No one yet.</p></div>';
        }
        return '<div class="profile-interests-block"><p class="profile-interests-heading">Who expressed interest</p><ul class="profile-interests-list">'
            + entries.map(function(entry) {
                var initials = (entry.interestedBy || '?').toUpperCase();
                var name = entry.interestedByName || entry.interestedBy || 'Interested user';
                return '<li><span class="profile-interest-initials">' + escapeHtml(initials) + '</span>' + escapeHtml(name) + '</li>';
            }).join('')
            + '</ul></div>';
    }

    function renderOpportunityCard(item) {
        var parts = [];
        if (item.city) parts.push(escapeHtml(item.city));
        if (item.region) parts.push(escapeHtml(item.region));
        if (item.budget) parts.push('Budget: ' + escapeHtml(item.budget));
        var article = document.createElement('article');
        article.className = 'feed-card';
        article.innerHTML = ''
            + '<div class="card-type">' + escapeHtml(item.status === 'draft' ? 'Opportunity Draft' : 'Opportunity') + '</div>'
            + (item.imageDataUrl ? '<img class="card-image" src="' + escapeHtml(item.imageDataUrl) + '" alt="">' : '<div class="card-image-placeholder">Opportunity</div>')
            + '<div class="card-body">'
            + '<h3 class="card-title">' + escapeHtml(item.title || 'Opportunity') + '</h3>'
            + '<div class="card-meta">' + (parts.length ? parts.join(' · ') : '') + '</div>'
            + '<div class="card-details">' + escapeHtml(item.summary || 'No details added yet.') + '</div>'
            + renderInterestBlock(item.id)
            + '</div>';
        return article;
    }

    function renderServiceCard(item) {
        var article = document.createElement('article');
        article.className = 'feed-card compact';
        article.innerHTML = ''
            + '<div class="card-type">' + escapeHtml(item.status === 'draft' ? 'Service Draft' : 'Service') + '</div>'
            + '<div class="card-body">'
            + '<h3 class="card-title">' + escapeHtml(item.title || 'Service') + '</h3>'
            + '<div class="card-meta"><span>' + escapeHtml(item.category || 'Service provider') + '</span>' + (item.radius ? '<span>' + escapeHtml(item.radius) + '</span>' : '') + '</div>'
            + '<div class="card-details">' + escapeHtml(item.description || 'No details added yet.') + '</div>'
            + renderInterestBlock(item.id)
            + '</div>';
        return article;
    }

    function renderOpenToWorkCard(item) {
        var avatar = app.getSmartAvatar(currentUser);
        var image = avatar.image ? '<img src="' + escapeHtml(avatar.image) + '" alt="' + escapeHtml(currentUser.name || 'Profile') + '">' : escapeHtml(avatar.initials);
        var article = document.createElement('article');
        article.className = 'feed-card compact';
        article.innerHTML = ''
            + '<div class="card-type">' + escapeHtml(item.status === 'draft' ? 'Open to Work Draft' : 'Open to Work') + '</div>'
            + '<div class="card-body">'
            + '<div class="card-header-row"><div class="card-avatar">' + image + '</div><div><h3 class="card-title">' + escapeHtml(item.roleTitle || item.title || 'Open to Work') + '</h3>'
            + '<div class="card-meta"><span>' + escapeHtml(currentUser.name || '') + '</span>' + (item.location ? '<span>' + escapeHtml(item.location) + '</span>' : '') + '</div></div></div>'
            + '<div class="card-details">' + escapeHtml(item.summary || 'Open to Work profile.') + '</div>'
            + '</div>';
        return article;
    }

    function renderList(containerId, emptyId, items, renderer) {
        var container = document.getElementById(containerId);
        var empty = document.getElementById(emptyId);
        if (container) {
            container.innerHTML = '';
            items.forEach(function(item) {
                container.appendChild(renderer(item));
            });
        }
        if (empty) empty.style.display = items.length ? 'none' : 'flex';
    }

    function renderAllTabs() {
        var opportunities = app.getUserItems(app.KEYS.opportunities).concat(app.getUserItems(app.KEYS.opportunityDrafts));
        var services = app.getUserItems(app.KEYS.services).concat(app.getUserItems(app.KEYS.serviceDrafts));
        var openToWork = app.getUserItems(app.KEYS.openToWork).concat(app.getUserItems(app.KEYS.openToWorkDrafts));

        renderList('profile-opportunities-list', 'profile-opportunities-empty', opportunities, renderOpportunityCard);
        renderList('profile-services-list', 'profile-services-empty', services, renderServiceCard);
        renderList('profile-open-to-work-list', 'profile-open-to-work-empty', openToWork, renderOpenToWorkCard);
    }

    (function ensureMemberSince() {
        var current = sessionStorage.getItem(STORAGE_KEYS.memberSince);
        if (current) return;
        var created = currentUser.createdAt ? new Date(currentUser.createdAt) : new Date();
        sessionStorage.setItem(STORAGE_KEYS.memberSince, created.toLocaleString('default', { month: 'short' }) + ' ' + created.getFullYear());
    })();

    var publishToggle = document.getElementById('profile-publish-toggle');
    if (publishToggle) {
        publishToggle.addEventListener('change', function() {
            currentUser = app.setRoleCardVisibility(publishToggle.checked) || currentUser;
            renderSidebar();
            renderAllTabs();
        });
    }

    renderSmartAvatars();
    renderSidebar();
    renderPhotos();
    renderAllTabs();
    setViewMode('private');
})();
