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
    // AI Opportunity Builder — expandable floating chatbot with inline form steps
    // ------------------------------
    (function initOpportunityExplorerChatbot() {
        var widget = getInput('opp-chat-widget');
        var chatPanel = getInput('opp-chat-panel');
        var chatClose = getInput('opp-chat-close-btn');
        var chatExpandBtn = getInput('opp-chat-expand-btn');
        var chatLauncher = getInput('opp-chat-launcher');
        var chatPrompt = getInput('opp-chat-help-prompt');
        var chatAddressInput = getInput('opp-chat-address');
        var chatAddressSection = getInput('opp-chat-address-section');
        var startBtn = getInput('opp-chat-start-btn');
        var sendBtn = getInput('opp-chat-send-btn');
        var messageInput = getInput('opp-chat-message-input');
        var applyBtn = getInput('opp-chat-apply-btn');
        var chatLog = getInput('opp-chat-log');
        var optionsEl = getInput('opp-chat-options');
        var progressPips = document.querySelectorAll('#opp-chat-progress .chat-progress-pip');
        var panelTitle = getInput('opp-chat-panel-title');

        if (
            !widget || !chatPanel || !chatClose ||
            !chatAddressInput || !startBtn || !sendBtn || !messageInput ||
            !applyBtn || !chatLog
        ) return;

        var isExpanded = false;

        var CHAT = {
            isOpen: false,
            hasGreeted: false,
            addressText: '',
            propertyIntel: null,
            feasibilitySummary: '',
            isDemoMode: false,
            thread: [],
            sessionActive: false,
            loading: false,
            exploreKey: null,
            exploreFocusText: '',
            // inline builder state
            inlineStep: null,   // 'type' | 'details' | 'team' | 'done'
            inlineData: {
                type: '',
                title: '',
                summary: '',
                city: '',
                region: '',
                budget: '',
                address: '',
                team: []
            }
        };

        // ---- expand / collapse ----
        function setExpanded(expand) {
            isExpanded = expand;
            widget.classList.toggle('is-expanded', expand);
            if (chatExpandBtn) {
                chatExpandBtn.innerHTML = expand
                    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 21H3v-6M21 3h-6M3 21l7-7M21 3l-7 7"/></svg>'
                    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
                chatExpandBtn.title = expand ? 'Collapse' : 'Expand';
            }
        }

        // ---- progress pips ----
        var PIP_STEPS = ['address', 'type', 'details', 'team', 'done'];
        function setProgressPip(stepName) {
            var idx = PIP_STEPS.indexOf(stepName);
            progressPips.forEach(function(pip, i) {
                pip.classList.remove('active', 'done');
                if (i < idx) pip.classList.add('done');
                else if (i === idx) pip.classList.add('active');
            });
        }

        // ---- option pill sync ----
        function syncOptionButtons() {
            if (!optionsEl) return;
            optionsEl.querySelectorAll('.builder-explorer-option').forEach(function(b) {
                var k = b.getAttribute('data-explore-key');
                b.classList.toggle('is-selected', k === CHAT.exploreKey);
            });
        }

        // ---- address parsing helpers ----
        function parseAddressParts(addressText) {
            var raw = String(addressText || '').trim();
            if (!raw) return { city: '', region: '' };
            var parts = raw.split(',').map(function(p) { return p.trim(); }).filter(Boolean);
            var region = '', city = '';
            if (parts.length >= 2) {
                var last = parts[parts.length - 1];
                var m = last.match(/\b([A-Za-z]{2})\b/);
                region = m ? m[1].toUpperCase() : '';
                city = parts.length >= 3 ? parts[parts.length - 2] : parts[parts.length - 2];
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

        // ---- markdown-lite formatter ----
        function formatChatBubbleHtml(raw) {
            var s = escapeHtml(String(raw || ''));
            s = s.replace(/^## (.+)$/gm, '<strong class="builder-chat-md-h2">$1</strong>');
            s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            s = s.replace(/\n/g, '<br>');
            return s;
        }

        // ---- message renderers ----
        function appendMsg(role, text) {
            var wrap = document.createElement('div');
            wrap.className = 'builder-chat-msg ' + (role === 'user' ? 'user' : 'bot');
            var bubble = document.createElement('div');
            bubble.className = 'builder-chat-bubble';
            bubble.innerHTML = formatChatBubbleHtml(text);
            wrap.appendChild(bubble);
            chatLog.appendChild(wrap);
            chatLog.scrollTop = chatLog.scrollHeight;
        }

        function appendLoadingDots() {
            var wrap = document.createElement('div');
            wrap.className = 'builder-chat-msg bot';
            wrap.id = 'chat-loading-indicator';
            var bubble = document.createElement('div');
            bubble.className = 'builder-chat-bubble chat-loading-dots';
            bubble.innerHTML = '<div class="chat-loading-dot"></div><div class="chat-loading-dot"></div><div class="chat-loading-dot"></div>';
            wrap.appendChild(bubble);
            chatLog.appendChild(wrap);
            chatLog.scrollTop = chatLog.scrollHeight;
            return wrap;
        }

        function removeLoadingDots() {
            var el = document.getElementById('chat-loading-indicator');
            if (el) el.remove();
        }

        function appendStepDivider(label) {
            var div = document.createElement('div');
            div.className = 'chat-step-divider';
            div.textContent = label;
            chatLog.appendChild(div);
        }

        // ---- NYC building class descriptions ----
        var BLDG_CLASS_DESC = {
            'A': 'One Family Dwelling', 'B': 'Two Family Dwelling', 'C': 'Walk-Up Apartment',
            'C0': 'Walk-Up Apt (3-4 Families)', 'C1': 'Walk-Up Apt (5 Families)', 'C2': 'Walk-Up Apt (5+ Families)',
            'C3': 'Walk-Up Apt (Converted)', 'C4': 'Walk-Up Apt (Old Law)', 'C5': 'Walk-Up Apt (Converted Old Law)',
            'C6': 'Walk-Up Apt (Six Families)', 'C7': 'Walk-Up Apt. Over Six Families With Stores',
            'C8': 'Walk-Up Apt (Converted Store)', 'C9': 'Walk-Up Apt (Garden)', 'D': 'Elevator Apartment',
            'D0': 'Elevator Apt (Semi-Fireproof)', 'D1': 'Elevator Apt (Semi-Fireproof with Stores)',
            'D2': 'Elevator Apt (Artists)', 'D3': 'Elevator Apt (Fireproof with Stores)',
            'D4': 'Elevator Apt (Cooperative)', 'D5': 'Elevator Apt (Converted)', 'D6': 'Elevator Apt (Fireproof)',
            'D7': 'Elevator Apt (Fireproof, 2 Stairs)', 'D8': 'Elevator Apt (Luxury)',
            'D9': 'Elevator Apt (Undergoing Alterations)', 'E': 'Warehouse / Factory / Industrial',
            'F': 'Factory / Industrial', 'G': 'Garage', 'H': 'Hotel', 'I': 'Hospital / Health',
            'J': 'Theatre', 'K': 'Store Building', 'L': 'Loft', 'M': 'Religious / Educational',
            'N': 'Asylums / Homes', 'O': 'Office Building', 'P': 'Indoor Public Assembly',
            'Q': 'Outdoor Recreation', 'R': 'Condo', 'RR': 'Condo (Residential)', 'S': 'Mixed Residential & Commercial',
            'T': 'Transportation Facility', 'U': 'Utility', 'V': 'Vacant Land', 'W': 'Educational / Cultural',
            'Y': 'Government', 'Z': 'Misc.'
        };
        function bldgClassLabel(code) {
            if (!code) return '';
            var uc = String(code).toUpperCase();
            return BLDG_CLASS_DESC[uc] || ('Class ' + uc);
        }

        // ---- property report card ----
        function appendPropertyReport(intel) {
            var pluto = intel && intel.localRecords && intel.localRecords.nyc && intel.localRecords.nyc.pluto;
            if (!pluto || !pluto.ok) return;

            // Resolve borough from BBL prefix
            var boroughMap = { '1': 'Manhattan', '2': 'Bronx', '3': 'Brooklyn', '4': 'Queens', '5': 'Staten Island' };
            var boroughCode = pluto.bbl ? String(pluto.bbl)[0] : '';
            var borough = boroughMap[boroughCode] || '';

            var bldgClass = pluto.buildingClass || '';
            var bldgDesc = bldgClassLabel(bldgClass);
            var bldgLabel = bldgClass ? (bldgClass + (bldgDesc ? ' - ' + bldgDesc.toUpperCase() : '')) : '';

            var taxClass = pluto.taxClass || (intel.attomData && intel.attomData.taxClass) || '';
            var yearBuilt = pluto.yearBuiltPluto || (intel.attomData && intel.attomData.yearBuilt) || '';
            var stories = pluto.numFloors || (intel.attomData && intel.attomData.stories) || '';
            var numBldgs = pluto.numBuildings != null ? pluto.numBuildings : '';
            var totalArea = pluto.totalBuildingArea != null ? Number(pluto.totalBuildingArea).toLocaleString() : '';
            var totalUnits = pluto.totalUnits != null ? pluto.totalUnits : '';
            var resArea = pluto.residentialArea != null ? Number(pluto.residentialArea).toLocaleString() : '';
            var resUnits = pluto.residentialUnits != null ? pluto.residentialUnits : '';
            var comArea = pluto.commercialArea != null ? Number(pluto.commercialArea).toLocaleString() : '';
            var comUnits = (totalUnits && resUnits) ? (Number(totalUnits) - Number(resUnits)) : '';
            var bldgStyle = pluto.buildingStyle || '';
            var bldgFront = pluto.buildingFrontage != null ? pluto.buildingFrontage : '';
            var bldgDepth = pluto.buildingDepth != null ? pluto.buildingDepth : '';
            var constructType = pluto.constructionType || '';
            var lotFront = pluto.lotFrontage != null ? pluto.lotFrontage : '';
            var lotDepth = pluto.lotDepth != null ? pluto.lotDepth : '';
            var lotArea = pluto.lotAreaSqFt != null ? Number(pluto.lotAreaSqFt).toLocaleString() : '';
            var zoning = pluto.zoningDistrict || intel.zoningDistrict || '';
            var ownerName = intel.ownerName || pluto.ownerName || '';
            var block = pluto.block || '';
            var lot = pluto.lot || '';
            var address = intel.streetLine || intel.inputAddress || '';

            function row(label, val) {
                if (val === '' || val == null) return '';
                return '<tr><td class="rpt-label">' + escapeHtml(String(label)) + '</td><td class="rpt-val">' + escapeHtml(String(val)) + '</td></tr>';
            }

            var card = document.createElement('div');
            card.className = 'chat-form-card chat-report-card';
            card.id = 'chat-card-report';
            card.innerHTML =
                '<div class="rpt-header">' +
                    '<div class="rpt-badge">Opportunity Report</div>' +
                    (address ? '<div class="rpt-address">' + escapeHtml(address.toUpperCase()) + '</div>' : '') +
                '</div>' +
                '<div class="rpt-section-title">Property Information</div>' +
                '<table class="rpt-table">' +
                    (borough ? row('Borough', borough) : '') +
                    (block ? row('Block', block) : '') +
                    (lot ? row('Lot', lot) : '') +
                    (ownerName ? row('Property Owner', ownerName) : '') +
                    (bldgLabel ? row('Type', bldgLabel) : '') +
                    (taxClass ? row('Tax Class', taxClass) : '') +
                    (numBldgs !== '' ? row('Number of Buildings', numBldgs) : '') +
                    (yearBuilt ? row('Year Built', yearBuilt) : '') +
                    (stories !== '' ? row('Number of Stories', stories) : '') +
                    (totalArea ? row('Total Area', totalArea + ' sq ft') : '') +
                    (totalUnits !== '' ? row('Total Units', totalUnits) : '') +
                    (resArea ? row('Residential Area', resArea + ' sq ft') : '') +
                    (resUnits !== '' ? row('Residential Units', resUnits) : '') +
                    (comArea ? row('Commercial Area', comArea + ' sq ft') : '') +
                    (comUnits !== '' ? row('Commercial Units', comUnits) : '') +
                    (bldgStyle ? row('Building Style', bldgStyle) : '') +
                    (bldgFront !== '' ? row('Building Frontage', bldgFront + ' ft') : '') +
                    (bldgDepth !== '' ? row('Building Depth', bldgDepth + ' ft') : '') +
                    (constructType ? row('Construction Type', constructType) : '') +
                '</table>' +
                '<div class="rpt-section-title">Land Information</div>' +
                '<table class="rpt-table">' +
                    (lotFront !== '' ? row('Land Frontage', lotFront + ' ft') : '') +
                    (lotDepth !== '' ? row('Land Depth', lotDepth + ' ft') : '') +
                    (lotArea ? row('Land Area', lotArea + ' sq ft') : '') +
                    (zoning ? row('Zoning', zoning) : '') +
                '</table>';
            chatLog.appendChild(card);
            chatLog.scrollTop = chatLog.scrollHeight;
        }

        // ---- inline form card builders ----
        function appendTypeCard() {
            appendStepDivider('Step 1 — Opportunity Type');
            var card = document.createElement('div');
            card.className = 'chat-form-card';
            card.id = 'chat-card-type';
            card.innerHTML =
                '<div class="chat-form-card-title">What kind of opportunity is this?</div>' +
                '<div class="chat-type-grid">' +
                    ['hiring', 'services', 'project', 'exploring'].map(function(k) {
                        var labels = { hiring: 'Hiring', services: 'Services', project: 'Project', exploring: 'Exploring' };
                        var descs = {
                            hiring: 'Role, job description, location & budget.',
                            services: 'Hire service providers or contractors.',
                            project: 'Full project with team, timeline & docs.',
                            exploring: 'Early-stage — gauge interest & partners.'
                        };
                        return '<button type="button" class="chat-type-btn" data-type="' + k + '">' +
                            '<strong>' + labels[k] + '</strong>' +
                            '<span>' + descs[k] + '</span>' +
                        '</button>';
                    }).join('') +
                '</div>';
            chatLog.appendChild(card);

            card.querySelectorAll('.chat-type-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    card.querySelectorAll('.chat-type-btn').forEach(function(b) { b.classList.remove('selected'); });
                    btn.classList.add('selected');
                    CHAT.inlineData.type = btn.getAttribute('data-type');
                    var label = btn.querySelector('strong').textContent;
                    setTimeout(function() {
                        appendMsg('user', 'Type: ' + label);
                        card.style.opacity = '0.5';
                        card.style.pointerEvents = 'none';
                        setProgressPip('details');
                        if (panelTitle) panelTitle.textContent = 'Details';
                        setTimeout(function() { appendDetailsCard(); }, 300);
                    }, 200);
                });
            });
            chatLog.scrollTop = chatLog.scrollHeight;
        }

        function appendDetailsCard() {
            appendMsg('bot', 'Great choice. Now fill in the key details:');
            appendStepDivider('Step 2 — Details');

            var cityVal = CHAT.inlineData.city || (CHAT.propertyIntel && CHAT.propertyIntel.city) || '';
            var regionVal = CHAT.inlineData.region || (CHAT.propertyIntel && CHAT.propertyIntel.region) || '';
            var addrVal = CHAT.inlineData.address || CHAT.addressText || '';

            var card = document.createElement('div');
            card.className = 'chat-form-card';
            card.id = 'chat-card-details';
            card.innerHTML =
                '<div class="chat-form-card-title">Project details</div>' +
                '<div class="chat-field">' +
                    '<label>Opportunity title *</label>' +
                    '<input type="text" id="ci-title" placeholder="e.g. ADU design & permitting, Austin TX" value="' + escapeHtml(CHAT.inlineData.title) + '">' +
                '</div>' +
                '<div class="chat-field">' +
                    '<label>Project brief / description *</label>' +
                    '<textarea id="ci-summary" rows="3" placeholder="Describe scope, stage, urgency and expected deliverables.">' + escapeHtml(CHAT.inlineData.summary) + '</textarea>' +
                '</div>' +
                '<div class="chat-form-grid-2">' +
                    '<div class="chat-field"><label>City *</label><input type="text" id="ci-city" placeholder="Austin" value="' + escapeHtml(cityVal) + '"></div>' +
                    '<div class="chat-field"><label>State / Region</label><input type="text" id="ci-region" placeholder="TX" value="' + escapeHtml(regionVal) + '"></div>' +
                '</div>' +
                '<div class="chat-form-grid-2">' +
                    '<div class="chat-field"><label>Budget</label><input type="text" id="ci-budget" placeholder="$50k – $200k" value="' + escapeHtml(CHAT.inlineData.budget) + '"></div>' +
                    '<div class="chat-field"><label>Address / site note</label><input type="text" id="ci-address" placeholder="Street or landmark" value="' + escapeHtml(addrVal) + '"></div>' +
                '</div>' +
                '<div class="chat-card-actions">' +
                    '<button type="button" class="chat-card-btn chat-card-btn-primary" id="ci-details-confirm">Continue →</button>' +
                    '<button type="button" class="chat-card-btn chat-card-btn-secondary" id="ci-details-skip">Skip for now</button>' +
                '</div>';
            chatLog.appendChild(card);
            chatLog.scrollTop = chatLog.scrollHeight;

            function confirmDetails(skip) {
                if (!skip) {
                    CHAT.inlineData.title = card.querySelector('#ci-title').value.trim();
                    CHAT.inlineData.summary = card.querySelector('#ci-summary').value.trim();
                    CHAT.inlineData.city = card.querySelector('#ci-city').value.trim();
                    CHAT.inlineData.region = card.querySelector('#ci-region').value.trim();
                    CHAT.inlineData.budget = card.querySelector('#ci-budget').value.trim();
                    CHAT.inlineData.address = card.querySelector('#ci-address').value.trim();

                    if (!skip && !CHAT.inlineData.title) {
                        card.querySelector('#ci-title').style.borderColor = 'rgba(239,68,68,0.7)';
                        card.querySelector('#ci-title').focus();
                        return;
                    }

                    var summary = CHAT.inlineData.title + (CHAT.inlineData.city ? ' · ' + CHAT.inlineData.city : '');
                    appendMsg('user', 'Details: ' + summary);
                }
                card.style.opacity = '0.5';
                card.style.pointerEvents = 'none';
                setProgressPip('team');
                if (panelTitle) panelTitle.textContent = 'Team';
                setTimeout(function() { appendTeamCard(); }, 300);
            }

            card.querySelector('#ci-details-confirm').addEventListener('click', function() { confirmDetails(false); });
            card.querySelector('#ci-details-skip').addEventListener('click', function() { confirmDetails(true); });
        }

        var TEAM_OPTS = [
            'Architect', 'Civil Engineer', 'General Contractor', 'Electrician',
            'Plumber', 'Project Manager', 'Surveyor', 'Real Estate Lawyer'
        ];

        function appendTeamCard() {
            appendMsg('bot', 'Almost there — who do you need on this project? (Select all that apply)');
            appendStepDivider('Step 3 — Team');

            var card = document.createElement('div');
            card.className = 'chat-form-card';
            card.id = 'chat-card-team';
            card.innerHTML =
                '<div class="chat-form-card-title">Professionals needed</div>' +
                '<div class="chat-profession-grid">' +
                TEAM_OPTS.map(function(name) {
                    return '<button type="button" class="chat-profession-chip" data-prof="' + escapeHtml(name) + '">' + escapeHtml(name) + '</button>';
                }).join('') +
                '</div>' +
                '<div class="chat-field" style="margin-top:12px;">' +
                    '<label>Or describe what you need</label>' +
                    '<textarea id="ci-need" rows="2" placeholder="e.g. I need a zoning attorney and a residential architect."></textarea>' +
                '</div>' +
                '<div class="chat-card-actions">' +
                    '<button type="button" class="chat-card-btn chat-card-btn-primary" id="ci-team-confirm">Finish & Apply →</button>' +
                    '<button type="button" class="chat-card-btn chat-card-btn-secondary" id="ci-team-skip">Skip</button>' +
                '</div>';
            chatLog.appendChild(card);
            chatLog.scrollTop = chatLog.scrollHeight;

            card.querySelectorAll('.chat-profession-chip').forEach(function(chip) {
                chip.addEventListener('click', function() {
                    chip.classList.toggle('selected');
                    var name = chip.getAttribute('data-prof');
                    var idx = CHAT.inlineData.team.indexOf(name);
                    if (chip.classList.contains('selected')) {
                        if (idx === -1) CHAT.inlineData.team.push(name);
                    } else {
                        if (idx !== -1) CHAT.inlineData.team.splice(idx, 1);
                    }
                });
            });

            function finishTeam(skip) {
                if (!skip) {
                    var needText = card.querySelector('#ci-need').value.trim();
                    CHAT.inlineData.simpleNeed = needText;
                }
                card.style.opacity = '0.5';
                card.style.pointerEvents = 'none';
                setProgressPip('done');
                if (panelTitle) panelTitle.textContent = 'Ready';
                applyInlineToForm();
            }

            card.querySelector('#ci-team-confirm').addEventListener('click', function() { finishTeam(false); });
            card.querySelector('#ci-team-skip').addEventListener('click', function() { finishTeam(true); });
        }

        // ---- apply inline data to the real form ----
        function applyInlineToForm() {
            var d = CHAT.inlineData;
            var intel = CHAT.propertyIntel;

            if (d.type) setSelectedType(d.type);
            else if (!formState.type) setSelectedType('exploring');

            if (d.title) setValue('opp-title', d.title);
            if (d.city) setValue('opp-city', d.city);
            else if (intel && intel.city) setValue('opp-city', intel.city);
            if (d.region) setValue('opp-region', d.region);
            else if (intel && intel.region) setValue('opp-region', intel.region);
            if (d.budget) setValue('opp-budget', d.budget);
            if (d.address) setValue('opp-address', d.address);
            else if (CHAT.addressText) setValue('opp-address', CHAT.addressText);

            var summaryParts = [];
            if (d.summary) summaryParts.push(d.summary);
            if (CHAT.feasibilitySummary) {
                summaryParts.push('');
                summaryParts.push('--- AI Analysis ---');
                summaryParts.push(CHAT.feasibilitySummary);
            }
            if (summaryParts.length) setValue('opp-summary', summaryParts.join('\n'));

            if (d.team && d.team.length) {
                formState.selectedProfessions = d.team.slice();
                renderTeamChecklist();
                updateTeamWidget();
            }

            var simpleNeed = d.simpleNeed ||
                'Help with: ' + (d.type || 'development project') + (CHAT.addressText ? ' at ' + CHAT.addressText : '');
            setValue('opp-simple-need', simpleNeed);

            if (!getValue('opp-terms')) {
                setValue('opp-terms', 'Deliverables to be confirmed with selected professionals.');
            }

            clearErrors();
            applyBtn.disabled = false;
            CHAT.sessionActive = true;

            appendMsg('bot',
                'All done! ✓ Your opportunity form has been filled in.\n\n' +
                '**Tap "Apply to Opportunity Form"** below to transfer everything, ' +
                'then continue through the remaining steps (Chronogram, Financing, Documents) before publishing.'
            );
            refreshChatControls();
        }

        // ---- apply button transfers data and scrolls to form ----
        function applyIntelToForm() {
            applyInlineToForm();
        }

        // ---- API helpers ----
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
                zoningDistrict: '— (confirm on municipal GIS)',
                lotAreaSqFt: null,
                useAndOccupancy: 'Heuristics only. Suggests: ' + asset + '; occupancy: ' + occ,
                geocode: { normalized: addressText, provider: 'none', context: { city: parts.city, region: parts.region } },
                limitations: ['Address-only preview.'],
                fetchedAt: new Date().toISOString()
            };
        }

        function getApiBase() {
            if (typeof window.BRICKSNEXUS_API_BASE === 'string' && window.BRICKSNEXUS_API_BASE.length) {
                return window.BRICKSNEXUS_API_BASE.replace(/\/$/, '');
            }
            var meta = document.querySelector('meta[name="bricksnexus-api-base"]');
            if (meta && meta.getAttribute('content')) return meta.getAttribute('content').replace(/\/$/, '');
            return '';
        }

        async function ensurePropertyIntel() {
            var addressText = String(chatAddressInput.value || '').trim();
            if (!addressText) return null;
            CHAT.addressText = addressText;
            CHAT.inlineData.address = addressText;
            if (CHAT.propertyIntel) return true;

            var base = getApiBase();
            try {
                var res = await fetch((base || '') + '/api/property', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: addressText })
                });
                var data = await res.json().catch(function() { return {}; });
                if (res.ok && data.ok && data.property) {
                    CHAT.propertyIntel = data.property;
                    CHAT.isDemoMode = false;
                    // pre-fill city/region from intel
                    if (data.property.city) CHAT.inlineData.city = data.property.city;
                    if (data.property.region) CHAT.inlineData.region = data.property.region;
                    return true;
                }
            } catch (e) { /* fall through to demo */ }

            CHAT.propertyIntel = buildDemoPropertyIntel(addressText);
            CHAT.isDemoMode = true;
            var parsed = parseAddressParts(addressText);
            if (parsed.city) CHAT.inlineData.city = parsed.city;
            if (parsed.region) CHAT.inlineData.region = parsed.region;
            return true;
        }

        async function callFeasibility(msgs) {
            var base = getApiBase();
            var payload = {
                address: CHAT.addressText,
                property: CHAT.propertyIntel || buildDemoPropertyIntel(CHAT.addressText),
                messages: msgs || []
            };
            if ((!msgs || !msgs.length) && CHAT.exploreFocusText) {
                payload.exploreFocus = CHAT.exploreFocusText;
            }
            var res = await fetch((base || '') + '/api/feasibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            var data = await res.json().catch(function() { return {}; });
            if (!res.ok) {
                var fail = new Error([data.detail, data.error, 'HTTP ' + res.status].filter(Boolean)[0] || 'Request failed');
                fail.httpStatus = res.status;
                throw fail;
            }
            return data;
        }

        // ---- controls ----
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
            if (chatLauncher) chatLauncher.style.display = 'none';
            if (chatPrompt) chatPrompt.style.display = 'none';

            if (!CHAT.hasGreeted) {
                CHAT.hasGreeted = true;
                appendMsg('bot',
                    'Hi! I\'ll guide you through building your opportunity step-by-step.\n\n' +
                    'Optionally enter your **property address** above for AI-powered zoning insights, ' +
                    'then tap **Start** — or leave it blank to jump straight into the form.'
                );
            }
        }

        function closeChatbox() {
            CHAT.isOpen = false;
            chatPanel.classList.add('hidden');
            if (chatLauncher) chatLauncher.style.display = '';
            if (chatPrompt) chatPrompt.style.display = '';
            setExpanded(false);
        }

        function resetChat() {
            CHAT.addressText = '';
            CHAT.propertyIntel = null;
            CHAT.feasibilitySummary = '';
            CHAT.isDemoMode = false;
            CHAT.thread = [];
            CHAT.sessionActive = false;
            CHAT.loading = false;
            CHAT.inlineStep = null;
            CHAT.inlineData = { type: '', title: '', summary: '', city: '', region: '', budget: '', address: '', team: [] };
            chatLog.innerHTML = '';
            applyBtn.disabled = true;
            messageInput.value = '';
            setProgressPip('address');
            if (panelTitle) panelTitle.textContent = 'Build with AI';
            refreshChatControls();
            syncOptionButtons();
        }

        // ---- start session ----
        async function startSession() {
            var addressText = String(chatAddressInput.value || '').trim();

            resetChat();
            // Auto-expand when starting
            setExpanded(true);

            // Hide address section — it's now in the chat flow
            if (chatAddressSection) chatAddressSection.style.display = 'none';

            if (addressText) {
                CHAT.addressText = addressText;
                appendMsg('user', 'My property: ' + addressText);
            } else {
                appendMsg('user', 'I\'d like to create a new opportunity.');
            }

            setProgressPip('type');
            if (panelTitle) panelTitle.textContent = 'Type';

            var loadingEl = appendLoadingDots();
            CHAT.loading = true;
            refreshChatControls();

            try {
                if (addressText) {
                    await ensurePropertyIntel();
                }

                removeLoadingDots();

                if (CHAT.propertyIntel && !CHAT.propertyIntel.demo) {
                    appendPropertyReport(CHAT.propertyIntel);
                    appendMsg('bot', 'Property data pulled. Now let\'s build your opportunity posting — what type is this?');
                } else if (addressText) {
                    appendMsg('bot', 'Got it! Let\'s build your opportunity.\n\nWhat type of posting is this?');
                } else {
                    appendMsg('bot', 'Let\'s build your opportunity.\n\nWhat type of posting is this?');
                }

                // If there's an explore focus, do a quick AI feasibility call and show it first
                if (addressText && CHAT.exploreFocusText) {
                    var dotsEl2 = appendLoadingDots();
                    try {
                        var feasData = await callFeasibility([]);
                        CHAT.feasibilitySummary = feasData.feasibilitySummary || '';
                        removeLoadingDots();
                        if (CHAT.feasibilitySummary) {
                            appendMsg('bot', CHAT.feasibilitySummary);
                            CHAT.thread.push({ role: 'assistant', content: CHAT.feasibilitySummary });
                        }
                    } catch (e) {
                        removeLoadingDots();
                    }
                }

                CHAT.sessionActive = true;
                setTimeout(function() { appendTypeCard(); }, 200);

            } catch (err) {
                removeLoadingDots();
                var errMsg = '**Couldn\'t load property data:** ' + (err.message || err);
                if (err.httpStatus === 405 || err.httpStatus === 404) {
                    errMsg += '\n\nNo problem — let\'s build your opportunity without it.';
                }
                appendMsg('bot', errMsg);
                CHAT.sessionActive = true;
                setTimeout(function() { appendTypeCard(); }, 200);
            } finally {
                CHAT.loading = false;
                refreshChatControls();
            }
        }

        // ---- follow-up chat (after session) ----
        async function postUserTurn(text) {
            if (!CHAT.sessionActive || CHAT.loading) return;
            text = String(text || '').trim();
            if (!text) return;

            appendMsg('user', text);
            CHAT.thread.push({ role: 'user', content: text });

            CHAT.loading = true;
            refreshChatControls();
            var loadEl = appendLoadingDots();

            try {
                var data = await callFeasibility(CHAT.thread);
                var reply = data.feasibilitySummary || '';
                CHAT.feasibilitySummary = reply;
                removeLoadingDots();
                appendMsg('bot', reply);
                CHAT.thread.push({ role: 'assistant', content: reply });
            } catch (err) {
                CHAT.thread.pop();
                removeLoadingDots();
                var errMsg = '**Message not sent:** ' + (err.message || err);
                if (err.httpStatus === 405 || err.httpStatus === 404) {
                    errMsg += '\n\nCheck that **bricksnexus-api-base** points to your deployed app.';
                }
                appendMsg('bot', errMsg);
            } finally {
                CHAT.loading = false;
                refreshChatControls();
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

        // ---- event listeners ----
        if (chatLauncher) chatLauncher.addEventListener('click', openChatbox);
        if (chatPrompt) chatPrompt.addEventListener('click', openChatbox);
        chatClose.addEventListener('click', closeChatbox);

        if (chatExpandBtn) {
            chatExpandBtn.addEventListener('click', function() {
                setExpanded(!isExpanded);
            });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isExpanded) setExpanded(false);
        });

        startBtn.addEventListener('click', startSession);

        chatAddressInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); startSession(); }
        });

        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendFollowUp(); }
        });

        sendBtn.addEventListener('click', sendFollowUp);

        applyBtn.addEventListener('click', function() {
            applyInlineToForm();
            // Scroll to form after applying
            var formEl = document.getElementById('opportunity-builder-form');
            if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            closeChatbox();
        });

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
                    var q = 'I want to explore **' + label + '** for this address.\n\n' +
                        (focus ? focus + '\n\n' : '') + 'What should I know in plain language?';
                    postUserTurn(q);
                }
            });
        }

        refreshChatControls();
        syncOptionButtons();
        setProgressPip('address');
    })();



    openStep('type');
    refreshPublishState();
});
