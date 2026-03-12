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
    openStep('type');
    refreshPublishState();
});
