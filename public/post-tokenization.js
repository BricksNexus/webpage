document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    var app = window.BricksNexusApp;
    var currentUser = app.getCurrentUser();
    if (!currentUser) return;
    var query = new URLSearchParams(window.location.search);
    var editId = query.get('edit') || '';
    var isDraftEdit = query.get('draft') === '1';

    var STEP_ORDER = ['property', 'financials', 'legal', 'media'];
    var REQUIRED_FIELDS = [
        'token-property-name-input',
        'token-address-input',
        'token-asset-type',
        'token-description-input',
        'token-capital-raise',
        'token-price-input',
        'token-yield-input',
        'token-dividend-frequency',
        'token-regulation-type',
        'token-spv-name'
    ];
    var LEGAL_DOC_TYPES = ['ppm', 'appraisal', 'title', 'legal'];

    var progressButtons = Array.from(document.querySelectorAll('.token-step'));
    var sections = Array.from(document.querySelectorAll('.token-section'));
    var sectionToggles = Array.from(document.querySelectorAll('.token-section-toggle'));
    var publishButton = document.getElementById('token-publish');
    var toastEl = document.getElementById('token-toast');
    var toastTimer = null;

    var activeStepIndex = 0;
    var unlockedStepIndex = 0;
    var editingPublishedEntry = null;
    var formState = {
        propertyImages: [],
        legalDocuments: []
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function getValue(id) {
        var element = byId(id);
        return element ? String(element.value || '').trim() : '';
    }

    function setValue(id, value) {
        var element = byId(id);
        if (element) element.value = value || '';
    }

    function escapeHtml(value) {
        var div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    }

    function formatCurrency(value) {
        return '$' + Number(value || 0).toLocaleString();
    }

    function formatFileSize(size) {
        if (!size) return '0 KB';
        if (size >= 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB';
        return Math.max(1, Math.round(size / 1024)) + ' KB';
    }

    function getDraftRecord() {
        var draft = app.readJson(app.KEYS.tokenizationDraft, null);
        if (!draft || !draft.formValues) return null;
        if (draft.submissionData && draft.submissionData.creatorUserId && String(draft.submissionData.creatorUserId) !== String(currentUser.id)) return null;
        return draft;
    }

    function getPublishedEntries() {
        var list = app.readJson(app.KEYS.tokenizationSubmissions, []);
        return Array.isArray(list) ? list : [];
    }

    function clearErrors() {
        document.querySelectorAll('.token-error').forEach(function(element) {
            element.classList.remove('token-error');
        });
    }

    function markError(id) {
        var element = byId(id);
        if (element) element.classList.add('token-error');
    }

    function showToast(type, message) {
        if (!toastEl) return;
        toastEl.hidden = false;
        toastEl.className = 'token-toast ' + type;
        toastEl.textContent = message;
        if (toastTimer) window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function() {
            toastEl.hidden = true;
        }, 3200);
    }

    function openStep(stepName) {
        var index = STEP_ORDER.indexOf(stepName);
        if (index === -1 || index > unlockedStepIndex) return;

        activeStepIndex = index;
        sections.forEach(function(section, sectionIndex) {
            section.classList.toggle('active', sectionIndex === index);
        });
        progressButtons.forEach(function(button, buttonIndex) {
            button.classList.toggle('active', buttonIndex === index);
        });
        refreshPublishState();
    }

    function markStepDone(stepName, isDone) {
        var stepButton = document.querySelector('.token-step[data-target-step="' + stepName + '"]');
        var section = document.querySelector('.token-section[data-step="' + stepName + '"]');
        if (stepButton) stepButton.classList.toggle('done', !!isDone);
        if (section) section.classList.toggle('done', !!isDone);
    }

    function updateUnlockedStep(index) {
        unlockedStepIndex = Math.max(unlockedStepIndex, index);
    }

    function isPublishReady() {
        return REQUIRED_FIELDS.every(function(id) {
            return !!getValue(id);
        });
    }

    function refreshPublishState() {
        if (!publishButton) return;
        publishButton.disabled = STEP_ORDER[activeStepIndex] !== 'media' || !isPublishReady();
    }

    function validateStep(stepName, shouldHighlight) {
        clearErrors();
        var highlight = !!shouldHighlight;

        if (stepName === 'property') {
            var propertyValid = true;
            ['token-property-name-input', 'token-address-input', 'token-asset-type', 'token-description-input'].forEach(function(id) {
                if (!getValue(id)) {
                    propertyValid = false;
                    if (highlight) markError(id);
                }
            });
            return propertyValid;
        }

        if (stepName === 'financials') {
            var financialValid = true;
            ['token-capital-raise', 'token-price-input', 'token-yield-input', 'token-dividend-frequency'].forEach(function(id) {
                if (!getValue(id)) {
                    financialValid = false;
                    if (highlight) markError(id);
                }
            });
            return financialValid;
        }

        if (stepName === 'legal') {
            var legalValid = true;
            ['token-regulation-type', 'token-spv-name'].forEach(function(id) {
                if (!getValue(id)) {
                    legalValid = false;
                    if (highlight) markError(id);
                }
            });
            return legalValid;
        }

        return true;
    }

    function continueFromStep(stepName) {
        var currentIndex = STEP_ORDER.indexOf(stepName);
        if (currentIndex === -1) return;

        if (!validateStep(stepName, true)) {
            showToast('error', 'Please complete the required fields in this step before continuing.');
            return;
        }

        markStepDone(stepName, true);
        updateUnlockedStep(Math.min(currentIndex + 1, STEP_ORDER.length - 1));
        openStep(STEP_ORDER[Math.min(currentIndex + 1, STEP_ORDER.length - 1)]);
    }

    function readFiles(fileList, target) {
        var files = Array.from(fileList || []);
        if (!files.length) return;

        var nextFiles = files.map(function(file, index) {
            return {
                id: target + '-' + Date.now() + '-' + index,
                name: file.name,
                size: file.size,
                type: file.type || '',
                category: target === 'legalDocuments'
                    ? LEGAL_DOC_TYPES[Math.min(index, LEGAL_DOC_TYPES.length - 1)]
                    : 'image'
            };
        });

        formState[target] = formState[target].concat(nextFiles);
        renderFiles(target);
    }

    function removeFile(target, fileId) {
        formState[target] = formState[target].filter(function(file) {
            return String(file.id) !== String(fileId);
        });
        renderFiles(target);
    }

    function renderFiles(target) {
        var container = byId(target === 'propertyImages' ? 'token-property-images-list' : 'token-legal-documents-list');
        if (!container) return;

        container.innerHTML = '';
        formState[target].forEach(function(file) {
            var row = document.createElement('div');
            row.className = 'token-file-row';
            row.innerHTML = ''
                + '<div class="token-file-meta">'
                + '<strong>' + escapeHtml(file.name) + '</strong>'
                + '<span>' + escapeHtml(formatFileSize(file.size)) + '</span>'
                + '</div>'
                + '<input type="text" data-file-name="' + escapeHtml(file.id) + '" value="' + escapeHtml(file.name) + '">'
                + '<button type="button" class="token-file-delete" data-delete-file="' + escapeHtml(file.id) + '" data-target="' + escapeHtml(target) + '">Delete</button>';
            container.appendChild(row);
        });
    }

    function updatePreview() {
        byId('preview-property-name').textContent = getValue('token-property-name-input') || 'Untitled Tokenization Opportunity';
        byId('preview-asset-type').textContent = getValue('token-asset-type') || 'Asset Type';
        byId('preview-address').textContent = getValue('token-address-input') || 'Property address';
        byId('preview-token-price').textContent = formatCurrency(getValue('token-price-input') || 0);
        byId('preview-yield').textContent = (getValue('token-yield-input') || '0') + '%';
        byId('preview-capital-raise').textContent = formatCurrency(getValue('token-capital-raise') || 0);
        refreshPublishState();
    }

    function collectFormValues() {
        return {
            propertyName: getValue('token-property-name-input'),
            address: getValue('token-address-input'),
            assetType: getValue('token-asset-type'),
            description: getValue('token-description-input'),
            totalCapitalRaise: getValue('token-capital-raise'),
            tokenPrice: getValue('token-price-input'),
            estimatedAnnualYield: getValue('token-yield-input'),
            dividendFrequency: getValue('token-dividend-frequency'),
            regulationType: getValue('token-regulation-type'),
            spvName: getValue('token-spv-name'),
            smartContractAddress: getValue('token-smart-contract'),
            propertyImages: formState.propertyImages.slice(),
            legalDocuments: formState.legalDocuments.slice()
        };
    }

    function buildSubmissionData(status) {
        var values = collectFormValues();
        return {
            schema: 'TokenizationOpportunity',
            type: 'tokenization',
            status: status,
            creatorUserId: currentUser.id,
            creatorName: currentUser.name || currentUser.initials || '',
            creatorEmail: currentUser.email || '',
            property: {
                propertyName: values.propertyName,
                address: values.address,
                assetType: values.assetType,
                description: values.description
            },
            financials: {
                totalCapitalRaise: Number(values.totalCapitalRaise || 0),
                tokenPrice: Number(values.tokenPrice || 0),
                estimatedAnnualYield: Number(values.estimatedAnnualYield || 0),
                dividendFrequency: values.dividendFrequency
            },
            legalCompliance: {
                regulationType: values.regulationType,
                spvName: values.spvName,
                smartContractAddress: values.smartContractAddress || ''
            },
            mediaDocuments: {
                propertyImages: values.propertyImages,
                legalDocuments: values.legalDocuments
            },
            marketplacePreview: {
                title: values.propertyName,
                yield: values.estimatedAnnualYield,
                tokenPrice: values.tokenPrice,
                address: values.address
            }
        };
    }

    function saveDraft() {
        var payload = {
            id: isDraftEdit && editId ? editId : ('tokenization-draft-' + Date.now()),
            savedAt: new Date().toISOString(),
            formValues: collectFormValues(),
            submissionData: buildSubmissionData('draft')
        };
        localStorage.setItem(app.KEYS.tokenizationDraft, JSON.stringify(payload));
        showToast('success', 'Draft saved locally.');
    }

    function publishSubmission() {
        if (!isPublishReady()) {
            showToast('error', 'Complete every required field before publishing to the marketplace.');
            return;
        }

        var existing = getPublishedEntries();
        var nextEntryId = editingPublishedEntry && editingPublishedEntry.id
            ? editingPublishedEntry.id
            : (editId && !isDraftEdit ? editId : ('tokenization-' + Date.now()));
        var entry = {
            id: nextEntryId,
            publishedAt: editingPublishedEntry && editingPublishedEntry.publishedAt ? editingPublishedEntry.publishedAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            submissionData: buildSubmissionData('published')
        };
        existing = existing.filter(function(item) {
            return String(item.id) !== String(entry.id);
        });
        existing.unshift(entry);
        app.writeJson(app.KEYS.tokenizationSubmissions, existing);
        localStorage.removeItem(app.KEYS.tokenizationDraft);
        showToast('success', 'Published to marketplace.');

        window.setTimeout(function() {
            window.location.href = 'tokenization.html?id=' + encodeURIComponent(entry.id);
        }, 550);
    }

    function hydrateValues(values) {
        if (!values) return;
        setValue('token-property-name-input', values.propertyName);
        setValue('token-address-input', values.address);
        setValue('token-asset-type', values.assetType);
        setValue('token-description-input', values.description);
        setValue('token-capital-raise', values.totalCapitalRaise);
        setValue('token-price-input', values.tokenPrice);
        setValue('token-yield-input', values.estimatedAnnualYield);
        setValue('token-dividend-frequency', values.dividendFrequency);
        setValue('token-regulation-type', values.regulationType);
        setValue('token-spv-name', values.spvName);
        setValue('token-smart-contract', values.smartContractAddress);

        formState.propertyImages = Array.isArray(values.propertyImages) ? values.propertyImages.slice() : [];
        formState.legalDocuments = Array.isArray(values.legalDocuments) ? values.legalDocuments.slice() : [];

        renderFiles('propertyImages');
        renderFiles('legalDocuments');

        unlockedStepIndex = STEP_ORDER.length - 1;
        STEP_ORDER.forEach(function(stepName) {
            markStepDone(stepName, validateStep(stepName, false));
        });
        updatePreview();
    }

    function hydrateDraft() {
        var draft = getDraftRecord();
        if (!draft) return;
        hydrateValues(draft.formValues);
    }

    function hydrateEditRecord() {
        if (isDraftEdit) {
            var draft = getDraftRecord();
            if (!draft) return;
            hydrateValues(draft.formValues);
            return;
        }

        if (!editId) return;
        editingPublishedEntry = getPublishedEntries().find(function(entry) {
            return String(entry.id) === String(editId)
                && entry.submissionData
                && String(entry.submissionData.creatorUserId || '') === String(currentUser.id);
        }) || null;
        if (!editingPublishedEntry || !editingPublishedEntry.submissionData) return;

        var submission = editingPublishedEntry.submissionData;
        hydrateValues({
            propertyName: submission.property && submission.property.propertyName,
            address: submission.property && submission.property.address,
            assetType: submission.property && submission.property.assetType,
            description: submission.property && submission.property.description,
            totalCapitalRaise: submission.financials && submission.financials.totalCapitalRaise,
            tokenPrice: submission.financials && submission.financials.tokenPrice,
            estimatedAnnualYield: submission.financials && submission.financials.estimatedAnnualYield,
            dividendFrequency: submission.financials && submission.financials.dividendFrequency,
            regulationType: submission.legalCompliance && submission.legalCompliance.regulationType,
            spvName: submission.legalCompliance && submission.legalCompliance.spvName,
            smartContractAddress: submission.legalCompliance && submission.legalCompliance.smartContractAddress,
            propertyImages: submission.mediaDocuments && submission.mediaDocuments.propertyImages,
            legalDocuments: submission.mediaDocuments && submission.mediaDocuments.legalDocuments
        });
    }

    progressButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            openStep(button.getAttribute('data-target-step'));
        });
    });

    sectionToggles.forEach(function(toggle) {
        toggle.addEventListener('click', function() {
            var section = toggle.closest('.token-section');
            if (!section) return;
            openStep(section.getAttribute('data-step'));
        });
    });

    document.querySelectorAll('[data-continue-step]').forEach(function(button) {
        button.addEventListener('click', function() {
            continueFromStep(button.getAttribute('data-continue-step'));
        });
    });

    document.querySelectorAll('[data-open-step]').forEach(function(button) {
        button.addEventListener('click', function() {
            openStep(button.getAttribute('data-open-step'));
        });
    });

    document.querySelectorAll('[data-save-draft-step]').forEach(function(button) {
        button.addEventListener('click', saveDraft);
    });

    document.querySelectorAll('[data-drop-target]').forEach(function(zone) {
        var target = zone.getAttribute('data-drop-target');
        zone.addEventListener('dragover', function(event) {
            event.preventDefault();
            zone.classList.add('dragover');
        });
        zone.addEventListener('dragleave', function() {
            zone.classList.remove('dragover');
        });
        zone.addEventListener('drop', function(event) {
            event.preventDefault();
            zone.classList.remove('dragover');
            readFiles(event.dataTransfer ? event.dataTransfer.files : [], target);
        });
    });

    [
        'token-property-name-input',
        'token-address-input',
        'token-asset-type',
        'token-description-input',
        'token-capital-raise',
        'token-price-input',
        'token-yield-input',
        'token-dividend-frequency',
        'token-regulation-type',
        'token-spv-name',
        'token-smart-contract'
    ].forEach(function(id) {
        var element = byId(id);
        if (!element) return;
        element.addEventListener('input', updatePreview);
        element.addEventListener('change', updatePreview);
    });

    byId('token-property-images').addEventListener('change', function(event) {
        readFiles(event.target.files, 'propertyImages');
        event.target.value = '';
    });

    byId('token-legal-documents').addEventListener('change', function(event) {
        readFiles(event.target.files, 'legalDocuments');
        event.target.value = '';
    });

    document.addEventListener('input', function(event) {
        var input = event.target.closest('[data-file-name]');
        if (!input) return;
        var fileId = input.getAttribute('data-file-name');
        ['propertyImages', 'legalDocuments'].forEach(function(target) {
            formState[target] = formState[target].map(function(file) {
                if (String(file.id) === String(fileId)) file.name = input.value;
                return file;
            });
        });
    });

    document.addEventListener('click', function(event) {
        var button = event.target.closest('[data-delete-file]');
        if (!button) return;
        removeFile(button.getAttribute('data-target'), button.getAttribute('data-delete-file'));
    });

    byId('token-save-draft').addEventListener('click', saveDraft);
    publishButton.addEventListener('click', publishSubmission);

    if (editId || isDraftEdit) hydrateEditRecord();
    else hydrateDraft();
    updatePreview();
    openStep('property');
});
