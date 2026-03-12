window.BricksNexusApp = (function() {
    'use strict';

    var KEYS = {
        users: 'bricksnexus_users',
        currentUserId: 'bricksnexus_current_user_id',
        openToWork: 'bricksnexus_open_to_work',
        opportunities: 'bricksnexus_opportunities',
        opportunityDrafts: 'bricksnexus_opportunity_drafts',
        services: 'bricksnexus_services',
        serviceDrafts: 'bricksnexus_service_drafts',
        openToWorkDrafts: 'bricksnexus_open_to_work_drafts',
        tokenizationDraft: 'bricksnexus_tokenization_draft',
        tokenizationSubmissions: 'bricksnexus_tokenization_submissions',
        messages: 'bricksnexus_messages',
        interests: 'bricksnexus_interests'
    };

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.error('Failed to parse storage key', key, error);
            return fallback;
        }
    }

    function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function createId(prefix) {
        return (prefix || 'id') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    }

    function getInitials(name, email) {
        var cleanName = (name || '').trim();
        if (cleanName) {
            var parts = cleanName.split(/\s+/).filter(Boolean);
            if (parts.length >= 2) {
                return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
            }
            return cleanName.slice(0, 2).toUpperCase();
        }

        var prefix = ((email || '').split('@')[0] || '').trim();
        return (prefix.slice(0, 2) || 'BN').toUpperCase();
    }

    function getUsers() {
        var list = readJson(KEYS.users, []);
        return Array.isArray(list) ? list : [];
    }

    function getUserById(userId) {
        if (userId == null) return null;
        return getUsers().find(function(user) {
            return String(user.id) === String(userId);
        }) || null;
    }

    function saveUsers(users) {
        writeJson(KEYS.users, users);
    }

    function createSession(user) {
        if (!user) return;
        localStorage.setItem(KEYS.currentUserId, user.id);
        sessionStorage.setItem('bricksnexus_initials', user.initials || getInitials(user.name, user.email));
        sessionStorage.setItem('bricksnexus_name', user.name || '');
        sessionStorage.setItem('bricksnexus_email', user.email || '');
        sessionStorage.setItem('bricksnexus_role', user.accountType || 'individual');
        sessionStorage.setItem('bricksnexus_profile_picture', user.profileImage || user.profilePicture || '');
    }

    function clearSession() {
        localStorage.removeItem(KEYS.currentUserId);
        sessionStorage.removeItem('bricksnexus_initials');
        sessionStorage.removeItem('bricksnexus_name');
        sessionStorage.removeItem('bricksnexus_email');
        sessionStorage.removeItem('bricksnexus_role');
        sessionStorage.removeItem('bricksnexus_profile_picture');
    }

    function getCurrentUser() {
        var userId = localStorage.getItem(KEYS.currentUserId);
        if (!userId) return null;

        var users = getUsers();
        var match = users.find(function(user) {
            return String(user.id) === String(userId);
        });

        if (!match) return null;
        return match;
    }

    function isAuthenticated() {
        return !!getCurrentUser();
    }

    function upsertUser(payload) {
        var users = getUsers();
        var existingIndex = users.findIndex(function(user) {
            return user.email.toLowerCase() === String(payload.email || '').toLowerCase();
        });

        var base = existingIndex >= 0 ? users[existingIndex] : null;
        var user = {
            id: base ? base.id : Date.now(),
            name: payload.name || (base && base.name) || '',
            email: payload.email || (base && base.email) || '',
            accountType: payload.accountType || (base && base.accountType) || 'individual',
            initials: payload.initials || (base && base.initials) || getInitials(payload.name || (base && base.name), payload.email || (base && base.email)),
            profileImage: payload.profileImage || payload.profilePicture || (base && (base.profileImage || base.profilePicture)) || '',
            professionalTitle: payload.professionalTitle !== undefined ? payload.professionalTitle : ((base && base.professionalTitle) || ''),
            bio: payload.bio !== undefined ? payload.bio : ((base && base.bio) || ''),
            location: payload.location !== undefined ? payload.location : ((base && base.location) || ''),
            publishRoleCard: payload.publishRoleCard !== undefined ? !!payload.publishRoleCard : !!(base && base.publishRoleCard),
            preferences: payload.preferences || (base && base.preferences) || {
                emailNotifications: true,
                marketplaceUpdates: true
            },
            createdAt: (base && base.createdAt) || new Date().toISOString()
        };

        if (existingIndex >= 0) {
            users[existingIndex] = user;
        } else {
            users.unshift(user);
        }

        saveUsers(users);
        return user;
    }

    function createAutoDraftsForUser(user) {
        if (!user) return;

        if (user.accountType === 'company') {
            var companyDrafts = readJson(KEYS.serviceDrafts, []);
            var hasCompanyDraft = companyDrafts.some(function(item) {
                return item.creatorUserId === user.id && item.autoCreated === true;
            });
            if (!hasCompanyDraft) {
                companyDrafts.unshift({
                    id: Date.now(),
                    title: (user.name || 'Company') + ' service profile',
                    category: 'General services',
                    description: 'Draft service card created during registration.',
                    radius: '',
                    consultationOffered: false,
                    status: 'draft',
                    autoCreated: true,
                    hidden: true,
                    publishToFeed: false,
                    createdAt: new Date().toISOString(),
                    creatorUserId: user.id,
                    creatorId: user.initials,
                    creatorName: user.name,
                    creatorEmail: user.email
                });
                writeJson(KEYS.serviceDrafts, companyDrafts);
            }
            return;
        }

        var individualDrafts = readJson(KEYS.openToWorkDrafts, []);
        var hasIndividualDraft = individualDrafts.some(function(item) {
            return item.creatorUserId === user.id && item.autoCreated === true;
        });
        if (!hasIndividualDraft) {
            individualDrafts.unshift({
                id: Date.now(),
                title: (user.name || 'Professional') + ' open to work',
                roleTitle: 'General Contractor',
                location: '',
                summary: 'Draft Open to Work card created during registration.',
                status: 'draft',
                autoCreated: true,
                hidden: true,
                publishToFeed: false,
                createdAt: new Date().toISOString(),
                creatorUserId: user.id,
                creatorId: user.initials,
                creatorName: user.name,
                creatorEmail: user.email
            });
            writeJson(KEYS.openToWorkDrafts, individualDrafts);
        }
    }

    function getUserItems(storageKey) {
        var user = getCurrentUser();
        if (!user) return [];
        var list = readJson(storageKey, []);
        return Array.isArray(list) ? list.filter(function(item) {
            return String(item.creatorUserId || '') === String(user.id)
                || String(item.creatorEmail || '').toLowerCase() === String(user.email || '').toLowerCase()
                || String(item.creatorId || '').toUpperCase() === String(user.initials || '').toUpperCase();
        }) : [];
    }

    function addItem(storageKey, item) {
        var list = readJson(storageKey, []);
        list.unshift(item);
        writeJson(storageKey, list);
    }

    function upsertItem(storageKey, item) {
        var list = readJson(storageKey, []);
        var index = list.findIndex(function(existing) {
            return String(existing.id) === String(item.id);
        });
        if (index >= 0) list[index] = item;
        else list.unshift(item);
        writeJson(storageKey, list);
    }

    function updateItem(storageKey, itemId, updater) {
        var list = readJson(storageKey, []);
        var nextList = list.map(function(item) {
            if (String(item.id) !== String(itemId)) return item;
            return updater(item);
        });
        writeJson(storageKey, nextList);
    }

    function removeItem(storageKey, itemId) {
        var list = readJson(storageKey, []);
        writeJson(storageKey, list.filter(function(item) {
            return String(item.id) !== String(itemId);
        }));
    }

    function requireAuth(returnPath) {
        if (isAuthenticated()) return true;
        var safeReturn = encodeURIComponent(returnPath || 'index.html');
        window.location.href = 'login.html?return=' + safeReturn;
        return false;
    }

    function getCardStorageKeys(cardType) {
        if (cardType === 'service') return [KEYS.services, KEYS.serviceDrafts];
        if (cardType === 'open-to-work') return [KEYS.openToWork, KEYS.openToWorkDrafts];
        if (cardType === 'tokenization') return [KEYS.tokenizationSubmissions];
        return [KEYS.opportunities, KEYS.opportunityDrafts];
    }

    function getCardTypeLabel(cardType, cardRecord) {
        if (cardType === 'service') return 'Service';
        if (cardType === 'open-to-work') return 'Job';
        if (cardType === 'tokenization') return 'Tokenization';
        if (cardRecord && cardRecord.opportunityKind === 'hiring') return 'Job';
        return 'Opportunity';
    }

    function canSubmitBidForCard(cardType, cardRecord) {
        if (cardType === 'tokenization') return false;
        return cardType === 'service' || (!!cardRecord && cardRecord.opportunityKind === 'project');
    }

    function getCardSubmission(cardType, cardRecord) {
        if (cardType === 'tokenization' && cardRecord && cardRecord.submissionData) {
            return cardRecord.submissionData;
        }
        return cardRecord || null;
    }

    function findCardRecord(cardId, cardType) {
        var match = null;
        var storageKey = '';
        getCardStorageKeys(cardType).some(function(key) {
            var list = readJson(key, []);
            match = Array.isArray(list) ? list.find(function(item) {
                return String(item.id) === String(cardId);
            }) : null;
            if (match) {
                storageKey = key;
                return true;
            }
            return false;
        });
        return match ? { record: match, storageKey: storageKey } : null;
    }

    function getThreads() {
        var list = readJson(KEYS.messages, []);
        return Array.isArray(list) ? list : [];
    }

    function saveThreads(threads) {
        writeJson(KEYS.messages, threads);
    }

    function getThreadById(threadId) {
        return getThreads().find(function(thread) {
            return String(thread.id) === String(threadId);
        }) || null;
    }

    function getThreadsForUser(userId) {
        var targetUserId = userId != null ? String(userId) : String((getCurrentUser() || {}).id || '');
        return getThreads().filter(function(thread) {
            return String(thread.ownerUserId || '') === targetUserId
                || String(thread.recipientUserId || '') === targetUserId
                || String(thread.createdByUserId || '') === targetUserId;
        }).sort(function(a, b) {
            return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
        });
    }

    function saveThread(thread) {
        var threads = getThreads();
        var index = threads.findIndex(function(entry) {
            return String(entry.id) === String(thread.id);
        });
        if (index >= 0) threads[index] = thread;
        else threads.unshift(thread);
        saveThreads(threads);
        return thread;
    }

    function buildSampleOwnerId(cardId) {
        return 'sample-owner-' + String(cardId);
    }

    function openCardThread(options) {
        var currentUser = getCurrentUser();
        if (!currentUser || !options || !options.cardId) return null;

        var cardType = options.cardType || 'opportunity';
        var resolvedCard = findCardRecord(options.cardId, cardType);
        var cardRecord = resolvedCard ? resolvedCard.record : null;
        var submission = getCardSubmission(cardType, cardRecord);
        var ownerUserId = String(options.ownerUserId || (submission && submission.creatorUserId) || buildSampleOwnerId(options.cardId));
        var ownerName = options.ownerName || (submission && submission.creatorName) || 'Card owner';
        var cardTitle = options.cardTitle || (submission && (submission.title || submission.roleTitle || submission.category || (submission.property && submission.property.propertyName))) || 'Card';
        var cardLabel = options.cardLabel || getCardTypeLabel(cardType, cardRecord);
        if (ownerUserId === String(currentUser.id) && !options.recipientUserId) return null;
        var threads = getThreads();
        var existing = threads.find(function(thread) {
            return String(thread.cardId) === String(options.cardId)
                && String(thread.cardType) === String(cardType)
                && (
                    (String(thread.ownerUserId || '') === ownerUserId && String(thread.recipientUserId || '') === String(currentUser.id))
                    || (String(thread.ownerUserId || '') === String(currentUser.id) && String(thread.recipientUserId || '') === ownerUserId)
                );
        });

        if (existing) return existing;

        var thread = {
            id: createId('thread'),
            cardId: String(options.cardId),
            cardType: cardType,
            cardTitle: cardTitle,
            cardLabel: cardLabel,
            cardStorageKey: options.cardStorageKey || (resolvedCard && resolvedCard.storageKey) || '',
            ownerUserId: ownerUserId,
            ownerName: ownerName,
            recipientUserId: String(currentUser.id) === ownerUserId ? String(options.recipientUserId || '') : String(currentUser.id),
            recipientName: String(currentUser.id) === ownerUserId ? (options.recipientName || 'Contact') : (currentUser.name || currentUser.initials),
            createdByUserId: String(currentUser.id),
            bidAllowed: canSubmitBidForCard(cardType, cardRecord),
            status: 'active',
            lastActionType: options.actionType || 'contact',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            unreadBy: ownerUserId && ownerUserId !== String(currentUser.id) ? [ownerUserId] : [],
            messages: [{
                id: createId('msg'),
                type: 'system',
                senderUserId: String(currentUser.id),
                senderName: currentUser.name || currentUser.initials,
                text: options.actionType === 'bid' ? 'Conversation opened from a bid request.' : 'Conversation opened from the marketplace.',
                createdAt: new Date().toISOString()
            }]
        };
        return saveThread(thread);
    }

    function markThreadRead(threadId, userId) {
        var targetUserId = String(userId || (getCurrentUser() || {}).id || '');
        if (!targetUserId) return null;
        var thread = getThreadById(threadId);
        if (!thread) return null;
        thread.unreadBy = (thread.unreadBy || []).filter(function(entry) {
            return String(entry) !== targetUserId;
        });
        thread.updatedAt = new Date().toISOString();
        return saveThread(thread);
    }

    function sendThreadMessage(threadId, payload) {
        var currentUser = getCurrentUser();
        var thread = getThreadById(threadId);
        if (!currentUser || !thread) return null;

        var message = {
            id: createId('msg'),
            type: payload && payload.type ? payload.type : 'text',
            senderUserId: String(currentUser.id),
            senderName: currentUser.name || currentUser.initials,
            text: payload && payload.text ? payload.text : '',
            bid: payload && payload.bid ? payload.bid : null,
            status: payload && payload.status ? payload.status : '',
            createdAt: new Date().toISOString()
        };

        thread.messages = Array.isArray(thread.messages) ? thread.messages : [];
        thread.messages.push(message);
        thread.updatedAt = message.createdAt;
        thread.lastMessage = message.type === 'bid' ? 'Bid submitted' : (message.text || 'New message');

        var otherPartyId = String(thread.ownerUserId) === String(currentUser.id) ? String(thread.recipientUserId || '') : String(thread.ownerUserId || '');
        var unreadBy = Array.isArray(thread.unreadBy) ? thread.unreadBy.slice() : [];
        if (otherPartyId && unreadBy.indexOf(otherPartyId) === -1) unreadBy.push(otherPartyId);
        thread.unreadBy = unreadBy.filter(Boolean);

        return saveThread(thread);
    }

    function submitBid(threadId, payload) {
        var thread = getThreadById(threadId);
        if (!thread) return null;
        return sendThreadMessage(threadId, {
            type: 'bid',
            text: payload && payload.details ? payload.details : 'Bid proposal submitted.',
            bid: {
                proposedAmount: payload && payload.proposedAmount ? payload.proposedAmount : '',
                estimatedTimeline: payload && payload.estimatedTimeline ? payload.estimatedTimeline : '',
                proposalDetails: payload && payload.details ? payload.details : '',
                status: 'pending'
            }
        });
    }

    function addSystemThreadMessage(threadId, text) {
        var currentUser = getCurrentUser();
        var thread = getThreadById(threadId);
        if (!thread) return null;
        thread.messages = Array.isArray(thread.messages) ? thread.messages : [];
        thread.messages.push({
            id: createId('msg'),
            type: 'system',
            senderUserId: 'system',
            senderName: 'BricksNexus',
            text: text || '',
            createdAt: new Date().toISOString()
        });
        thread.updatedAt = new Date().toISOString();
        var notifiedUserId = currentUser && String(thread.ownerUserId || '') === String(currentUser.id)
            ? String(thread.recipientUserId || '')
            : String(thread.ownerUserId || '');
        thread.unreadBy = Array.isArray(thread.unreadBy) ? thread.unreadBy.filter(Boolean) : [];
        if (notifiedUserId && thread.unreadBy.indexOf(notifiedUserId) === -1) {
            thread.unreadBy.push(notifiedUserId);
        }
        return saveThread(thread);
    }

    function awardThread(threadId, bidMessageId) {
        var currentUser = getCurrentUser();
        var thread = getThreadById(threadId);
        if (!currentUser || !thread) return null;
        if (String(thread.ownerUserId || '') !== String(currentUser.id)) return null;

        thread.messages = (thread.messages || []).map(function(message) {
            if (message.type !== 'bid') return message;
            if (bidMessageId && String(message.id) !== String(bidMessageId)) return message;
            if (!message.bid) message.bid = {};
            message.bid.status = 'accepted';
            return message;
        });
        thread.status = 'closed/awarded';
        thread.awardedAt = new Date().toISOString();
        thread.updatedAt = thread.awardedAt;
        thread.lastMessage = thread.cardType === 'service' ? 'Hired' : 'Bid accepted';
        saveThread(thread);

        if (thread.cardStorageKey) {
            updateItem(thread.cardStorageKey, thread.cardId, function(item) {
                item.status = 'closed/awarded';
                item.awardedToUserId = thread.recipientUserId;
                item.updatedAt = new Date().toISOString();
                return item;
            });
        }

        return addSystemThreadMessage(thread.id, thread.cardType === 'service'
            ? 'You were hired for this card.'
            : 'Your bid was accepted.');
    }

    function getThreadPendingBids(threadId) {
        var thread = getThreadById(threadId);
        if (!thread || !Array.isArray(thread.messages)) return [];
        return thread.messages.filter(function(message) {
            return message.type === 'bid' && message.bid && message.bid.status !== 'accepted';
        });
    }

    function getCardBidStats(cardId) {
        return getThreads().reduce(function(result, thread) {
            if (String(thread.cardId) !== String(cardId)) return result;
            var pendingCount = (thread.messages || []).filter(function(message) {
                return message.type === 'bid' && message.bid && message.bid.status !== 'accepted';
            }).length;
            result.pending += pendingCount;
            if ((thread.status || '') === 'closed/awarded') result.awarded = true;
            return result;
        }, { pending: 0, awarded: false });
    }

    function updateCurrentUser(updates) {
        var currentUser = getCurrentUser();
        if (!currentUser) return null;
        var nextUser = upsertUser({
            id: currentUser.id,
            name: updates.name !== undefined ? updates.name : currentUser.name,
            email: updates.email !== undefined ? updates.email : currentUser.email,
            accountType: updates.accountType !== undefined ? updates.accountType : currentUser.accountType,
            initials: updates.initials !== undefined ? updates.initials : getInitials(updates.name !== undefined ? updates.name : currentUser.name, updates.email !== undefined ? updates.email : currentUser.email),
            profileImage: updates.profileImage !== undefined ? updates.profileImage : currentUser.profileImage,
            professionalTitle: updates.professionalTitle !== undefined ? updates.professionalTitle : currentUser.professionalTitle,
            bio: updates.bio !== undefined ? updates.bio : currentUser.bio,
            location: updates.location !== undefined ? updates.location : currentUser.location,
            publishRoleCard: updates.publishRoleCard !== undefined ? updates.publishRoleCard : currentUser.publishRoleCard,
            preferences: updates.preferences !== undefined ? updates.preferences : currentUser.preferences,
            createdAt: currentUser.createdAt
        });
        createSession(nextUser);
        return nextUser;
    }

    function getSmartAvatar(user) {
        var current = user || getCurrentUser() || {};
        return {
            image: current.profileImage || current.profilePicture || '',
            initials: getInitials(current.name || '', current.email || '')
        };
    }

    function applySmartAvatar(element, user) {
        if (!element) return;
        var avatar = getSmartAvatar(user);
        element.classList.remove('has-image');
        element.innerHTML = '';
        if (avatar.image) {
            var img = document.createElement('img');
            img.src = avatar.image;
            img.alt = (user && user.name) ? user.name : 'Profile image';
            element.appendChild(img);
            element.classList.add('has-image');
            return;
        }
        element.textContent = avatar.initials.toUpperCase();
    }

    function buildRoleCardFromUser(user, sourceDraft) {
        var draft = sourceDraft || {};
        if (user.accountType === 'company') {
            return {
                id: draft.publishedCardId || ('service-role-' + user.id),
                title: draft.title || ((user.name || 'Company') + ' service profile'),
                category: user.professionalTitle || draft.category || 'Service provider',
                description: user.bio || draft.description || 'Company profile published from your dashboard.',
                radius: user.location || draft.radius || '',
                consultationOffered: !!draft.consultationOffered,
                status: 'published',
                autoCreated: true,
                publishToFeed: true,
                hidden: false,
                createdAt: draft.createdAt || new Date().toISOString(),
                creatorUserId: user.id,
                creatorId: user.initials,
                creatorName: user.name,
                creatorEmail: user.email,
                imageDataUrl: user.profileImage || ''
            };
        }

        return {
            id: draft.publishedCardId || ('open-to-work-role-' + user.id),
            title: user.professionalTitle || draft.roleTitle || 'Open to Work',
            roleTitle: user.professionalTitle || draft.roleTitle || 'Open to Work',
            location: user.location || draft.location || '',
            summary: user.bio || draft.summary || 'Open to Work profile published from your dashboard.',
            status: 'published',
            autoCreated: true,
            publishToFeed: true,
            hidden: false,
            createdAt: draft.createdAt || new Date().toISOString(),
            creatorUserId: user.id,
            creatorId: user.initials,
            creatorName: user.name,
            creatorEmail: user.email,
            imageDataUrl: user.profileImage || ''
        };
    }

    function setRoleCardVisibility(shouldPublish) {
        var user = getCurrentUser();
        if (!user) return null;

        var isCompany = user.accountType === 'company';
        var draftKey = isCompany ? KEYS.serviceDrafts : KEYS.openToWorkDrafts;
        var publishKey = isCompany ? KEYS.services : KEYS.openToWork;
        var drafts = readJson(draftKey, []);
        var published = readJson(publishKey, []);
        var draft = drafts.find(function(item) {
            return String(item.creatorUserId || '') === String(user.id) && item.autoCreated === true;
        });

        if (!draft) {
            createAutoDraftsForUser(user);
            drafts = readJson(draftKey, []);
            draft = drafts.find(function(item) {
                return String(item.creatorUserId || '') === String(user.id) && item.autoCreated === true;
            });
        }

        if (!draft) return null;

        if (shouldPublish) {
            var publishedCard = buildRoleCardFromUser(user, draft);
            published = published.filter(function(item) {
                return String(item.id) !== String(publishedCard.id);
            });
            published.unshift(publishedCard);
            writeJson(publishKey, published);
            draft.publishedCardId = publishedCard.id;
        } else {
            published = published.filter(function(item) {
                return !(String(item.creatorUserId || '') === String(user.id) && item.autoCreated === true);
            });
            writeJson(publishKey, published);
        }

        drafts = drafts.map(function(item) {
            if (String(item.id) !== String(draft.id)) return item;
            item.publishToFeed = !!shouldPublish;
            item.hidden = true;
            return item;
        });
        writeJson(draftKey, drafts);
        return updateCurrentUser({ publishRoleCard: !!shouldPublish });
    }

    function deleteCurrentUser() {
        var user = getCurrentUser();
        if (!user) return;

        saveUsers(getUsers().filter(function(entry) {
            return String(entry.id) !== String(user.id);
        }));

        [
            KEYS.openToWork,
            KEYS.opportunities,
            KEYS.opportunityDrafts,
            KEYS.services,
            KEYS.serviceDrafts,
            KEYS.openToWorkDrafts,
            KEYS.tokenizationSubmissions,
            KEYS.messages
        ].forEach(function(key) {
            var list = readJson(key, []);
            writeJson(key, list.filter(function(item) {
                if (key === KEYS.messages) {
                    return String(item.ownerUserId || '') !== String(user.id)
                        && String(item.recipientUserId || '') !== String(user.id)
                        && String(item.createdByUserId || '') !== String(user.id);
                }
                if (key === KEYS.tokenizationSubmissions) {
                    var submission = item && item.submissionData ? item.submissionData : {};
                    return String(submission.creatorUserId || '') !== String(user.id);
                }
                return String(item.creatorUserId || '') !== String(user.id);
            }));
        });

        localStorage.removeItem(KEYS.tokenizationDraft);

        clearSession();
    }

    return {
        KEYS: KEYS,
        readJson: readJson,
        writeJson: writeJson,
        getInitials: getInitials,
        getUsers: getUsers,
        saveUsers: saveUsers,
        upsertUser: upsertUser,
        createSession: createSession,
        clearSession: clearSession,
        getCurrentUser: getCurrentUser,
        getUserById: getUserById,
        isAuthenticated: isAuthenticated,
        createAutoDraftsForUser: createAutoDraftsForUser,
        getUserItems: getUserItems,
        addItem: addItem,
        upsertItem: upsertItem,
        updateItem: updateItem,
        removeItem: removeItem,
        requireAuth: requireAuth,
        updateCurrentUser: updateCurrentUser,
        getSmartAvatar: getSmartAvatar,
        applySmartAvatar: applySmartAvatar,
        setRoleCardVisibility: setRoleCardVisibility,
        deleteCurrentUser: deleteCurrentUser,
        findCardRecord: findCardRecord,
        getCardTypeLabel: getCardTypeLabel,
        canSubmitBidForCard: canSubmitBidForCard,
        getThreads: getThreads,
        getThreadsForUser: getThreadsForUser,
        getThreadById: getThreadById,
        openCardThread: openCardThread,
        markThreadRead: markThreadRead,
        sendThreadMessage: sendThreadMessage,
        submitBid: submitBid,
        awardThread: awardThread,
        getThreadPendingBids: getThreadPendingBids,
        getCardBidStats: getCardBidStats
    };
})();
