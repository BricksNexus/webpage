(function() {
    'use strict';

    var app = window.BricksNexusApp;
    var currentUser = app.getCurrentUser();
    if (!currentUser) return;

    function escapeHtml(value) {
        var div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    }

    function setText(id, value) {
        var element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function getProfileValue(key, fallback) {
        return sessionStorage.getItem(key) || fallback || '';
    }

    var initials = (currentUser.initials || app.getInitials(currentUser.name, currentUser.email)).toUpperCase();
    setText('dashboard-user-avatar', initials);
    setText('dashboard-user-name', currentUser.name || 'Profile');
    setText('dashboard-user-role', currentUser.accountType === 'company' ? 'Company account' : 'Individual account');
    setText('dashboard-top-avatar', initials);

    setText('dashboard-profile-name', currentUser.name || '—');
    setText('dashboard-profile-email', currentUser.email || '—');
    setText('dashboard-profile-type', currentUser.accountType === 'company' ? 'Company' : 'Individual');
    setText('dashboard-profile-member-since', getProfileValue('bricksnexus_profile_member_since', new Date(currentUser.createdAt).toLocaleDateString()));
    setText('dashboard-settings-role', currentUser.accountType === 'company' ? 'Company' : 'Individual');
    setText('dashboard-settings-email', currentUser.email || '—');

    document.querySelectorAll('.dashboard-nav-btn').forEach(function(button) {
        button.addEventListener('click', function() {
            var panel = button.getAttribute('data-panel');
            document.querySelectorAll('.dashboard-nav-btn').forEach(function(item) {
                item.classList.toggle('active', item === button);
            });
            document.querySelectorAll('.dashboard-panel').forEach(function(item) {
                var isActive = item.id === 'dashboard-panel-' + panel;
                item.classList.toggle('active', isActive);
                item.hidden = !isActive;
            });
        });
    });

    var allItems = []
        .concat(app.getUserItems(app.KEYS.opportunities).map(function(item) {
            item.__sourceKey = app.KEYS.opportunities;
            item.__typeLabel = 'Opportunity';
            item.__editHref = 'post-opportunity.html?edit=' + encodeURIComponent(item.id);
            return item;
        }))
        .concat(app.getUserItems(app.KEYS.opportunityDrafts).map(function(item) {
            item.__sourceKey = app.KEYS.opportunityDrafts;
            item.__typeLabel = 'Opportunity Draft';
            item.__editHref = 'post-opportunity.html?edit=' + encodeURIComponent(item.id) + '&draft=1';
            return item;
        }))
        .concat(app.getUserItems(app.KEYS.services).map(function(item) {
            item.__sourceKey = app.KEYS.services;
            item.__typeLabel = 'Service';
            item.__editHref = 'post-service.html?edit=' + encodeURIComponent(item.id);
            return item;
        }))
        .concat(app.getUserItems(app.KEYS.serviceDrafts).map(function(item) {
            item.__sourceKey = app.KEYS.serviceDrafts;
            item.__typeLabel = 'Service Draft';
            item.__editHref = 'post-service.html?edit=' + encodeURIComponent(item.id) + '&draft=1';
            return item;
        }))
        .concat(app.getUserItems(app.KEYS.openToWorkDrafts).map(function(item) {
            item.__sourceKey = app.KEYS.openToWorkDrafts;
            item.__typeLabel = 'Open to Work Draft';
            item.__editHref = 'open-to-work.html';
            return item;
        }))
        .sort(function(a, b) {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

    var itemList = document.getElementById('dashboard-item-list');
    var emptyState = document.getElementById('dashboard-items-empty');

    function getInterestsFor(itemId) {
        var interests = app.readJson(app.KEYS.interests, []);
        return interests.filter(function(entry) {
            return String(entry.cardId) === String(itemId);
        });
    }

    function renderItemCard(item) {
        var interests = getInterestsFor(item.id);
        var title = item.title || item.roleTitle || item.category || 'Untitled';
        var details = item.summary || item.description || item.location || 'No details added yet.';
        var metaBits = [];
        if (item.city) metaBits.push(item.city);
        if (item.region) metaBits.push(item.region);
        if (item.budget) metaBits.push('Budget: ' + item.budget);
        if (item.radius) metaBits.push(item.radius);
        if (item.roleTitle) metaBits.push(item.roleTitle);

        var article = document.createElement('article');
        article.className = item.__typeLabel.indexOf('Opportunity') === 0 ? 'feed-card' : 'feed-card compact';
        article.setAttribute('data-item-id', item.id);
        article.setAttribute('data-source-key', item.__sourceKey);

        var body = ''
            + '<div class="card-type">' + escapeHtml(item.__typeLabel) + '</div>'
            + (item.imageDataUrl ? '<img class="card-image" src="' + escapeHtml(item.imageDataUrl) + '" alt="">' : '')
            + '<div class="card-body">'
            + '<div class="card-meta"><span class="dashboard-tag">' + escapeHtml(item.status || 'published') + '</span>' + (metaBits.length ? '<span>' + metaBits.map(escapeHtml).join(' · ') + '</span>' : '') + '</div>'
            + '<h3 class="card-title">' + escapeHtml(title) + '</h3>'
            + '<div class="card-details">' + escapeHtml(details) + '</div>';

        if (interests.length) {
            body += '<div class="profile-interests-block"><p class="profile-interests-heading">Interested parties</p><ul class="profile-interests-list">'
                + interests.map(function(entry) {
                    var name = entry.interestedByName || entry.interestedBy || 'Interested user';
                    var entryInitials = (entry.interestedBy || '?').toUpperCase();
                    return '<li><span class="profile-interest-initials">' + escapeHtml(entryInitials) + '</span>' + escapeHtml(name) + '</li>';
                }).join('')
                + '</ul></div>';
        }

        body += ''
            + '<div class="dashboard-item-toolbar">'
            + '<span class="card-details">Last updated ' + escapeHtml(new Date(item.createdAt || Date.now()).toLocaleDateString()) + '</span>'
            + '<div class="dashboard-item-toolbar-right">'
            + '<select class="dashboard-status-select" data-status-id="' + escapeHtml(item.id) + '">'
            + '<option value="draft"' + ((item.status || '') === 'draft' ? ' selected' : '') + '>Draft</option>'
            + '<option value="published"' + ((item.status || '') === 'published' ? ' selected' : '') + '>Published</option>'
            + '<option value="paused"' + ((item.status || '') === 'paused' ? ' selected' : '') + '>Paused</option>'
            + '</select>'
            + '<a href="' + escapeHtml(item.__editHref) + '" class="dashboard-action-btn">Edit</a>'
            + '<button type="button" class="dashboard-action-btn dashboard-delete-btn" data-delete-id="' + escapeHtml(item.id) + '">Delete</button>'
            + '</div>'
            + '</div>'
            + '</div>';

        article.innerHTML = body;
        return article;
    }

    function renderItems() {
        if (!itemList || !emptyState) return;
        itemList.innerHTML = '';
        if (!allItems.length) {
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        allItems.forEach(function(item) {
            itemList.appendChild(renderItemCard(item));
        });
    }

    renderItems();

    if (itemList) {
        itemList.addEventListener('change', function(event) {
            var select = event.target.closest('.dashboard-status-select');
            if (!select) return;
            var card = select.closest('[data-source-key]');
            if (!card) return;
            var sourceKey = card.getAttribute('data-source-key');
            var itemId = select.getAttribute('data-status-id');
            app.updateItem(sourceKey, itemId, function(item) {
                item.status = select.value;
                return item;
            });
            allItems = allItems.map(function(item) {
                if (String(item.id) === String(itemId) && item.__sourceKey === sourceKey) {
                    item.status = select.value;
                }
                return item;
            });
            renderItems();
        });

        itemList.addEventListener('click', function(event) {
            var deleteBtn = event.target.closest('.dashboard-delete-btn');
            if (!deleteBtn) return;
            var itemId = deleteBtn.getAttribute('data-delete-id');
            var card = deleteBtn.closest('[data-source-key]');
            if (!card) return;
            var sourceKey = card.getAttribute('data-source-key');
            app.removeItem(sourceKey, itemId);
            allItems = allItems.filter(function(item) {
                return !(String(item.id) === String(itemId) && item.__sourceKey === sourceKey);
            });
            renderItems();
        });
    }

    var logoutBtn = document.getElementById('dashboard-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            app.clearSession();
            window.location.href = 'index.html';
        });
    }
})();
