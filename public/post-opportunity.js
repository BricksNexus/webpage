document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    var app = window.BricksNexusApp;
    var currentUser = app.getCurrentUser();
    if (!currentUser) return;

    var PROPERTY_SCOPE_MAP = {
        land: [
            'New Construction (Residential)',
            'New Construction (Commercial)',
            'Sub-division',
            'Land Clearing',
            'Rezoning'
        ],
        house: [
            'Full Renovation',
            'Kitchen/Bath Remodel',
            'Structural Repair',
            'Roof Replacement',
            'Interior Design'
        ],
        apartment: [
            'Full Renovation',
            'Kitchen/Bath Remodel',
            'Structural Repair',
            'Roof Replacement',
            'Interior Design'
        ],
        building: [
            'Facade Restoration',
            'HVAC System Overhaul',
            'Structural Reinforcement',
            'Fire Safety'
        ],
        office: [
            'Open Plan Conversion',
            'IT Infrastructure',
            'Lighting/Electrical Upgrade'
        ]
    };

    var TEAM_OPTIONS = [
        'Architect',
        'Civil Engineer',
        'General Contractor',
        'Electrician',
        'Plumber',
        'Project Manager',
        'Surveyor',
        'Real Estate Lawyer'
    ];

    var DOCUMENT_TYPES = ['Deed', 'Permit', 'Blueprint', 'Site Photo', 'Contract', 'Other'];
    var CHRONOGRAM_STATUSES = ['Pending', 'In Progress', 'Done'];
    var STEP_ORDER = ['type', 'details', 'needs', 'chronogram', 'financing', 'documents'];

    var query = new URLSearchParams(window.location.search);
    var editId = query.get('edit');
    var isDraftEdit = query.get('draft') === '1';
    var editingStorageKey = isDraftEdit ? app.KEYS.opportunityDrafts : app.KEYS.opportunities;
    var editingRecord = null;

    var formState = {
        type: '',
        projectScopes: [],
        selectedProfessions: [],
        chronogramRows: [],
        documents: [],
        imageDataUrl: ''
    };

    var progressButtons = Array.from(document.querySelectorAll('.builder-progress-step'));
    var sections = Array.from(document.querySelectorAll('.builder-section'));
    var stepSectionToggles = Array.from(document.querySelectorAll('.builder-section-toggle'));
    var unlockedStepIndex = 0;
    var activeStepIndex = 0;

    function getInput(id) {
        return document.getElementById(id);
    }

    function getValue(id) {
        var element = getInput(id);
        return element ? String(element.value || '').trim() : '';
    }

    function setValue(id, value) {
        var element = getInput(id);
        if (element) element.value = value || '';
    }

    function escapeHtml(value) {
        var div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    }

    function clearErrors() {
        document.querySelectorAll('.builder-error').forEach(function(element) {
            element.classList.remove('builder-error');
        });
    }

    function markError(id) {
        var element = getInput(id);
        if (element) element.classList.add('builder-error');
    }

    function markContainerError(id) {
        var element = getInput(id);
        if (element) element.classList.add('builder-error');
    }

    function setSelectedType(nextType) {
        formState.type = nextType || '';
        document.querySelectorAll('.builder-type-card').forEach(function(card) {
            var radio = card.querySelector('input[type="radio"]');
            var isSelected = !!radio && radio.value === formState.type;
            if (radio) radio.checked = isSelected;
            card.classList.toggle('selected', isSelected);
        });
        toggleTypeVisibility();
        renderPropertyChecklist();
        renderTeamChecklist();
        updateTeamWidget();
    }

    function toggleTypeVisibility() {
        var isProject = formState.type === 'project';
        document.querySelectorAll('.project-only').forEach(function(element) {
            element.classList.toggle('hidden', !isProject);
        });
        document.querySelectorAll('.simple-only').forEach(function(element) {
            element.classList.toggle('hidden', isProject);
        });
    }

    function openStep(stepName) {
        var nextIndex = STEP_ORDER.indexOf(stepName);
        if (nextIndex === -1 || nextIndex > unlockedStepIndex) return;

        activeStepIndex = nextIndex;
        sections.forEach(function(section, index) {
            section.classList.toggle('active', index === nextIndex);
        });
        progressButtons.forEach(function(button, index) {
            button.classList.toggle('active', index === nextIndex);
        });
        refreshPublishState();
    }

    function refreshPublishState() {
        var publishButton = getInput('opp-submit');
        if (!publishButton) return;
        publishButton.disabled = STEP_ORDER[activeStepIndex] !== 'documents';
    }

    function markStepDone(stepName, isDone) {
        var section = document.querySelector('.builder-section[data-step="' + stepName + '"]');
        var button = document.querySelector('.builder-progress-step[data-target-step="' + stepName + '"]');
        if (section) section.classList.toggle('done', !!isDone);
        if (button) button.classList.toggle('done', !!isDone);
    }

    function updateUnlockedStep(index) {
        unlockedStepIndex = Math.max(unlockedStepIndex, index);
    }

    function renderPropertyChecklist() {
        var container = getInput('builder-property-checklist');
        if (!container) return;

        var propertyType = getValue('opp-property-type');
        var options = PROPERTY_SCOPE_MAP[propertyType] || [];
        container.innerHTML = '';

        options.forEach(function(label) {
            var item = document.createElement('label');
            var isSelected = formState.projectScopes.indexOf(label) >= 0;
            item.className = 'builder-check-item' + (isSelected ? ' selected' : '');
            item.innerHTML = ''
                + '<input type="checkbox" value="' + escapeHtml(label) + '"' + (isSelected ? ' checked' : '') + '>'
                + '<strong>' + escapeHtml(label) + '</strong>'
                + '<span>Scope tag for this property type.</span>';
            container.appendChild(item);
        });
    }

    function renderTeamChecklist() {
        var container = getInput('builder-team-checklist');
        if (!container) return;

        container.innerHTML = '';
        TEAM_OPTIONS.forEach(function(label) {
            var isSelected = formState.selectedProfessions.indexOf(label) >= 0;
            var item = document.createElement('label');
            item.className = 'builder-check-item' + (isSelected ? ' selected' : '');
            item.innerHTML = ''
                + '<input type="checkbox" value="' + escapeHtml(label) + '"' + (isSelected ? ' checked' : '') + '>'
                + '<strong>' + escapeHtml(label) + '</strong>'
                + '<span>Add this profession to My Team.</span>';
            container.appendChild(item);
        });
    }

    function updateTeamWidget() {
        var list = getInput('builder-team-list');
        var empty = getInput('builder-team-empty');
        if (!list || !empty) return;

        list.innerHTML = '';
        var entries = formState.type === 'project'
            ? formState.selectedProfessions.slice()
            : (getValue('opp-simple-need') ? [getValue('opp-simple-need')] : []);

        if (!entries.length) {
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        entries.forEach(function(entry) {
            var tag = document.createElement('span');
            tag.className = 'builder-team-tag';
            tag.textContent = entry;
            list.appendChild(tag);
        });
    }

    function createChronogramRow(row) {
        return {
            id: row && row.id ? String(row.id) : String(Date.now() + Math.random()),
            task_name: row && row.task_name ? row.task_name : '',
            start_date: row && row.start_date ? row.start_date : '',
            end_date: row && row.end_date ? row.end_date : '',
            status: row && row.status ? row.status : 'Pending'
        };
    }

    function addChronogramRow(row) {
        formState.chronogramRows.push(createChronogramRow(row));
        renderChronogramRows();
    }

    function renderChronogramRows() {
        var tbody = getInput('chronogram-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        formState.chronogramRows.forEach(function(row) {
            var tr = document.createElement('tr');
            tr.innerHTML = ''
                + '<td><input type="text" data-chrono-field="task_name" data-row-id="' + escapeHtml(row.id) + '" value="' + escapeHtml(row.task_name) + '" placeholder="Task name"></td>'
                + '<td><input type="date" data-chrono-field="start_date" data-row-id="' + escapeHtml(row.id) + '" value="' + escapeHtml(row.start_date) + '"></td>'
                + '<td><input type="date" data-chrono-field="end_date" data-row-id="' + escapeHtml(row.id) + '" value="' + escapeHtml(row.end_date) + '"></td>'
                + '<td><select data-chrono-field="status" data-row-id="' + escapeHtml(row.id) + '">'
                + CHRONOGRAM_STATUSES.map(function(status) {
                    return '<option value="' + escapeHtml(status) + '"' + (row.status === status ? ' selected' : '') + '>' + escapeHtml(status) + '</option>';
                }).join('')
                + '</select></td>'
                + '<td><button type="button" class="builder-inline-btn" data-remove-row="' + escapeHtml(row.id) + '">Remove</button></td>';
            tbody.appendChild(tr);
        });
    }

    function renderDocuments() {
        var container = getInput('builder-documents-list');
        if (!container) return;

        container.innerHTML = '';
        formState.documents.forEach(function(doc) {
            var item = document.createElement('div');
            item.className = 'builder-document-item';
            item.innerHTML = ''
                + '<div class="builder-document-meta">'
                + '<input type="text" class="builder-document-input" data-document-field="file_name" data-document-id="' + escapeHtml(doc.id) + '" value="' + escapeHtml(doc.file_name) + '" placeholder="File name">'
                + '<div class="builder-document-size">' + Math.max(1, Math.round((doc.size || 0) / 1024)) + ' KB</div>'
                + '</div>'
                + '<div class="builder-document-controls">'
                + '<select data-document-field="document_type" data-document-id="' + escapeHtml(doc.id) + '">'
                + '<option value="">Document Type</option>'
                + DOCUMENT_TYPES.map(function(type) {
                    var value = type.toLowerCase();
                    return '<option value="' + escapeHtml(value) + '"' + (doc.document_type === value ? ' selected' : '') + '>' + escapeHtml(type) + '</option>';
                }).join('')
                + '</select>'
                + '<button type="button" class="builder-document-delete" data-delete-document="' + escapeHtml(doc.id) + '">Delete</button>'
                + '</div>';
            container.appendChild(item);
        });
    }

    function readFiles(files) {
        var list = Array.from(files || []);
        if (!list.length) return Promise.resolve();

        var nextReaders = list.map(function(file, index) {
            return new Promise(function(resolve) {
                var item = {
                    id: String(Date.now() + index + Math.random()),
                    file_name: file.name.replace(/\.[^/.]+$/, '') || file.name,
                    original_name: file.name,
                    size: file.size,
                    mime_type: file.type,
                    document_type: '',
                    data_url: ''
                };

                if (file.type && file.type.indexOf('image/') === 0) {
                    var reader = new FileReader();
                    reader.onload = function(event) {
                        item.data_url = event.target && event.target.result ? event.target.result : '';
                        resolve(item);
                    };
                    reader.onerror = function() {
                        resolve(item);
                    };
                    reader.readAsDataURL(file);
                } else {
                    resolve(item);
                }
            });
        });

        return Promise.all(nextReaders).then(function(results) {
            formState.documents = formState.documents.concat(results);
            var firstImage = formState.documents.find(function(item) {
                return item.data_url;
            });
            if (firstImage) formState.imageDataUrl = firstImage.data_url;
            renderDocuments();
        });
    }

    function validateStep(stepName, highlight) {
        var shouldHighlight = !!highlight;
        clearErrors();

        if (stepName === 'type') {
            return !!formState.type;
        }

        if (stepName === 'details') {
            var valid = true;
            if (!getValue('opp-title')) {
                valid = false;
                if (shouldHighlight) markError('opp-title');
            }
            if (!getValue('opp-summary')) {
                valid = false;
                if (shouldHighlight) markError('opp-summary');
            }
            if (!getValue('opp-city')) {
                valid = false;
                if (shouldHighlight) markError('opp-city');
            }
            if (!getValue('opp-budget')) {
                valid = false;
                if (shouldHighlight) markError('opp-budget');
            }
            if (formState.type === 'project') {
                if (!getValue('opp-property-type')) {
                    valid = false;
                    if (shouldHighlight) markError('opp-property-type');
                }
                if (!formState.projectScopes.length) {
                    valid = false;
                    if (shouldHighlight) markContainerError('builder-property-checklist');
                }
            }
            return valid;
        }

        if (stepName === 'needs') {
            if (formState.type === 'project') {
                if (!formState.selectedProfessions.length && shouldHighlight) {
                    markContainerError('builder-team-checklist');
                }
                return formState.selectedProfessions.length > 0;
            }
            var simpleValid = !!getValue('opp-simple-need') || !!getValue('opp-terms');
            if (!simpleValid && shouldHighlight) {
                markError('opp-simple-need');
                markError('opp-terms');
            }
            return simpleValid;
        }

        if (stepName === 'chronogram') {
            if (formState.type !== 'project') return true;
            return formState.chronogramRows.length > 0 && formState.chronogramRows.every(function(row) {
                return row.task_name && row.start_date && row.end_date && row.status;
            });
        }

        if (stepName === 'financing') {
            if (formState.type !== 'project') return true;
            var financeValid = !!getValue('opp-financing-model');
            if (!financeValid && shouldHighlight) markError('opp-financing-model');
            return financeValid;
        }

        if (stepName === 'documents') {
            return formState.documents.every(function(item) {
                return !!item.file_name && !!item.document_type;
            });
        }

        return true;
    }

    function continueFromStep(stepName) {
        var currentIndex = STEP_ORDER.indexOf(stepName);
        if (currentIndex === -1) return;
        if (!validateStep(stepName, true)) {
            alert('Please complete the required fields in this step before continuing.');
            return;
        }

        markStepDone(stepName, true);
        updateUnlockedStep(Math.min(currentIndex + 1, STEP_ORDER.length - 1));
        openStep(STEP_ORDER[Math.min(currentIndex + 1, STEP_ORDER.length - 1)]);
    }

    function collectPayload(status) {
        return {
            id: editingRecord ? editingRecord.id : Date.now(),
            title: getValue('opp-title'),
            summary: getValue('opp-summary'),
            city: getValue('opp-city'),
            region: getValue('opp-region'),
            budget: getValue('opp-budget'),
            terms: getValue('opp-terms'),
            equity: getValue('opp-equity'),
            roi: getValue('opp-roi'),
            address: getValue('opp-address'),
            estimatedTimeline: getValue('opp-estimated-timeline'),
            opportunityKind: formState.type,
            propertyType: getValue('opp-property-type'),
            propertyChecklist: formState.projectScopes.slice(),
            myTeam: formState.selectedProfessions.slice(),
            simpleNeed: getValue('opp-simple-need'),
            financingModel: getValue('opp-financing-model'),
            capitalGap: getValue('opp-capital-gap'),
            chronogram: formState.chronogramRows.map(function(row) {
                return {
                    id: row.id,
                    task_name: row.task_name,
                    start_date: row.start_date,
                    end_date: row.end_date,
                    status: row.status
                };
            }),
            documents: formState.documents.map(function(doc) {
                return {
                    id: doc.id,
                    file_name: doc.file_name,
                    original_name: doc.original_name,
                    document_type: doc.document_type,
                    mime_type: doc.mime_type,
                    size: doc.size,
                    data_url: doc.data_url
                };
            }),
            imageDataUrl: formState.imageDataUrl || (editingRecord && editingRecord.imageDataUrl) || '',
            createdAt: editingRecord && editingRecord.createdAt ? editingRecord.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: status,
            creatorUserId: currentUser.id,
            creatorId: currentUser.initials,
            creatorName: currentUser.name,
            creatorEmail: currentUser.email
        };
    }

    function upsertToStorage(targetKey, payload) {
        var list = app.readJson(targetKey, []);
        var index = list.findIndex(function(item) {
            return String(item.id) === String(payload.id);
        });
        if (index >= 0) list[index] = payload;
        else list.unshift(payload);
        app.writeJson(targetKey, list);
    }

    function removeFromStorage(targetKey, itemId) {
        var list = app.readJson(targetKey, []);
        app.writeJson(targetKey, list.filter(function(item) {
            return String(item.id) !== String(itemId);
        }));
    }

    function saveOpportunity(status, stayOnPage) {
        if (status === 'published') {
            var allValid = STEP_ORDER.every(function(stepName) {
                return validateStep(stepName, stepName === STEP_ORDER[activeStepIndex]);
            });
            if (!allValid) {
                alert('Please complete the required fields before publishing this opportunity.');
                return;
            }
        }

        var payload = collectPayload(status);
        var targetKey = status === 'draft' ? app.KEYS.opportunityDrafts : app.KEYS.opportunities;

        if (editingRecord) {
            removeFromStorage(editingStorageKey, editingRecord.id);
        }

        upsertToStorage(targetKey, payload);
        editingRecord = payload;
        editingStorageKey = targetKey;

        if (stayOnPage) {
            alert('Draft saved locally.');
            return;
        }

        window.location.href = 'dashboard.html';
    }

    function loadEditingRecord() {
        if (!editId) return;
        var list = app.readJson(editingStorageKey, []);
        editingRecord = list.find(function(item) {
            return String(item.id) === String(editId);
        }) || null;
        if (!editingRecord) return;

        setValue('opp-title', editingRecord.title);
        setValue('opp-summary', editingRecord.summary);
        setValue('opp-city', editingRecord.city);
        setValue('opp-region', editingRecord.region);
        setValue('opp-budget', editingRecord.budget);
        setValue('opp-terms', editingRecord.terms);
        setValue('opp-equity', editingRecord.equity);
        setValue('opp-roi', editingRecord.roi);
        setValue('opp-address', editingRecord.address);
        setValue('opp-property-type', editingRecord.propertyType);
        setValue('opp-simple-need', editingRecord.simpleNeed);
        setValue('opp-financing-model', editingRecord.financingModel);
        setValue('opp-capital-gap', editingRecord.capitalGap);
        setValue('opp-estimated-timeline', editingRecord.estimatedTimeline || '');

        formState.type = editingRecord.opportunityKind || 'project';
        formState.projectScopes = Array.isArray(editingRecord.propertyChecklist) ? editingRecord.propertyChecklist.slice() : [];
        formState.selectedProfessions = Array.isArray(editingRecord.myTeam)
            ? editingRecord.myTeam.slice()
            : (Array.isArray(editingRecord.serviceChecklist) ? editingRecord.serviceChecklist.slice() : []);
        formState.chronogramRows = Array.isArray(editingRecord.chronogram)
            ? editingRecord.chronogram.map(createChronogramRow)
            : [];
        formState.documents = Array.isArray(editingRecord.documents)
            ? editingRecord.documents.map(function(doc) {
                return {
                    id: String(doc.id || Date.now() + Math.random()),
                    file_name: doc.file_name || doc.name || '',
                    original_name: doc.original_name || doc.file_name || doc.name || '',
                    document_type: doc.document_type || doc.docType || '',
                    mime_type: doc.mime_type || doc.mimeType || '',
                    size: doc.size || 0,
                    data_url: doc.data_url || doc.dataUrl || ''
                };
            })
            : [];
        formState.imageDataUrl = editingRecord.imageDataUrl || '';

        setSelectedType(formState.type);
        renderPropertyChecklist();
        renderTeamChecklist();
        renderChronogramRows();
        renderDocuments();
        updateTeamWidget();
        unlockedStepIndex = STEP_ORDER.length - 1;
        STEP_ORDER.forEach(function(stepName) {
            markStepDone(stepName, validateStep(stepName, false));
        });
    }

    document.querySelectorAll('.builder-type-card').forEach(function(card) {
        card.addEventListener('click', function() {
            var radio = card.querySelector('input[type="radio"]');
            setSelectedType(radio ? radio.value : '');
        });
    });

    progressButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            openStep(button.getAttribute('data-target-step'));
        });
    });

    stepSectionToggles.forEach(function(toggle) {
        toggle.addEventListener('click', function() {
            var section = toggle.closest('.builder-section');
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
        button.addEventListener('click', function() {
            saveOpportunity('draft', true);
        });
    });

    getInput('opp-property-type').addEventListener('change', function() {
        formState.projectScopes = [];
        renderPropertyChecklist();
    });

    getInput('builder-property-checklist').addEventListener('change', function(event) {
        var checkbox = event.target.closest('input[type="checkbox"]');
        if (!checkbox) return;
        if (checkbox.checked) {
            if (formState.projectScopes.indexOf(checkbox.value) === -1) {
                formState.projectScopes.push(checkbox.value);
            }
        } else {
            formState.projectScopes = formState.projectScopes.filter(function(item) {
                return item !== checkbox.value;
            });
        }
        checkbox.closest('.builder-check-item').classList.toggle('selected', checkbox.checked);
    });

    getInput('builder-team-checklist').addEventListener('change', function(event) {
        var checkbox = event.target.closest('input[type="checkbox"]');
        if (!checkbox) return;
        if (checkbox.checked) {
            if (formState.selectedProfessions.indexOf(checkbox.value) === -1) {
                formState.selectedProfessions.push(checkbox.value);
            }
        } else {
            formState.selectedProfessions = formState.selectedProfessions.filter(function(item) {
                return item !== checkbox.value;
            });
        }
        checkbox.closest('.builder-check-item').classList.toggle('selected', checkbox.checked);
        updateTeamWidget();
    });

    getInput('opp-simple-need').addEventListener('input', updateTeamWidget);

    getInput('chronogram-add-row').addEventListener('click', function() {
        addChronogramRow();
    });

    getInput('chronogram-body').addEventListener('input', function(event) {
        var target = event.target;
        var rowId = target.getAttribute('data-row-id');
        var field = target.getAttribute('data-chrono-field');
        if (!rowId || !field) return;

        formState.chronogramRows = formState.chronogramRows.map(function(row) {
            if (String(row.id) === String(rowId)) {
                row[field] = target.value;
            }
            return row;
        });
    });

    getInput('chronogram-body').addEventListener('click', function(event) {
        var button = event.target.closest('[data-remove-row]');
        if (!button) return;
        var rowId = button.getAttribute('data-remove-row');
        formState.chronogramRows = formState.chronogramRows.filter(function(row) {
            return String(row.id) !== String(rowId);
        });
        renderChronogramRows();
    });

    getInput('opp-attachments').addEventListener('change', function(event) {
        readFiles(event.target.files).then(function() {
            event.target.value = '';
        });
    });

    getInput('builder-documents-list').addEventListener('input', function(event) {
        var input = event.target.closest('[data-document-field="file_name"]');
        if (!input) return;
        var documentId = input.getAttribute('data-document-id');
        formState.documents = formState.documents.map(function(doc) {
            if (String(doc.id) === String(documentId)) {
                doc.file_name = input.value;
            }
            return doc;
        });
    });

    getInput('builder-documents-list').addEventListener('change', function(event) {
        var select = event.target.closest('[data-document-field="document_type"]');
        if (!select) return;
        var documentId = select.getAttribute('data-document-id');
        formState.documents = formState.documents.map(function(doc) {
            if (String(doc.id) === String(documentId)) {
                doc.document_type = select.value;
            }
            return doc;
        });
    });

    getInput('builder-documents-list').addEventListener('click', function(event) {
        var button = event.target.closest('[data-delete-document]');
        if (!button) return;
        var documentId = button.getAttribute('data-delete-document');
        formState.documents = formState.documents.filter(function(doc) {
            return String(doc.id) !== String(documentId);
        });
        var firstImage = formState.documents.find(function(item) {
            return item.data_url;
        });
        formState.imageDataUrl = firstImage ? firstImage.data_url : '';
        renderDocuments();
    });

    getInput('opp-save-draft').addEventListener('click', function() {
        saveOpportunity('draft', true);
    });

    getInput('opp-submit').addEventListener('click', function() {
        saveOpportunity('published', false);
    });

    if (!editId) {
        addChronogramRow();
    }

    loadEditingRecord();
    if (!formState.type) {
        toggleTypeVisibility();
        renderPropertyChecklist();
        renderTeamChecklist();
    }
    renderChronogramRows();
    renderDocuments();
    updateTeamWidget();

    // ------------------------------
    // Explore Opportunities (chat panel) — simple address → AI conversation
    // ------------------------------
    (function initOpportunityExplorerChatbot() {
        var chatLauncher = getInput('opp-chat-launcher');
        var chatPrompt = getInput('opp-chat-help-prompt');
        var chatPanel = getInput('opp-chat-panel');
        var chatClose = getInput('opp-chat-close-btn');
        var chatAddressInput = getInput('opp-chat-address');
        var startBtn = getInput('opp-chat-start-btn');
        var sendBtn = getInput('opp-chat-send-btn');
        var messageInput = getInput('opp-chat-message-input');
        var applyBtn = getInput('opp-chat-apply-btn');
        var reportBtn = getInput('opp-chat-report-btn');
        var chatLog = getInput('opp-chat-log');
        var optionsEl = getInput('opp-chat-options');

        if (
            !chatLauncher || !chatPrompt || !chatPanel || !chatClose ||
            !chatAddressInput || !startBtn || !sendBtn || !messageInput ||
            !applyBtn || !chatLog
        ) return;

        var CHAT = {
            isOpen: false,
            hasGreeted: false,
            addressText: '',
            propertyIntel: null,
            feasibilitySummary: '',
            cardDraft: null,
            savedDraftId: null,
            savedDraftCreatedAt: null,
            isDemoMode: false,
            /** @type {{ role: string, content: string }[]} */
            thread: [],
            sessionActive: false,
            loading: false,
            exploreKey: null,
            exploreFocusText: '',
            reportId: null
        };

        function buildClientFallbackCardDraft() {
            var intel = CHAT.propertyIntel || buildDemoPropertyIntel(CHAT.addressText);
            var city = intel.city || parseAddressParts(CHAT.addressText).city || 'your area';
            var focus = CHAT.exploreFocusText || '';
            return {
                opportunityTitle: focus
                    ? ('Explore units — ' + city)
                    : ('Explore adding units — ' + city),
                jobDescription: String(CHAT.feasibilitySummary || '').slice(0, 500) ||
                    'Opportunity explored via chat — review and edit details before publishing.',
                workersNeeded: ['Architect', 'General Contractor', 'Real Estate Lawyer', 'Project Manager'],
                estimatedCost: '$75,000 – $350,000+ (typical range — verify with local quotes)',
                estimatedTimeline: '6–18 months (design, permits, and construction)',
                projectScopes: focus ? [focus.split('.')[0].slice(0, 80)] : ['ADU / accessory unit exploration']
            };
        }

        function resolveCardDraft(data) {
            return (data && data.cardDraft) ? data.cardDraft : buildClientFallbackCardDraft();
        }

        function mapWorkersToTeam(workersNeeded) {
            var raw = Array.isArray(workersNeeded) ? workersNeeded : [];
            var known = TEAM_OPTIONS.slice();
            var mapped = [];
            raw.forEach(function(label) {
                var text = String(label || '').trim();
                if (!text) return;
                var match = known.find(function(k) {
                    return k.toLowerCase() === text.toLowerCase();
                });
                if (match) {
                    if (mapped.indexOf(match) < 0) mapped.push(match);
                    return;
                }
                var partial = known.find(function(k) {
                    return text.toLowerCase().indexOf(k.toLowerCase()) >= 0 ||
                        k.toLowerCase().indexOf(text.toLowerCase()) >= 0;
                });
                var value = partial || text;
                if (mapped.indexOf(value) < 0) mapped.push(value);
            });
            return mapped.length ? mapped : ['Architect', 'General Contractor', 'Project Manager'];
        }

        function formatSimpleNeed(cardDraft) {
            var workers = mapWorkersToTeam(cardDraft && cardDraft.workersNeeded);
            var lines = workers.map(function(w) { return '• ' + w; });
            if (cardDraft && cardDraft.projectScopes && cardDraft.projectScopes.length) {
                lines.push('');
                lines.push('Scope: ' + cardDraft.projectScopes.join(', '));
            }
            return lines.join('\n');
        }

        function buildAnalysisSummaryText(intel) {
            var parts = [];
            if (intel.demo) {
                parts.push('### From Explore Opportunities (address preview)');
            } else {
                parts.push('### From Explore Opportunities (open data hints)');
                parts.push('Zoning hint: ' + (intel.zoningDistrict || '—'));
                parts.push('Lot area: ' + (intel.lotAreaSqFt != null ? intel.lotAreaSqFt + ' sq ft' : '—'));
                parts.push('Use/occupancy hints: ' + (intel.useAndOccupancy || '—'));
            }
            if (CHAT.feasibilitySummary) {
                parts.push('');
                parts.push('### Conversation summary');
                parts.push(CHAT.feasibilitySummary);
            }
            return parts.join('\n');
        }

        function buildAnalyzedOpportunityPayload(cardDraft) {
            var intel = CHAT.propertyIntel || buildDemoPropertyIntel(CHAT.addressText);
            var draft = cardDraft || CHAT.cardDraft || {};
            var parts = parseAddressParts(CHAT.addressText);
            var id = CHAT.savedDraftId || Date.now();
            var workers = mapWorkersToTeam(draft.workersNeeded);
            var createdAt = CHAT.savedDraftCreatedAt || new Date().toISOString();

            return {
                id: id,
                title: draft.opportunityTitle || ('Explore more units — ' + (intel.city || parts.city || 'your property')),
                summary: draft.jobDescription || CHAT.feasibilitySummary || 'Opportunity explored via chat.',
                city: intel.city || parts.city || '',
                region: intel.region || parts.region || '',
                budget: draft.estimatedCost || 'TBD — verify with local quotes',
                estimatedTimeline: draft.estimatedTimeline || 'TBD — depends on permits and scope',
                terms: 'Deliverables:\n- Plain-language summary of options and constraints\n- What to verify with the city/planning office\n- Suggested next steps with a designer or permit professional',
                equity: '',
                roi: '',
                address: intel.inputAddress || (intel.geocode && intel.geocode.normalized) || CHAT.addressText,
                opportunityKind: 'exploring',
                propertyType: inferAssetTypeKey(CHAT.addressText),
                propertyChecklist: Array.isArray(draft.projectScopes) ? draft.projectScopes.slice() : [],
                myTeam: workers,
                simpleNeed: formatSimpleNeed(draft),
                financingModel: '',
                capitalGap: '',
                chronogram: [],
                documents: [],
                imageDataUrl: '',
                createdAt: createdAt,
                updatedAt: new Date().toISOString(),
                status: 'draft',
                fromChatAnalysis: true,
                analysisSnapshot: {
                    analyzedAt: new Date().toISOString(),
                    address: CHAT.addressText,
                    exploreKey: CHAT.exploreKey,
                    exploreFocusText: CHAT.exploreFocusText,
                    feasibilitySummary: CHAT.feasibilitySummary,
                    cardDraft: draft,
                    isDemoMode: CHAT.isDemoMode
                },
                creatorUserId: currentUser.id,
                creatorId: currentUser.initials,
                creatorName: currentUser.name,
                creatorEmail: currentUser.email
            };
        }

        function saveAnalyzedOpportunityToProfile(cardDraft) {
            if (!CHAT.addressText || !CHAT.feasibilitySummary) return null;
            if (cardDraft) CHAT.cardDraft = cardDraft;

            var payload = buildAnalyzedOpportunityPayload(CHAT.cardDraft);
            if (!CHAT.savedDraftId) {
                CHAT.savedDraftId = payload.id;
                CHAT.savedDraftCreatedAt = payload.createdAt;
            } else {
                payload.id = CHAT.savedDraftId;
                payload.createdAt = CHAT.savedDraftCreatedAt || payload.createdAt;
            }

            var list = app.readJson(app.KEYS.opportunityDrafts, []);
            var index = list.findIndex(function(item) {
                return String(item.id) === String(payload.id);
            });
            if (index >= 0) list[index] = payload;
            else list.unshift(payload);
            app.writeJson(app.KEYS.opportunityDrafts, list);

            CHAT.savedDraftId = payload.id;
            return payload;
        }

        function syncOptionButtons() {
            if (!optionsEl) return;
            var buttons = optionsEl.querySelectorAll('.builder-explorer-option');
            buttons.forEach(function(b) {
                var k = b.getAttribute('data-explore-key');
                if (k && k === CHAT.exploreKey) b.classList.add('is-selected');
                else b.classList.remove('is-selected');
            });
        }

        function parseAddressParts(addressText) {
            var raw = String(addressText || '').trim();
            if (!raw) return { city: '', region: '' };

            var parts = raw.split(',').map(function(p) { return String(p).trim(); }).filter(Boolean);

            var region = '';
            var city = '';
            if (parts.length >= 2) {
                var last = parts[parts.length - 1];
                var regionMatch = last.match(/\b([A-Za-z]{2})\b/);
                region = regionMatch ? regionMatch[1].toUpperCase() : '';

                if (parts.length >= 3) city = parts[parts.length - 2];
                else city = parts[parts.length - 2];
            }

            city = city ? city.replace(/\s*[\d-].*$/, '').trim() : '';
            return { city: city, region: region };
        }

        function inferAssetTypeKey(addressText) {
            var t = String(addressText || '').toLowerCase();
            if (/(apartment|apt|unit|duplex|triplex|fourplex|multi[-\s]?family|condo)/i.test(t)) return 'apartment';
            if (/(office|suite)/i.test(t)) return 'office';
            if (/(building)/i.test(t)) return 'building';
            if (/(lot|land|vacant|empty|field)/i.test(t)) return 'land';
            return 'house';
        }

        function inferOccupancyLabel(addressText) {
            var t = String(addressText || '').toLowerCase();
            if (/(vacant|empty|unoccupied)/i.test(t)) return 'Vacant / underutilized';
            if (/(rented|tenant|tenanted|leased)/i.test(t)) return 'Rented / multi-tenant';
            return 'Owner-occupied (home)';
        }

        /** Safe subset of Markdown for chat bubbles */
        function formatChatBubbleHtml(raw) {
            var s = String(raw || '');
            var esc = escapeHtml(s);
            esc = esc.replace(/^## (.+)$/gm, '<strong class="builder-chat-md-h2">$1</strong>');
            esc = esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            esc = esc.replace(/\n/g, '<br>');
            return esc;
        }

        function appendMsg(role, text) {
            var msg = document.createElement('div');
            msg.className = 'builder-chat-msg ' + (role === 'user' ? 'user' : 'bot');
            var bubble = document.createElement('div');
            bubble.className = 'builder-chat-bubble';
            bubble.innerHTML = formatChatBubbleHtml(text);
            msg.appendChild(bubble);
            chatLog.appendChild(msg);
            chatLog.scrollTop = chatLog.scrollHeight;
        }

        function refreshChatControls() {
            var active = CHAT.sessionActive;
            var busy = CHAT.loading;
            messageInput.disabled = !active || busy;
            sendBtn.disabled = !active || busy;
            startBtn.disabled = busy;
        }

        function openChatbox() {
            CHAT.isOpen = true;
            chatPanel.classList.remove('hidden');
            chatPrompt.style.display = 'none';
            chatLauncher.style.display = 'none';

            if (!CHAT.hasGreeted) {
                appendMsg(
                    'bot',
                    'Hi! I’m here to help you **explore adding more homes or units** at your property — in plain language, with no construction background needed.\n\n' +
                        '**Step 1 (optional):** Tap a **common path** below (ADU, basement apartment, subdivision, etc.) if one sounds like you.\n' +
                        '**Step 2:** Type your full address.\n' +
                        '**Step 3:** Tap **Start** — I’ll explain what might be possible and what to double-check locally.\n' +
                        '**Step 4:** Keep chatting or tap another path anytime to learn more.'
                );
                CHAT.hasGreeted = true;
            }
        }

        function closeChatbox() {
            CHAT.isOpen = false;
            chatPanel.classList.add('hidden');
            chatPrompt.style.display = '';
            chatLauncher.style.display = '';
        }

        function resetChat() {
            CHAT.addressText = '';
            CHAT.propertyIntel = null;
            CHAT.feasibilitySummary = '';
            CHAT.cardDraft = null;
            CHAT.savedDraftId = null;
            CHAT.savedDraftCreatedAt = null;
            CHAT.isDemoMode = false;
            CHAT.thread = [];
            CHAT.sessionActive = false;
            CHAT.loading = false;
            CHAT.reportId = null;
            chatLog.innerHTML = '';
            applyBtn.disabled = true;
            if (reportBtn) reportBtn.classList.add('hidden');
            messageInput.value = '';
            /* Keep exploreKey / exploreFocusText so a chosen topic survives a new Start */
            refreshChatControls();
            syncOptionButtons();
        }

        function buildDemoPropertyIntel(addressText) {
            var parts = parseAddressParts(addressText);
            var asset = inferAssetTypeKey(addressText);
            var occ = inferOccupancyLabel(addressText);
            return {
                demo: true,
                inputAddress: addressText,
                dataQuality: 'client_demo_no_api',
                city: parts.city || null,
                region: parts.region || null,
                zoningDistrict: '— (address only — confirm on municipal GIS)',
                lotAreaSqFt: null,
                useAndOccupancy: 'Heuristics from address text only (not verified). Keywords suggest: ' + asset + '; occupancy guess: ' + occ,
                geocode: {
                    normalized: addressText,
                    provider: 'none',
                    context: { city: parts.city, region: parts.region }
                },
                jurisdiction: {
                    censusGeographies: { ok: false, skipped: true, reason: 'Preview — full data when API is available' }
                },
                openStreetMap: { ok: false, skipped: true, reason: 'Preview — full data when API is available' },
                limitations: ['Address-only preview when property API is unreachable.'],
                fetchedAt: new Date().toISOString()
            };
        }

        function getApiBase() {
            if (typeof window.BRICKSNEXUS_API_BASE === 'string' && window.BRICKSNEXUS_API_BASE.length) {
                return window.BRICKSNEXUS_API_BASE.replace(/\/$/, '');
            }
            var meta = document.querySelector('meta[name="bricksnexus-api-base"]');
            if (meta && meta.getAttribute('content')) {
                return meta.getAttribute('content').replace(/\/$/, '');
            }
            return '';
        }

        function applyIntelToForm() {
            var intel = CHAT.propertyIntel;
            if (!intel) return;
            var draft = CHAT.cardDraft || {};
            if (!formState.type) setSelectedType('exploring');
            setValue('opp-address', intel.inputAddress || (intel.geocode && intel.geocode.normalized) || CHAT.addressText);
            setValue('opp-city', intel.city || getValue('opp-city'));
            setValue('opp-region', intel.region || getValue('opp-region'));
            setValue('opp-title', draft.opportunityTitle || ('Explore more units — ' + (intel.city || 'your property')));
            var summaryText = draft.jobDescription || '';
            if (summaryText && CHAT.feasibilitySummary) {
                summaryText = summaryText + '\n\n---\n\n' + buildAnalysisSummaryText(intel);
            } else {
                summaryText = buildAnalysisSummaryText(intel);
            }
            setValue('opp-summary', summaryText);
            formState.selectedProfessions = mapWorkersToTeam(draft.workersNeeded);
            renderTeamChecklist();
            setValue('opp-simple-need', formatSimpleNeed(draft));
            setValue('opp-budget', draft.estimatedCost || getValue('opp-budget') || 'TBD after scope');
            setValue('opp-estimated-timeline', draft.estimatedTimeline || '');
            if (Array.isArray(draft.projectScopes) && draft.projectScopes.length) {
                formState.projectScopes = draft.projectScopes.slice();
                renderPropertyChecklist();
            }
            setValue(
                'opp-terms',
                'Deliverables:\n- Plain-language summary of options and constraints\n- What to verify with the city/planning office\n- Suggested next steps with a designer or permit professional'
            );
            updateTeamWidget();
            clearErrors();
            appendMsg('bot', 'I filled in your opportunity draft. You can edit it and continue the steps below.');
        }

        function notifyProfileSaved(isUpdate) {
            var verb = isUpdate ? 'Updated' : 'Saved';
            appendMsg(
                'bot',
                '**' + verb + ' to My Opportunities** on your profile. Open **Profile → My Opportunities** to review, or tap **Apply to Opportunity** here to keep editing in the builder.'
            );
        }

        /**
         * Load property JSON for the model (live API or address-only preview).
         */
        async function ensurePropertyIntel() {
            var addressText = String(chatAddressInput.value || '').trim();
            if (!addressText) return null;
            CHAT.addressText = addressText;
            if (CHAT.propertyIntel) return true;

            var base = getApiBase();
            var url = (base || '') + '/api/property';
            try {
                var res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: addressText })
                });
                var data = await res.json().catch(function() { return {}; });
                if (res.ok && data.ok && data.property) {
                    CHAT.propertyIntel = data.property;
                    CHAT.isDemoMode = false;
                    return true;
                }
            } catch (e) {
                /* use preview */
            }
            CHAT.propertyIntel = buildDemoPropertyIntel(addressText);
            CHAT.isDemoMode = true;
            return true;
        }

        /**
         * POST /api/feasibility with current thread (assistant/user turns only).
         */
        async function callFeasibility(messagesForApi) {
            var base = getApiBase();
            var url = (base || '') + '/api/feasibility';
            var msgs = messagesForApi || [];
            var payload = {
                address: CHAT.addressText,
                property: CHAT.propertyIntel || buildDemoPropertyIntel(CHAT.addressText),
                messages: msgs
            };
            if (msgs.length === 0 && CHAT.exploreFocusText) {
                payload.exploreFocus = CHAT.exploreFocusText;
            }
            var res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            var data = await res.json().catch(function() { return {}; });
            if (!res.ok) {
                var errParts = [data.detail, data.error, 'HTTP ' + res.status].filter(Boolean);
                var fail = new Error(errParts[0] || 'Request failed');
                fail.httpStatus = res.status;
                throw fail;
            }
            return data;
        }

        function setLoading(loading) {
            CHAT.loading = loading;
            refreshChatControls();
        }

        async function startSession() {
            var addressText = String(chatAddressInput.value || '').trim();
            if (!addressText) {
                appendMsg('bot', 'Please type your property address first, then tap **Start**.');
                return;
            }

            resetChat();
            CHAT.addressText = addressText;
            appendMsg('user', 'My property is at: ' + addressText);
            appendMsg('bot', 'Fetching property data and generating your opportunity report… this takes about 15–20 seconds.');

            setLoading(true);
            try {
                var base = getApiBase();
                var url = (base || '') + '/api/opportunity-report';
                var res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: addressText })
                });
                var data = await res.json().catch(function() { return {}; });

                if (!res.ok) {
                    var errParts = [data.error, 'HTTP ' + res.status].filter(Boolean);
                    var fail = new Error(errParts[0] || 'Report request failed');
                    fail.httpStatus = res.status;
                    throw fail;
                }

                CHAT.reportId = data.reportId || null;
                CHAT.propertyIntel = data.property || null;

                // Build a short text summary for the chat log from the analysis
                var analysis = data.analysis || {};
                var opps = Array.isArray(analysis.opportunities) ? analysis.opportunities : [];
                var summaryLines = [];
                if (analysis.remainingCapacity && analysis.remainingCapacity.value != null) {
                    summaryLines.push('**Remaining FAR capacity:** ' + analysis.remainingCapacity.value.toLocaleString() + ' sq ft');
                }
                if (analysis.potentialAdditionalUnits && analysis.potentialAdditionalUnits.value != null) {
                    summaryLines.push('**Potential additional units:** ~' + analysis.potentialAdditionalUnits.value);
                }
                if (analysis.storyHeadroom && analysis.storyHeadroom.value != null) {
                    summaryLines.push('**Story headroom:** ' + analysis.storyHeadroom.value + ' floor(s)');
                }
                if (opps.length) {
                    summaryLines.push('\n**' + opps.length + ' investigate lead(s) identified.** Open the full report for details, math, and next steps.');
                }

                var chatSummary = summaryLines.length
                    ? 'Report ready. Here\'s a quick snapshot:\n\n' + summaryLines.join('\n')
                    : 'Report ready. Open the full report below to see property data, zoning rules, and opportunities.';

                CHAT.feasibilitySummary = chatSummary;
                appendMsg('bot', chatSummary);
                CHAT.thread.push({ role: 'assistant', content: chatSummary });
                CHAT.sessionActive = true;
                applyBtn.disabled = false;
                if (reportBtn && CHAT.reportId) {
                    reportBtn.classList.remove('hidden');
                }
                refreshChatControls();
                messageInput.focus();
            } catch (err) {
                var errMsg = '**Something went wrong:** ' + (err.message || err);
                if (err.httpStatus === 405 || err.httpStatus === 404) {
                    errMsg +=
                        '\n\nThis page may be on **static hosting** (no AI server here). Ask your team to set **bricksnexus-api-base** in this page to your **Vercel** (or other) URL where the app runs, and add **GEMINI_API_KEY** (Google AI Studio) there.';
                }
                appendMsg('bot', errMsg);
            } finally {
                setLoading(false);
            }
        }

        async function postUserTurn(text) {
            if (!CHAT.sessionActive || CHAT.loading) return;
            text = String(text || '').trim();
            if (!text) return;

            appendMsg('user', text);
            CHAT.thread.push({ role: 'user', content: text });

            setLoading(true);
            try {
                var data = await callFeasibility(CHAT.thread);
                var reply = data.feasibilitySummary || '';
                CHAT.feasibilitySummary = reply;
                CHAT.cardDraft = resolveCardDraft(data);
                appendMsg('bot', reply);
                CHAT.thread.push({ role: 'assistant', content: reply });
                saveAnalyzedOpportunityToProfile(CHAT.cardDraft);
                notifyProfileSaved(true);
            } catch (err) {
                CHAT.thread.pop();
                var msg = '**Message not sent:** ' + (err.message || err);
                if (err.httpStatus === 405 || err.httpStatus === 404) {
                    msg += '\n\nCheck that **bricksnexus-api-base** points to your deployed app.';
                }
                appendMsg('bot', msg);
            } finally {
                setLoading(false);
                if (CHAT.sessionActive) messageInput.focus();
            }
        }

        async function sendFollowUp() {
            if (!CHAT.sessionActive || CHAT.loading) return;
            var text = String(messageInput.value || '').trim();
            if (!text) return;
            messageInput.value = '';
            await postUserTurn(text);
        }

        startBtn.addEventListener('click', function() {
            startSession();
        });

        chatAddressInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                startSession();
            }
        });

        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendFollowUp();
            }
        });

        sendBtn.addEventListener('click', sendFollowUp);

        applyBtn.addEventListener('click', function() {
            if (CHAT.propertyIntel && CHAT.feasibilitySummary) {
                applyIntelToForm();
                if (CHAT.savedDraftId) {
                    var drafts = app.readJson(app.KEYS.opportunityDrafts, []);
                    editingRecord = drafts.find(function(item) {
                        return String(item.id) === String(CHAT.savedDraftId);
                    }) || { id: CHAT.savedDraftId };
                    editingStorageKey = app.KEYS.opportunityDrafts;
                }
            }
        });

        if (reportBtn) {
            reportBtn.addEventListener('click', function() {
                if (!CHAT.reportId) return;
                window.dispatchEvent(new CustomEvent('opp:open-report', {
                    detail: { reportId: CHAT.reportId }
                }));
            });
        }

        if (optionsEl) {
            optionsEl.addEventListener('click', function(e) {
                var btn = e.target && e.target.closest ? e.target.closest('.builder-explorer-option') : null;
                if (!btn || !optionsEl.contains(btn)) return;
                var key = btn.getAttribute('data-explore-key');
                var focus = btn.getAttribute('data-explore-focus') || '';
                var label = btn.getAttribute('data-explore-label') || '';

                if (CHAT.exploreKey === key) {
                    CHAT.exploreKey = null;
                    CHAT.exploreFocusText = '';
                    syncOptionButtons();
                    return;
                }

                CHAT.exploreKey = key;
                CHAT.exploreFocusText = focus;
                syncOptionButtons();

                if (CHAT.sessionActive && !CHAT.loading) {
                    var q =
                        'I want to explore **' +
                        label +
                        '** for this address.\n\n' +
                        (focus ? focus + '\n\n' : '') +
                        'What should I know in plain language?';
                    postUserTurn(q);
                }
            });
        }

        chatLauncher.addEventListener('click', openChatbox);
        chatPrompt.addEventListener('click', openChatbox);
        chatClose.addEventListener('click', closeChatbox);

        refreshChatControls();
        syncOptionButtons();
    })();



    openStep('type');
    refreshPublishState();
});
