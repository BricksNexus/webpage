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
    // Opportunity Explorer (chatbot)
    // ------------------------------
    (function initOpportunityExplorerChatbot() {
        var chatAddressInput = getInput('opp-chat-address');
        var analyzeBtn = getInput('opp-chat-analyze-btn');
        var applyBtn = getInput('opp-chat-apply-btn');
        var chatLog = getInput('opp-chat-log');
        var chatActions = getInput('opp-chat-actions');

        if (!chatAddressInput || !analyzeBtn || !applyBtn || !chatLog || !chatActions) return;

        var CHAT = {
            state: 'idle',
            addressText: '',
            inferred: null, // { city, region, assetTypeKey, occupancy }
            plan: null, // { strategyKey, strategyLabel, desiredUnits, readinessLabel }
            ready: false
        };

        function todayISO() {
            var d = new Date();
            var yyyy = d.getFullYear();
            var mm = String(d.getMonth() + 1).padStart(2, '0');
            var dd = String(d.getDate()).padStart(2, '0');
            return yyyy + '-' + mm + '-' + dd;
        }

        function addMonthsToISO(plusMonths) {
            var d = new Date();
            d.setMonth(d.getMonth() + plusMonths);
            var yyyy = d.getFullYear();
            var mm = String(d.getMonth() + 1).padStart(2, '0');
            var dd = String(d.getDate()).padStart(2, '0');
            return yyyy + '-' + mm + '-' + dd;
        }

        function parseAddressParts(addressText) {
            var raw = String(addressText || '').trim();
            if (!raw) return { city: '', region: '' };

            var parts = raw.split(',').map(function(p) { return String(p).trim(); }).filter(Boolean);

            // Common format: "... , City, ST ZIP"
            var region = '';
            var city = '';
            if (parts.length >= 2) {
                var last = parts[parts.length - 1];
                var regionMatch = last.match(/\b([A-Za-z]{2})\b/);
                region = regionMatch ? regionMatch[1].toUpperCase() : '';

                // city is typically the element before the region part
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

        function appendMsg(role, text) {
            var msg = document.createElement('div');
            msg.className = 'builder-chat-msg ' + (role === 'user' ? 'user' : 'bot');
            var bubble = document.createElement('div');
            bubble.className = 'builder-chat-bubble';
            bubble.innerHTML = escapeHtml(text);
            msg.appendChild(bubble);
            chatLog.appendChild(msg);
            chatLog.scrollTop = chatLog.scrollHeight;
        }

        function setChatActions(actions) {
            chatActions.innerHTML = '';
            if (!actions || !actions.length) return;

            actions.forEach(function(action) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'builder-explorer-action';
                btn.textContent = action.label;
                btn.setAttribute('data-chat-action', action.key);
                chatActions.appendChild(btn);
            });
        }

        function resetChat() {
            CHAT.state = 'idle';
            CHAT.addressText = '';
            CHAT.inferred = null;
            CHAT.plan = null;
            CHAT.ready = false;
            chatLog.innerHTML = '';
            chatActions.innerHTML = '';
            applyBtn.disabled = true;
        }

        function formatMoneyK(amount) {
            var safe = Math.max(0, Number(amount) || 0);
            var k = Math.round(safe / 1000);
            return '$' + k + 'k';
        }

        function computeBudgetRangeUSD(assetTypeKey, strategyKey, desiredUnits) {
            var units = Math.max(1, Number(desiredUnits) || 1);
            var base = { low: 200000, high: 450000 };

            if (strategyKey === 'adu') base = { low: 200000, high: 450000 };
            if (strategyKey === 'convert') base = { low: 300000, high: 650000 };
            if (strategyKey === 'addition') base = { low: 450000, high: 950000 };
            if (strategyKey === 'subdivision') base = { low: 150000, high: 350000 };

            // Slightly different weighting for land projects (subdivision)
            if (assetTypeKey === 'land' && strategyKey === 'subdivision') {
                base = { low: 160000, high: 380000 };
            }

            var lowTotal = base.low * units;
            var highTotal = base.high * units;

            // Round to the nearest $25k for readability
            var roundTo = 25000;
            lowTotal = Math.round(lowTotal / roundTo) * roundTo;
            highTotal = Math.round(highTotal / roundTo) * roundTo;

            return formatMoneyK(lowTotal) + ' - ' + formatMoneyK(highTotal);
        }

        function getStrategyOptionsForAssetType(assetTypeKey) {
            if (assetTypeKey === 'land') {
                return [
                    { key: 'subdivision', label: 'Subdivision (add new lots)' },
                    { key: 'addition', label: 'Build additional units (if zoning allows)' }
                ];
            }
            return [
                { key: 'adu', label: 'Add an ADU / accessory unit' },
                { key: 'convert', label: 'Convert existing space to add units' },
                { key: 'addition', label: 'Build additional units / expansion' }
            ];
        }

        function getHousingReadinessOptions(strategyKey) {
            // Light UX: user can choose speed/effort, we reflect it in the summary.
            if (strategyKey === 'subdivision') {
                return [
                    { key: 'permit_first', label: 'Feasibility first (permits + mapping)' },
                    { key: 'ready_to_build', label: 'Ready to build (existing site plan)' }
                ];
            }
            return [
                { key: 'permit_first', label: 'Feasibility first (concept + permits)' },
                { key: 'ready_to_build', label: 'Ready to build (design already underway)' }
            ];
        }

        function summarizeForOpportunity() {
            var inferred = CHAT.inferred;
            var plan = CHAT.plan;

            var assetLabel = inferred && inferred.assetTypeKey ? inferred.assetTypeKey.charAt(0).toUpperCase() + inferred.assetTypeKey.slice(1) : 'property';
            var occupancy = inferred && inferred.occupancy ? inferred.occupancy : 'varies';
            var strategyKey = plan ? plan.strategyKey : '';
            var strategyLabel = plan ? plan.strategyLabel : 'housing expansion';
            var desiredUnits = plan ? plan.desiredUnits : 1;
            var readinessLabel = plan && plan.readinessLabel ? plan.readinessLabel : 'standard timeline';

            var steps = [];
            if (strategyKey === 'adu') steps = ['ADU feasibility review', 'Conceptual design + code checks', 'Permit package + inspections', 'Construction and occupancy'];
            if (strategyKey === 'convert') steps = ['Space-use + code assessment', 'Design for unit conversion', 'Permit submissions + revisions', 'Build-out and final approvals'];
            if (strategyKey === 'addition') steps = ['Site capacity + setback analysis', 'Permit-ready plans', 'Construction timeline + inspections', 'Delivery and closeout'];
            if (strategyKey === 'subdivision') steps = ['Zoning/lot-splitting feasibility memo', 'Survey + infrastructure planning', 'Approvals (land use + utilities)', 'Final plat and build plan'];

            return {
                title: (desiredUnits > 1 ? desiredUnits + '-unit' : '1-unit') + ' ' + strategyLabel + ' - ' + (inferred.city || 'your area'),
                summary:
                    'Goal: create additional housing units based on local zoning, existing use, and occupancy.\n\n' +
                    'Address & context:\n' +
                    '- Asset type (inferred): ' + assetLabel + '\n' +
                    '- Current occupancy (assumption): ' + occupancy + '\n' +
                    '- Strategy: ' + strategyLabel + ' (' + desiredUnits + ' added unit' + (desiredUnits > 1 ? 's' : '') + ')\n\n' +
                    'Zoning/use/occupancy analysis (directional):\n' +
                    '- We recommend confirming allowed uses, density limits, setbacks, parking requirements, and any ADU/lot-split rules for the parcel.\n' +
                    '- Feasibility outcomes usually depend on whether the site qualifies for an overlay/waiver and how existing structures integrate with proposed units.\n\n' +
                    'Suggested next steps (' + readinessLabel + '):\n' +
                    steps.map(function(s, i) { return (i + 1) + '. ' + s; }).join('\n') + '\n\n' +
                    'Deliverables to request in this opportunity:\n' +
                    '- Zoning/use feasibility memo\n' +
                    '- Preliminary site plan / unit layout\n' +
                    '- Permit package plan (what to file, when, and by whom)\n' +
                    '- Construction schedule assumptions and cost range\n\n' +
                    'Note: This draft is not legal advice. Use local jurisdiction guidance (planning/zoning) to validate feasibility.',
                budget: computeBudgetRangeUSD(inferred.assetTypeKey, plan.strategyKey, plan.desiredUnits),
                city: inferred.city || '',
                region: inferred.region || ''
            };
        }

        function generateNeedsAndTerms() {
            var inferred = CHAT.inferred || {};
            var plan = CHAT.plan || {};
            var strategyLabel = plan.strategyLabel || 'housing expansion';

            var need = 'Request a zoning/use feasibility and design permitting team to evaluate ' + strategyLabel + ' for the provided address (assessing current use/occupancy and constraints).';
            var terms = 'Deliverables:\n- Zoning/use feasibility memo (allowed uses, density, setbacks, parking)\n- Preliminary unit layout / site plan\n- Permit roadmap (submittals, sequencing, lead disciplines)\n- High-level cost/timeline range for the proposed unit(s)';

            return { need: need, terms: terms };
        }

        function suggestTeamForProject() {
            var plan = CHAT.plan || {};
            var strategyKey = plan.strategyKey || 'adu';
            var inferred = CHAT.inferred || {};

            var base = ['Project Manager', 'General Contractor', 'Architect', 'Civil Engineer', 'Real Estate Lawyer'];

            if (strategyKey === 'subdivision') {
                return ['Surveyor', 'Civil Engineer', 'Real Estate Lawyer', 'Project Manager', 'General Contractor', 'Architect'];
            }

            if (inferred.assetTypeKey === 'apartment' || inferred.assetTypeKey === 'house') {
                base = base.concat(['Plumber', 'Electrician']);
            }
            if (strategyKey === 'adu') {
                return base.concat(['Plumber', 'Electrician']);
            }
            if (strategyKey === 'convert') {
                return base.concat(['Plumber', 'Electrician']);
            }
            if (strategyKey === 'addition') {
                return base.concat(['Plumber', 'Electrician']);
            }
            return base;
        }

        function applyAnalysisToForm() {
            var inferred = CHAT.inferred;
            var plan = CHAT.plan;
            if (!inferred || !plan) return;

            // If the user hasn't selected an opportunity type yet, infer it.
            // "Feasibility/permitting first" maps to a lighter "Exploring" posting,
            // while "Ready to build" maps to the full "Project" builder flow.
            if (!formState.type) {
                var inferredType = 'project';
                var readinessText = String(plan.readinessLabel || '');
                if (readinessText.toLowerCase().indexOf('feasibility') >= 0) inferredType = 'exploring';
                setSelectedType(inferredType);
                appendMsg('bot', 'I set your opportunity type to: ' + inferredType.charAt(0).toUpperCase() + inferredType.slice(1) + '.');
            }

            var result = summarizeForOpportunity();
            setValue('opp-title', result.title);
            setValue('opp-summary', result.summary);
            // If parsing failed, don't overwrite any existing values.
            setValue('opp-city', result.city || getValue('opp-city'));
            setValue('opp-region', result.region || getValue('opp-region'));
            setValue('opp-budget', result.budget);
            setValue('opp-address', CHAT.addressText || getValue('opp-address'));

            // Fill needs step hints so non-project flows can continue.
            var needs = generateNeedsAndTerms();
            setValue('opp-simple-need', needs.need);
            setValue('opp-terms', needs.terms);

            // If user is on the full Project flow, also suggest property scopes, team, and a basic chronogram/financing.
            if (formState.type === 'project') {
                var assetTypeKey = inferred.assetTypeKey;
                setValue('opp-property-type', assetTypeKey);

                // Choose a few relevant property scope tags.
                var scopes = [];
                if (plan.strategyKey === 'subdivision') {
                    scopes = ['Sub-division', 'Rezoning', 'Land Clearing'];
                } else if (plan.strategyKey === 'adu' || plan.strategyKey === 'convert') {
                    scopes = ['Kitchen/Bath Remodel', 'Interior Design', 'Structural Repair'];
                    if (assetTypeKey === 'house' || assetTypeKey === 'apartment') scopes.unshift('Full Renovation');
                } else if (plan.strategyKey === 'addition') {
                    scopes = ['Structural Repair', 'Interior Design', 'Full Renovation'];
                }

                // Filter to valid options based on property type (PROPERTY_SCOPE_MAP).
                scopes = (PROPERTY_SCOPE_MAP[assetTypeKey] || []).filter(function(opt) {
                    return scopes.indexOf(opt) >= 0;
                });

                formState.projectScopes = scopes.slice();
                renderPropertyChecklist();

                formState.selectedProfessions = suggestTeamForProject();
                renderTeamChecklist();
                updateTeamWidget();

                // Basic chronogram suggestions (validateStep requires full rows for project flow).
                formState.chronogramRows = [
                    {
                        id: String(Date.now() + 1),
                        task_name: 'Zoning/use feasibility & constraints',
                        start_date: addMonthsToISO(0),
                        end_date: addMonthsToISO(2),
                        status: 'Pending'
                    },
                    {
                        id: String(Date.now() + 2),
                        task_name: 'Design + permit package preparation',
                        start_date: addMonthsToISO(2),
                        end_date: addMonthsToISO(4),
                        status: 'Pending'
                    },
                    {
                        id: String(Date.now() + 3),
                        task_name: 'Construction & inspections',
                        start_date: addMonthsToISO(4),
                        end_date: addMonthsToISO(10),
                        status: 'Pending'
                    }
                ];
                renderChronogramRows();

                // Financing model is required for the Project flow.
                setValue('opp-financing-model', 'hybrid');
            }

            // Keep the right-side tag/widget in sync for both project and non-project flows.
            updateTeamWidget();
            clearErrors();

            appendMsg('bot', 'Draft applied to the opportunity form. You can now continue to the next step.');
        }

        function handleAnalyze() {
            var addressText = chatAddressInput.value || '';
            addressText = String(addressText).trim();
            if (!addressText) {
                appendMsg('bot', 'Please enter an address to analyze.');
                return;
            }

            resetChat();
            CHAT.addressText = addressText;
            appendMsg('user', addressText);

            var parts = parseAddressParts(addressText);
            var assetTypeKey = inferAssetTypeKey(addressText);

            // Directional assumption; user can override later via fields.
            var occupancyAssumption = inferOccupancyLabel(addressText);

            CHAT.inferred = {
                city: parts.city,
                region: parts.region,
                assetTypeKey: assetTypeKey,
                occupancy: occupancyAssumption
            };

            CHAT.state = 'occupancy';
            CHAT.plan = null;

            appendMsg('bot',
                'Thanks. Based on the address, I infer:\n' +
                '- Property type (directional): ' + assetTypeKey + '\n' +
                '- Current occupancy (assumption): ' + occupancyAssumption + '\n\n' +
                'Which best matches the property today?'
            );

            setChatActions([
                { key: 'occ_owner', label: 'Owner-occupied (home)' },
                { key: 'occ_rented', label: 'Rented / multi-tenant' },
                { key: 'occ_vacant', label: 'Vacant / underutilized' }
            ]);
        }

        function setOccupancyFromAction(key) {
            var occupancy = 'Owner-occupied (home)';
            if (key === 'occ_rented') occupancy = 'Rented / multi-tenant';
            if (key === 'occ_vacant') occupancy = 'Vacant / underutilized';
            CHAT.inferred.occupancy = occupancy;
        }

        function handleOccupancyChoice(actionKey) {
            setOccupancyFromAction(actionKey);
            appendMsg('bot',
                'Got it. For this occupancy, the most likely paths depend on zoning/land-use rules and whether the site can support additional units.\n\n' +
                'How would you like to expand housing?'
            );
            CHAT.state = 'strategy';

            var strategyOptions = getStrategyOptionsForAssetType(CHAT.inferred.assetTypeKey);
            var mapped = strategyOptions.map(function(opt) {
                // Ensure we use strategy keys consistent with our budget/team logic.
                var keyMap = { 'subdivision': 'subdivision', 'addition': 'addition', 'adu': 'adu', 'convert': 'convert' };
                // Normalize label -> key if needed.
                if (opt.key === 'subdivision' || opt.key === 'addition' || opt.key === 'adu' || opt.key === 'convert') return opt;
                return { key: keyMap[opt.key] || opt.key, label: opt.label };
            });
            setChatActions(mapped);
        }

        function strategyLabelForKey(strategyKey) {
            if (strategyKey === 'adu') return 'ADU / accessory unit';
            if (strategyKey === 'convert') return 'conversion-based unit addition';
            if (strategyKey === 'addition') return 'expansion-based unit addition';
            if (strategyKey === 'subdivision') return 'subdivision housing';
            return 'housing expansion';
        }

        function handleStrategyChoice(strategyKey) {
            var strategyLabel = strategyLabelForKey(strategyKey);
            CHAT.plan = {
                strategyKey: strategyKey,
                strategyLabel: strategyLabel,
                desiredUnits: 1,
                readinessLabel: 'standard timeline'
            };

            appendMsg('bot',
                'Great. Next, how many additional unit(s) are you aiming for?'
            );
            CHAT.state = 'units';

            setChatActions([
                { key: 'units_1', label: '1 unit' },
                { key: 'units_2', label: '2 units' },
                { key: 'units_3', label: '3 units' },
                { key: 'units_4p', label: '4+ units' }
            ]);
        }

        function handleUnitsChoice(unitsKey) {
            if (!CHAT.plan) return;
            var units = 1;
            if (unitsKey === 'units_2') units = 2;
            if (unitsKey === 'units_3') units = 3;
            if (unitsKey === 'units_4p') units = 4;
            CHAT.plan.desiredUnits = units;

            // Readiness: small extra question to make output feel more “zoning-realistic”.
            appendMsg('bot', 'Do you want to start with feasibility/permitting first, or are you ready to build based on existing work?');
            CHAT.state = 'readiness';

            setChatActions(getHousingReadinessOptions(CHAT.plan.strategyKey));
        }

        function handleReadinessChoice(readinessKey) {
            if (!CHAT.plan) return;
            if (readinessKey === 'ready_to_build') CHAT.plan.readinessLabel = 'ready-to-build assumptions';
            else CHAT.plan.readinessLabel = 'feasibility + permitting first';

            CHAT.ready = true;
            var result = summarizeForOpportunity();
            appendMsg('bot',
                'I prepared a draft based on your choices.\n' +
                '- Suggested budget: ' + result.budget + '\n' +
                '- Suggested title: ' + result.title + '\n\n' +
                'Click “Apply to Opportunity” to fill the form.'
            );
            applyBtn.disabled = false;
            CHAT.state = 'ready';
        }

        analyzeBtn.addEventListener('click', handleAnalyze);
        chatAddressInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAnalyze();
            }
        });

        chatActions.addEventListener('click', function(e) {
            var target = e.target;
            if (!target || !target.getAttribute) return;
            if (!target.getAttribute('data-chat-action')) return;

            var actionKey = target.getAttribute('data-chat-action');

            if (CHAT.state === 'occupancy') {
                handleOccupancyChoice(actionKey);
                return;
            }
            if (CHAT.state === 'strategy') {
                handleStrategyChoice(actionKey);
                return;
            }
            if (CHAT.state === 'units') {
                handleUnitsChoice(actionKey);
                return;
            }
            if (CHAT.state === 'readiness') {
                handleReadinessChoice(actionKey);
                return;
            }
        });

        applyBtn.addEventListener('click', function() {
            if (!CHAT.ready) return;
            applyAnalysisToForm();
        });
    })();

    openStep('type');
    refreshPublishState();
});
