(function() {
    const initials = sessionStorage.getItem('bricksnexus_initials') || '';
    const name = sessionStorage.getItem('bricksnexus_name') || '';
    const email = sessionStorage.getItem('bricksnexus_email') || '';
    const photo = sessionStorage.getItem('bricksnexus_photo') || '';

    const avatarEl = document.getElementById('top-bar-avatar');
    if (avatarEl) {
        avatarEl.textContent = initials.toUpperCase();
    }

    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const hintEl = document.getElementById('profile-initials-hint');
    const photoEl = document.getElementById('profile-photo');
    const placeholderEl = document.getElementById('profile-photo-placeholder');

    if (nameEl) nameEl.textContent = name || 'Profile';
    if (emailEl) emailEl.textContent = email || 'No email set';
    if (hintEl) hintEl.textContent = 'Signed in as ' + (initials ? initials.toUpperCase() : '') + (email ? ' · ' + email : '');

    if (photo && photoEl && placeholderEl) {
        photoEl.src = photo;
        photoEl.style.display = 'block';
        placeholderEl.style.display = 'none';
    } else if (placeholderEl) {
        placeholderEl.textContent = (initials || 'U').toUpperCase();
    }

    const myCardsList = document.getElementById('my-cards-list');
    const noCardsMsg = document.getElementById('no-cards-message');

    let opportunities = [];
    let services = [];
    let interests = [];
    try {
        opportunities = JSON.parse(localStorage.getItem('bricksnexus_opportunities') || '[]');
        services = JSON.parse(localStorage.getItem('bricksnexus_services') || '[]');
        interests = JSON.parse(localStorage.getItem('bricksnexus_interests') || '[]');
    } catch (e) {
        console.error('Failed to read profile data', e);
    }

    const myOpportunities = Array.isArray(opportunities) ? opportunities.filter(function(o) {
        return (o.creatorId || '').toUpperCase() === initials.toUpperCase();
    }) : [];
    const myServices = Array.isArray(services) ? services.filter(function(s) {
        return (s.creatorId || '').toUpperCase() === initials.toUpperCase();
    }) : [];

    function getInterestsForCard(cardId) {
        return interests.filter(function(i) { return String(i.cardId) === String(cardId); });
    }

    function renderCard(item, type) {
        const title = item.title || (type === 'opportunity' ? 'Opportunity' : 'Service');
        const cardId = item.id;
        const cardInterests = getInterestsForCard(cardId);

        const div = document.createElement('div');
        div.className = 'profile-card';

        let interestedHtml = '';
        if (cardInterests.length) {
            interestedHtml = '<ul class="interested-list">' + cardInterests.map(function(interest) {
                const by = (interest.interestedByName || interest.interestedBy || 'Someone').trim() || 'Someone';
                const inits = (interest.interestedBy || '?').toUpperCase();
                return '<li><span class="interest-initials">' + inits + '</span> ' + escapeHtml(by) + '</li>';
            }).join('') + '</ul>';
        } else {
            interestedHtml = '<p class="no-interests">No one has expressed interest yet.</p>';
        }

        div.innerHTML =
            '<span class="profile-card-type">' + (type === 'opportunity' ? 'Opportunity' : 'Service') + '</span>' +
            '<h3 class="profile-card-title">' + escapeHtml(title) + '</h3>' +
            '<p class="interested-heading">Who expressed interest</p>' +
            interestedHtml;

        return div;
    }

    function escapeHtml(s) {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    if (myCardsList) {
        myOpportunities.forEach(function(opp) {
            myCardsList.appendChild(renderCard(opp, 'opportunity'));
        });
        myServices.forEach(function(svc) {
            myCardsList.appendChild(renderCard(svc, 'service'));
        });
    }

    if (noCardsMsg) {
        noCardsMsg.style.display = (myOpportunities.length === 0 && myServices.length === 0) ? 'block' : 'none';
    }
})();
