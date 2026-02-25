document.addEventListener('DOMContentLoaded', function() {
    const submitBtn = document.getElementById('opp-submit');
    const draftBtn = document.getElementById('opp-save-draft');

    function collectOpportunityData() {
        const titleEl = document.getElementById('opp-title');
        const summaryEl = document.getElementById('opp-summary');
        const cityEl = document.getElementById('opp-city');
        const regionEl = document.getElementById('opp-region');
        const budgetEl = document.getElementById('opp-budget');
        const termsEl = document.getElementById('opp-terms');
        const equityEl = document.getElementById('opp-equity');
        const roiEl = document.getElementById('opp-roi');
        const radiusEl = document.getElementById('opp-address');
        const attachmentsEl = document.getElementById('opp-attachments');

        const title = (titleEl?.value || '').trim();
        const summary = (summaryEl?.value || '').trim();
        const city = (cityEl?.value || '').trim();
        const region = (regionEl?.value || '').trim();
        const budget = (budgetEl?.value || '').trim();
        const terms = (termsEl?.value || '').trim();
        const equity = (equityEl?.value || '').trim();
        const roi = (roiEl?.value || '').trim();
        const address = (radiusEl?.value || '').trim();

        const opp = {
            id: Date.now(),
            title,
            summary,
            city,
            region,
            budget,
            terms,
            equity,
            roi,
            address,
            createdAt: new Date().toISOString(),
            imageDataUrl: null
        };

        const files = attachmentsEl?.files || [];
        return { opp, titleEl, files };
    }

    function saveOpportunityToStorage(key, opp) {
        try {
            const existingRaw = localStorage.getItem(key);
            const list = existingRaw ? JSON.parse(existingRaw) : [];
            list.unshift(opp);
            localStorage.setItem(key, JSON.stringify(list));
        } catch (e) {
            console.error('Failed to save opportunity to localStorage', e);
        }
    }

    function handleSave(key, redirect) {
        const result = collectOpportunityData();
        if (!result) return;
        const { opp, titleEl, files } = result;

        if (!opp.title) {
            alert('Please enter an opportunity title before continuing.');
            titleEl?.focus();
            return;
        }

        const firstFile = files && files.length ? files[0] : null;
        if (firstFile && firstFile.type && firstFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                opp.imageDataUrl = e.target?.result || null;
                saveOpportunityToStorage(key, opp);
                if (redirect) window.location.href = 'index.html';
            };
            reader.onerror = function() {
                saveOpportunityToStorage(key, opp);
                if (redirect) window.location.href = 'index.html';
            };
            reader.readAsDataURL(firstFile);
        } else {
            saveOpportunityToStorage(key, opp);
            if (redirect) window.location.href = 'index.html';
        }
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', function() {
            handleSave('bricksnexus_opportunities', true);
        });
    }

    if (draftBtn) {
        draftBtn.addEventListener('click', function() {
            handleSave('bricksnexus_opportunity_drafts', false);
            alert('Draft saved locally. You can safely leave this page and come back later.');
        });
    }
});

