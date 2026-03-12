(function() {
    'use strict';

    var app = window.BricksNexusApp;
    var currentUser = app.getCurrentUser();
    if (!currentUser) return;

    var query = new URLSearchParams(window.location.search);
    var activePanel = query.get('panel') || 'profile';
    var activeThreadId = query.get('thread') || '';
    var pendingCompose = query.get('compose') || '';

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

    function updateUrl() {
        var params = new URLSearchParams();
        if (activePanel && activePanel !== 'profile') params.set('panel', activePanel);
        if (activePanel === 'messages' && activeThreadId) params.set('thread', activeThreadId);
        if (activePanel === 'messages' && pendingCompose) params.set('compose', pendingCompose);
        var next = 'dashboard.html' + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', next);
    }

    function activatePanel(panelName) {
        activePanel = panelName || 'profile';
        document.querySelectorAll('.dashboard-nav-btn').forEach(function(button) {
            button.classList.toggle('active', button.getAttribute('data-panel') === activePanel);
        });
        document.querySelectorAll('.dashboard-panel').forEach(function(panel) {
            var isActive = panel.id === 'dashboard-panel-' + activePanel;
            panel.classList.toggle('active', isActive);
            panel.hidden = !isActive;
        });
        updateUrl();
    }

    app.applySmartAvatar(document.getElementById('dashboard-user-avatar'), currentUser);
    app.applySmartAvatar(document.getElementById('dashboard-top-avatar'), currentUser);
    setText('dashboard-user-name', currentUser.name || 'Profile');
    setText('dashboard-user-role', currentUser.accountType === 'company' ? 'Company account' : 'Individual account');
    setText('dashboard-profile-name', currentUser.name || '—');
    setText('dashboard-profile-email', currentUser.email || '—');
    setText('dashboard-profile-type', currentUser.accountType === 'company' ? 'Company' : 'Individual');
    setText('dashboard-profile-title', currentUser.professionalTitle || '—');
    setText('dashboard-profile-member-since', getProfileValue('bricksnexus_profile_member_since', new Date(currentUser.createdAt).toLocaleDateString()));
    setText('dashboard-settings-role', currentUser.accountType === 'company' ? 'Company' : 'Individual');
    setText('dashboard-settings-email', currentUser.email || '—');

    document.querySelectorAll('.dashboard-nav-btn').forEach(function(button) {
        button.addEventListener('click', function() {
            activatePanel(button.getAttribute('data-panel'));
        });
    });

    function getUserTokenizationItems() {
        var published = app.readJson(app.KEYS.tokenizationSubmissions, []);
        var draft = app.readJson(app.KEYS.tokenizationDraft, null);
        var items = [];

        if (Array.isArray(published)) {
            published.forEach(function(entry) {
                var submission = entry && entry.submissionData ? entry.submissionData : null;
                if (!submission) return;
                if (String(submission.creatorUserId || '') !== String(currentUser.id)) return;
                items.push({
                    id: entry.id,
                    title: submission.property && submission.property.propertyName,
                    summary: submission.property && submission.property.description,
                    address: submission.property && submission.property.address,
                    assetType: submission.property && submission.property.assetType,
                    budget: submission.financials && submission.financials.totalCapitalRaise
                        ? '$' + Number(submission.financials.totalCapitalRaise).toLocaleString()
                        : '',
                    yieldValue: submission.financials && submission.financials.estimatedAnnualYield,
                    status: submission.status || 'published',
                    creatorUserId: submission.creatorUserId,
                    createdAt: entry.publishedAt || new Date().toISOString(),
                    updatedAt: entry.updatedAt || entry.publishedAt || new Date().toISOString(),
                    __sourceKey: app.KEYS.tokenizationSubmissions,
                    __typeLabel: 'Tokenization',
                    __editHref: 'post-tokenization.html?edit=' + encodeURIComponent(entry.id),
                    __cardType: 'tokenization'
                });
            });
        }

        if (draft && draft.formValues && draft.submissionData && String(draft.submissionData.creatorUserId || '') === String(currentUser.id)) {
            items.push({
                id: draft.id || 'tokenization-draft',
                title: draft.formValues.propertyName,
                summary: draft.formValues.description,
                address: draft.formValues.address,
                assetType: draft.formValues.assetType,
                budget: draft.formValues.totalCapitalRaise ? '$' + Number(draft.formValues.totalCapitalRaise).toLocaleString() : '',
                yieldValue: draft.formValues.estimatedAnnualYield,
                status: 'draft',
                creatorUserId: draft.submissionData.creatorUserId,
                createdAt: draft.savedAt || new Date().toISOString(),
                updatedAt: draft.savedAt || new Date().toISOString(),
                __sourceKey: app.KEYS.tokenizationDraft,
                __typeLabel: 'Tokenization Draft',
                __editHref: 'post-tokenization.html?draft=1',
                __cardType: 'tokenization'
            });
        }

        return items;
    }

    function getAllItems() {
        return []
            .concat(app.getUserItems(app.KEYS.opportunities).map(function(item) {
                item.__sourceKey = app.KEYS.opportunities;
                item.__typeLabel = 'Opportunity';
                item.__editHref = 'post-opportunity.html?edit=' + encodeURIComponent(item.id);
                item.__cardType = 'opportunity';
                return item;
            }))
            .concat(app.getUserItems(app.KEYS.opportunityDrafts).map(function(item) {
                item.__sourceKey = app.KEYS.opportunityDrafts;
                item.__typeLabel = 'Opportunity Draft';
                item.__editHref = 'post-opportunity.html?edit=' + encodeURIComponent(item.id) + '&draft=1';
                item.__cardType = 'opportunity';
                return item;
            }))
            .concat(app.getUserItems(app.KEYS.services).map(function(item) {
                item.__sourceKey = app.KEYS.services;
                item.__typeLabel = 'Service';
                item.__editHref = 'post-service.html?edit=' + encodeURIComponent(item.id);
                item.__cardType = 'service';
                return item;
            }))
            .concat(app.getUserItems(app.KEYS.serviceDrafts).map(function(item) {
                item.__sourceKey = app.KEYS.serviceDrafts;
                item.__typeLabel = 'Service Draft';
                item.__editHref = 'post-service.html?edit=' + encodeURIComponent(item.id) + '&draft=1';
                item.__cardType = 'service';
                return item;
            }))
            .concat(app.getUserItems(app.KEYS.openToWork).map(function(item) {
                item.__sourceKey = app.KEYS.openToWork;
                item.__typeLabel = 'Open to Work';
                item.__editHref = 'profile.html';
                item.__cardType = 'open-to-work';
                return item;
            }))
            .concat(app.getUserItems(app.KEYS.openToWorkDrafts).map(function(item) {
                item.__sourceKey = app.KEYS.openToWorkDrafts;
                item.__typeLabel = 'Open to Work Draft';
                item.__editHref = 'open-to-work.html';
                item.__cardType = 'open-to-work';
                return item;
            }))
            .concat(getUserTokenizationItems())
            .sort(function(a, b) {
                return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
            });
    }

    var allItems = getAllItems();
    var itemList = document.getElementById('dashboard-item-list');
    var emptyState = document.getElementById('dashboard-items-empty');

    function getInterestsFor(itemId) {
        return app.readJson(app.KEYS.interests, []).filter(function(entry) {
            return String(entry.cardId) === String(itemId);
        });
    }

    function getCardThread(threadCardId) {
        return app.getThreadsForUser(currentUser.id).find(function(thread) {
            return String(thread.cardId) === String(threadCardId);
        }) || null;
    }

    function renderItemCard(item) {
        var interests = getInterestsFor(item.id);
        var bidStats = app.getCardBidStats(item.id);
        var title = item.title || item.roleTitle || item.category || 'Untitled';
        var details = item.summary || item.description || item.location || 'No details added yet.';
        var metaBits = [];
        var statusClass = String(item.status || '').toLowerCase() === 'closed/awarded' ? 'dashboard-tag closed' : 'dashboard-tag';

        if (item.city) metaBits.push(item.city);
        if (item.region) metaBits.push(item.region);
        if (item.budget) metaBits.push('Budget: ' + item.budget);
        if (item.radius) metaBits.push(item.radius);
        if (item.roleTitle) metaBits.push(item.roleTitle);
        if (item.address) metaBits.push(item.address);
        if (item.assetType) metaBits.push(item.assetType);
        if (item.yieldValue) metaBits.push('Yield: ' + item.yieldValue + '%');

        var article = document.createElement('article');
        article.className = item.__typeLabel.indexOf('Opportunity') === 0 || item.__cardType === 'tokenization'
            ? 'feed-card'
            : 'feed-card compact';
        article.setAttribute('data-item-id', item.id);
        article.setAttribute('data-source-key', item.__sourceKey);
        article.setAttribute('data-card-type', item.__cardType);

        var body = ''
            + '<div class="card-type">' + escapeHtml(item.__typeLabel) + '</div>'
            + (item.imageDataUrl
                ? '<img class="card-image" src="' + escapeHtml(item.imageDataUrl) + '" alt="">'
                : (item.__cardType === 'tokenization' ? '<div class="card-image-placeholder">Tokenization</div>' : ''))
            + '<div class="card-body">'
            + '<div class="card-meta"><span class="' + statusClass + '">' + escapeHtml(item.status || 'published') + '</span>' + (metaBits.length ? '<span>' + metaBits.map(escapeHtml).join(' · ') + '</span>' : '') + '</div>'
            + '<h3 class="card-title">' + escapeHtml(title) + '</h3>'
            + '<div class="card-details">' + escapeHtml(details) + '</div>';

        if (bidStats.pending > 0 || bidStats.awarded) {
            body += '<div class="dashboard-thread-badges">';
            if (bidStats.pending > 0) {
                body += '<span class="dashboard-alert-badge bid">Bid Received</span>';
            }
            if (bidStats.awarded) {
                body += '<span class="dashboard-alert-badge awarded">Closed/Awarded</span>';
            }
            body += '</div>';
        }

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
            + '<span class="card-details">Last updated ' + escapeHtml(new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleDateString()) + '</span>'
            + '<div class="dashboard-item-toolbar-right">'
            + '<select class="dashboard-status-select" data-status-id="' + escapeHtml(item.id) + '">'
            + '<option value="draft"' + ((item.status || '') === 'draft' ? ' selected' : '') + '>Draft</option>'
            + '<option value="published"' + ((item.status || '') === 'published' ? ' selected' : '') + '>Published</option>'
            + '<option value="paused"' + ((item.status || '') === 'paused' ? ' selected' : '') + '>Paused</option>'
            + '<option value="closed/awarded"' + ((item.status || '') === 'closed/awarded' ? ' selected' : '') + '>Closed/Awarded</option>'
            + '</select>'
            + (getCardThread(item.id) ? '<button type="button" class="dashboard-action-btn dashboard-open-thread-btn" data-thread-card-id="' + escapeHtml(item.id) + '">Messages</button>' : '')
            + '<a href="' + escapeHtml(item.__editHref) + '" class="dashboard-action-btn">Edit</a>'
            + '<button type="button" class="dashboard-action-btn dashboard-delete-btn" data-delete-id="' + escapeHtml(item.id) + '">Delete</button>'
            + '</div>'
            + '</div>'
            + '</div>';

        article.innerHTML = body;
        return article;
    }

    function renderItems() {
        allItems = getAllItems();
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

    function updateTokenizationStatus(sourceKey, itemId, nextStatus) {
        if (sourceKey === app.KEYS.tokenizationDraft) {
            var draft = app.readJson(app.KEYS.tokenizationDraft, null);
            if (!draft || !draft.submissionData) return;
            draft.submissionData.status = nextStatus;
            draft.savedAt = new Date().toISOString();
            app.writeJson(app.KEYS.tokenizationDraft, draft);
            return;
        }

        var entries = app.readJson(app.KEYS.tokenizationSubmissions, []);
        if (!Array.isArray(entries)) return;
        entries = entries.map(function(entry) {
            if (String(entry.id) !== String(itemId)) return entry;
            if (!entry.submissionData) entry.submissionData = {};
            entry.submissionData.status = nextStatus;
            entry.updatedAt = new Date().toISOString();
            return entry;
        });
        app.writeJson(app.KEYS.tokenizationSubmissions, entries);
    }

    function removeDashboardItem(sourceKey, itemId) {
        if (sourceKey === app.KEYS.tokenizationDraft) {
            localStorage.removeItem(app.KEYS.tokenizationDraft);
            return;
        }

        if (sourceKey === app.KEYS.tokenizationSubmissions) {
            var entries = app.readJson(app.KEYS.tokenizationSubmissions, []);
            if (!Array.isArray(entries)) return;
            app.writeJson(app.KEYS.tokenizationSubmissions, entries.filter(function(entry) {
                return String(entry.id) !== String(itemId);
            }));
            return;
        }

        app.removeItem(sourceKey, itemId);
    }

    if (itemList) {
        itemList.addEventListener('change', function(event) {
            var select = event.target.closest('.dashboard-status-select');
            if (!select) return;
            var card = select.closest('[data-source-key]');
            if (!card) return;
            var sourceKey = card.getAttribute('data-source-key');
            var itemId = select.getAttribute('data-status-id');
            if (sourceKey === app.KEYS.tokenizationSubmissions || sourceKey === app.KEYS.tokenizationDraft) {
                updateTokenizationStatus(sourceKey, itemId, select.value);
            } else {
                app.updateItem(sourceKey, itemId, function(item) {
                    item.status = select.value;
                    item.updatedAt = new Date().toISOString();
                    return item;
                });
            }
            renderItems();
            renderThreads();
            renderActiveThread();
        });

        itemList.addEventListener('click', function(event) {
            var deleteBtn = event.target.closest('.dashboard-delete-btn');
            if (deleteBtn) {
                var itemId = deleteBtn.getAttribute('data-delete-id');
                var card = deleteBtn.closest('[data-source-key]');
                if (!card) return;
                removeDashboardItem(card.getAttribute('data-source-key'), itemId);
                renderItems();
                return;
            }

            var openThreadBtn = event.target.closest('.dashboard-open-thread-btn');
            if (openThreadBtn) {
                var thread = getCardThread(openThreadBtn.getAttribute('data-thread-card-id'));
                if (!thread) return;
                activatePanel('messages');
                selectThread(thread.id);
            }
        });
    }

    var threadList = document.getElementById('dashboard-thread-list');
    var threadCount = document.getElementById('dashboard-thread-count');
    var messagesEmpty = document.getElementById('dashboard-messages-empty');
    var chatEmpty = document.getElementById('dashboard-chat-empty');
    var chatShell = document.getElementById('dashboard-chat-shell');
    var chatMessages = document.getElementById('dashboard-chat-messages');
    var chatTitle = document.getElementById('dashboard-chat-title');
    var chatType = document.getElementById('dashboard-chat-type');
    var chatSubtitle = document.getElementById('dashboard-chat-subtitle');
    var chatHeaderActions = document.getElementById('dashboard-chat-header-actions');
    var chatForm = document.getElementById('dashboard-chat-form');
    var chatInput = document.getElementById('dashboard-chat-input');
    var openBidBtn = document.getElementById('dashboard-open-bid-btn');
    var bidPanel = document.getElementById('dashboard-bid-panel');
    var bidCancel = document.getElementById('dashboard-bid-cancel');
    var bidForm = document.getElementById('dashboard-bid-form');
    var bidAmount = document.getElementById('dashboard-bid-amount');
    var bidTimeline = document.getElementById('dashboard-bid-timeline');
    var bidDetails = document.getElementById('dashboard-bid-details');

    function getOtherParty(thread) {
        if (!thread) return { name: 'Contact', userId: '' };
        if (String(thread.ownerUserId || '') === String(currentUser.id)) {
            var recipient = app.getUserById(thread.recipientUserId);
            return {
                name: (recipient && recipient.name) || thread.recipientName || 'Interested user',
                userId: thread.recipientUserId || ''
            };
        }
        var owner = app.getUserById(thread.ownerUserId);
        return {
            name: (owner && owner.name) || thread.ownerName || 'Card owner',
            userId: thread.ownerUserId || ''
        };
    }

    function getLatestMessage(thread) {
        var list = thread && Array.isArray(thread.messages) ? thread.messages : [];
        return list.length ? list[list.length - 1] : null;
    }

    function getThreadPreview(thread) {
        var latest = getLatestMessage(thread);
        if (!latest) return 'No messages yet.';
        if (latest.type === 'bid') return 'Bid submitted';
        return latest.text || 'New message';
    }

    function hideBidPanel() {
        pendingCompose = '';
        if (bidPanel) bidPanel.hidden = true;
        if (bidForm) bidForm.reset();
        updateUrl();
    }

    function showBidPanel() {
        if (bidPanel) bidPanel.hidden = false;
        pendingCompose = 'bid';
        updateUrl();
        if (bidAmount) bidAmount.focus();
    }

    function renderThreads() {
        var threads = app.getThreadsForUser(currentUser.id);
        if (threadCount) threadCount.textContent = String(threads.length);
        if (threadList) threadList.innerHTML = '';
        if (messagesEmpty) messagesEmpty.style.display = threads.length ? 'none' : 'flex';

        if (!threads.length) {
            activeThreadId = '';
            updateUrl();
            renderActiveThread();
            return;
        }

        if (!activeThreadId || !app.getThreadById(activeThreadId)) {
            activeThreadId = threads[0].id;
        }

        threads.forEach(function(thread) {
            var button = document.createElement('button');
            var preview = getThreadPreview(thread);
            var otherParty = getOtherParty(thread);
            var unread = Array.isArray(thread.unreadBy) && thread.unreadBy.indexOf(String(currentUser.id)) >= 0;
            var pendingBids = app.getThreadPendingBids(thread.id).length;
            var badges = '';
            if (pendingBids && String(thread.ownerUserId || '') === String(currentUser.id)) {
                badges += '<span class="dashboard-alert-badge bid">Bid Received</span>';
            }
            if ((thread.status || '') === 'closed/awarded') {
                badges += '<span class="dashboard-alert-badge awarded">Awarded</span>';
            }
            button.type = 'button';
            button.className = 'dashboard-thread-item' + (String(thread.id) === String(activeThreadId) ? ' active' : '');
            button.setAttribute('data-thread-id', thread.id);
            button.innerHTML = ''
                + '<div class="dashboard-thread-item-top"><strong>' + escapeHtml(thread.cardTitle || 'Card') + '</strong><span>' + escapeHtml(new Date(thread.updatedAt || thread.createdAt || Date.now()).toLocaleDateString()) + '</span></div>'
                + '<div class="dashboard-thread-preview">' + escapeHtml(otherParty.name) + ' · ' + escapeHtml(preview) + '</div>'
                + '<div class="dashboard-thread-item-bottom"><span>' + escapeHtml(thread.cardLabel || 'Opportunity') + '</span><span class="dashboard-thread-badges">' + badges + (unread ? '<span class="dashboard-alert-badge bid">New</span>' : '') + '</span></div>';
            if (threadList) threadList.appendChild(button);
        });
    }

    function renderMessageBubble(message, thread) {
        var row = document.createElement('div');
        var isMine = String(message.senderUserId) === String(currentUser.id);
        var roleClass = message.type === 'system' || String(message.senderUserId) === 'system'
            ? 'system'
            : (isMine ? 'mine' : 'theirs');
        row.className = 'dashboard-message-row ' + roleClass;

        var bidMarkup = '';
        if (message.type === 'bid' && message.bid) {
            bidMarkup = ''
                + '<div class="dashboard-message-bid">'
                + '<strong>' + escapeHtml(message.bid.status === 'accepted' ? 'Accepted bid' : 'Submitted bid') + '</strong>'
                + '<div class="dashboard-message-bid-grid">'
                + '<div><span>Amount</span><div>' + escapeHtml(message.bid.proposedAmount || '—') + '</div></div>'
                + '<div><span>Timeline</span><div>' + escapeHtml(message.bid.estimatedTimeline || '—') + '</div></div>'
                + '</div>'
                + '<div>' + escapeHtml(message.bid.proposalDetails || message.text || '') + '</div>'
                + '</div>';
        }

        row.innerHTML = ''
            + '<div class="dashboard-message-bubble">'
            + '<div class="dashboard-message-meta"><strong>' + escapeHtml(message.senderName || 'BricksNexus') + '</strong><span>' + escapeHtml(new Date(message.createdAt || Date.now()).toLocaleString()) + '</span></div>'
            + (message.type !== 'bid' ? '<div>' + escapeHtml(message.text || '') + '</div>' : '')
            + bidMarkup
            + '</div>';
        return row;
    }

    function renderActiveThread() {
        var thread = activeThreadId ? app.getThreadById(activeThreadId) : null;
        if (!thread) {
            if (chatEmpty) chatEmpty.hidden = false;
            if (chatShell) chatShell.hidden = true;
            hideBidPanel();
            return;
        }

        app.markThreadRead(thread.id, currentUser.id);
        if (chatEmpty) chatEmpty.hidden = true;
        if (chatShell) chatShell.hidden = false;

        var otherParty = getOtherParty(thread);
        var isOwner = String(thread.ownerUserId || '') === String(currentUser.id);
        var pendingBids = app.getThreadPendingBids(thread.id);
        var latestPendingBid = pendingBids.length ? pendingBids[pendingBids.length - 1] : null;

        if (chatTitle) chatTitle.textContent = thread.cardTitle || 'Card discussion';
        if (chatType) chatType.textContent = thread.cardLabel || 'Opportunity';
        if (chatSubtitle) {
            chatSubtitle.textContent = (thread.status === 'closed/awarded' ? 'Awarded' : 'Talking with ') + otherParty.name;
        }

        if (chatMessages) {
            chatMessages.innerHTML = '';
            (thread.messages || []).forEach(function(message) {
                chatMessages.appendChild(renderMessageBubble(message, thread));
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        if (chatHeaderActions) {
            chatHeaderActions.innerHTML = '';
            if (isOwner && latestPendingBid && thread.status !== 'closed/awarded') {
                var awardBtn = document.createElement('button');
                awardBtn.type = 'button';
                awardBtn.className = 'dashboard-action-btn';
                awardBtn.setAttribute('data-award-message-id', latestPendingBid.id);
                awardBtn.textContent = thread.cardType === 'service' ? 'Hire' : 'Accept Bid';
                chatHeaderActions.appendChild(awardBtn);
            }
        }

        if (openBidBtn) {
            openBidBtn.hidden = isOwner || !thread.bidAllowed || thread.status === 'closed/awarded';
        }

        if (pendingCompose === 'bid' && !isOwner && thread.bidAllowed && thread.status !== 'closed/awarded') {
            showBidPanel();
        } else if (pendingCompose !== 'bid') {
            hideBidPanel();
        }

        renderThreads();
        renderItems();
    }

    function selectThread(threadId) {
        activeThreadId = threadId || '';
        pendingCompose = '';
        updateUrl();
        renderActiveThread();
    }

    if (threadList) {
        threadList.addEventListener('click', function(event) {
            var button = event.target.closest('.dashboard-thread-item');
            if (!button) return;
            activatePanel('messages');
            selectThread(button.getAttribute('data-thread-id'));
        });
    }

    if (chatForm) {
        chatForm.addEventListener('submit', function(event) {
            event.preventDefault();
            if (!activeThreadId || !chatInput) return;
            var text = String(chatInput.value || '').trim();
            if (!text) return;
            app.sendThreadMessage(activeThreadId, { text: text });
            chatInput.value = '';
            renderThreads();
            renderActiveThread();
        });
    }

    if (openBidBtn) {
        openBidBtn.addEventListener('click', function() {
            if (!activeThreadId) return;
            showBidPanel();
        });
    }

    if (bidCancel) {
        bidCancel.addEventListener('click', function() {
            hideBidPanel();
        });
    }

    if (bidForm) {
        bidForm.addEventListener('submit', function(event) {
            event.preventDefault();
            if (!activeThreadId) return;
            app.submitBid(activeThreadId, {
                proposedAmount: String((bidAmount && bidAmount.value) || '').trim(),
                estimatedTimeline: String((bidTimeline && bidTimeline.value) || '').trim(),
                details: String((bidDetails && bidDetails.value) || '').trim()
            });
            hideBidPanel();
            renderThreads();
            renderActiveThread();
        });
    }

    if (chatHeaderActions) {
        chatHeaderActions.addEventListener('click', function(event) {
            var awardBtn = event.target.closest('[data-award-message-id]');
            if (!awardBtn || !activeThreadId) return;
            app.awardThread(activeThreadId, awardBtn.getAttribute('data-award-message-id'));
            renderThreads();
            renderActiveThread();
            renderItems();
        });
    }

    var logoutBtn = document.getElementById('dashboard-logout-btn');
    var prefEmail = document.getElementById('dashboard-pref-email');
    var prefMarketplace = document.getElementById('dashboard-pref-marketplace');
    var deleteBtn = document.getElementById('dashboard-delete-account-btn');
    var deleteModal = document.getElementById('dashboard-delete-modal');
    var deleteCancel = document.getElementById('dashboard-delete-cancel');
    var deleteConfirm = document.getElementById('dashboard-delete-confirm');

    if (prefEmail) prefEmail.checked = !(currentUser.preferences && currentUser.preferences.emailNotifications === false);
    if (prefMarketplace) prefMarketplace.checked = !(currentUser.preferences && currentUser.preferences.marketplaceUpdates === false);

    function persistPreferences() {
        currentUser = app.updateCurrentUser({
            preferences: {
                emailNotifications: !!(prefEmail && prefEmail.checked),
                marketplaceUpdates: !!(prefMarketplace && prefMarketplace.checked)
            }
        }) || currentUser;
    }

    if (prefEmail) prefEmail.addEventListener('change', persistPreferences);
    if (prefMarketplace) prefMarketplace.addEventListener('change', persistPreferences);

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            app.clearSession();
            window.location.href = 'index.html';
        });
    }

    if (deleteBtn && deleteModal) {
        deleteBtn.addEventListener('click', function() {
            deleteModal.showModal();
        });
    }

    if (deleteCancel && deleteModal) {
        deleteCancel.addEventListener('click', function() {
            deleteModal.close();
        });
    }

    if (deleteModal) {
        deleteModal.addEventListener('click', function(event) {
            if (event.target === deleteModal) deleteModal.close();
        });
    }

    if (deleteConfirm) {
        deleteConfirm.addEventListener('click', function() {
            app.deleteCurrentUser();
            window.location.href = 'index.html';
        });
    }

    window.addEventListener('storage', function(event) {
        if ([app.KEYS.messages, app.KEYS.opportunities, app.KEYS.services, app.KEYS.openToWork, app.KEYS.interests, app.KEYS.tokenizationDraft, app.KEYS.tokenizationSubmissions].indexOf(event.key) === -1) return;
        currentUser = app.getCurrentUser() || currentUser;
        renderItems();
        renderThreads();
        renderActiveThread();
    });

    activatePanel(activePanel);
    renderThreads();
    renderActiveThread();
})();
