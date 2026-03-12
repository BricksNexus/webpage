document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    var app = window.BricksNexusApp;
    var currentUser = app.getCurrentUser();
    if (!currentUser) return;

    var SERVICE_MAP = {
        land: ['Surveyor', 'Civil Engineer', 'Land Use Attorney', 'Environmental Consultant', 'Geotechnical Engineer'],
        house: ['Architect', 'Structural Engineer', 'General Contractor', 'Interior Designer', 'MEP Engineer'],
        apartment: ['Architect', 'Structural Engineer', 'Permit Expediter', 'MEP Engineer', 'Project Manager'],
        building: ['Architect', 'Facade Consultant', 'Structural Engineer', 'Construction Manager', 'Quantity Surveyor'],
        office: ['Architect', 'Workplace Designer', 'MEP Engineer', 'IT Infrastructure Consultant', 'GC / Fit-out Contractor']
    };

    var STEP_ORDER = ['type', 'details', 'needs', 'chronogram', 'financing', 'documents'];
    var query = new URLSearchParams(window.location.search);
    var editId = query.get('edit');
    var isDraftEdit = query.get('draft') === '1';
    var editingStorageKey = isDraftEdit ? app.KEYS.opportunityDrafts : app.KEYS.opportunities;
    var editingRecord = null;

    var formState = {
        type: '',
        selectedProfessions: [],
        chronogramRows: [],
        documents: [],
        imageDataUrl: ''
    };

    var progressButtons = Array.from(document.querySelectorAll('.builder-progress-step'));
    var sections = Array.from(document.querySelectorAll('.builder-section'));
    var unlockedStepIndex = 0;
    var activeStepIndex = 0;

    function getSection(stepName) {
        return document.querySelector('.builder-section[data-step="' + stepName + '"]');
    }

    function getProgressButton(stepName) {
        return document.querySelector('.builder-progress-step[data-target-step="' + stepName + '"]');
    }

    function getInput(id) {
        return document.getElementById(id);
    }

    function getValue(id) {
        var el = getInput(id);
        return el ? String(el.value || '').trim() : '';
    }

    function setValue(id, value) {
        var el = getInput(id);
        if (el) el.value = value || '';
    }

    function clearErrors() {
        document.querySelectorAll('.builder-error').forEach(function(el) {
            el.classList.remove('builder-error');
        });
    }

    function markError(id) {
        var el = getInput(id);
        if (el) el.classList.add('builder-error');
    }

    function setSelectedType(nextType) {
        formState.type = nextType || '';
        document.querySelectorAll('.builder-type-card').forEach(function(card) {
            var input = card.querySelector('input[type="radio"]');
            var isSelected = !!input && input.value === formState.type;
            if (input) input.checked = isSelected;
            card.classList.toggle('selected', isSelected);
        });
        toggleTypeVisibility();
        updateTeamWidget();
    }

    function toggleTypeVisibility() {
        var isProject = formState.type === 'project';
        document.querySelectorAll('.project-only').forEach(function(el) {
            el.classList.toggle('hidden', !isProject);
        });
        document.querySelectorAll('.simple-only').forEach(function(el) {
            el.classList.toggle('hidden', isProject);
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
    }

    function markStepDone(stepName, done) {
        var section = getSection(stepName);
        var button = getProgressButton(stepName);
        if (section) section.classList.toggle('done', !!done);
        if (button) button.classList.toggle('done', !!done);
    }

    function updateUnlockedStep(nextIndex) {
        unlockedStepIndex = Math.max(unlockedStepIndex, nextIndex);
    }

    function validateStep(stepName, highlight) {
        var shouldHighlight = !!highlight;
        clearErrors();

        if (stepName === 'type') {
            if (!formState.type) return false;
            return true;
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
            if (formState.type === 'project' && !getValue('opp-property-type')) {
                valid = false;
                if (shouldHighlight) markError('opp-property-type');
            }
            return valid;
        }

        if (stepName === 'needs') {
            if (formState.type === 'project') {
                return formState.selectedProfessions.length > 0;
            }
            var validSimpleNeed = !!getValue('opp-simple-need') || !!getValue('opp-terms');
            if (!validSimpleNeed && shouldHighlight) {
                markError('opp-simple-need');
                markError('opp-terms');
            }
            return validSimpleNeed;
        }

        if (stepName === 'chronogram') {
            if (formState.type !== 'project') return true;
            return formState.chronogramRows.length > 0 && formState.chronogramRows.every(function(row) {
                return row.task && row.startDate && row.endDate;
            });
        }

        if (stepName === 'financing') {
            if (formState.type !== 'project') return true;
            var validFinance = !!getValue('opp-financing-model');
            if (!validFinance && shouldHighlight) markError('opp-financing-model');
            return validFinance;
        }

        if (stepName === 'documents') {
            return formState.documents.every(function(item) {
                return !item.name || !!item.docType;
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

    function renderServiceChecklist() {
        var container = getInput('builder-service-checklist');
        if (!container) return;
        var propertyType = getValue('opp-property-type');
        var services = SERVICE_MAP[propertyType] || [];
        container.innerHTML = '';
        services.forEach(function(label) {
            var item = document.createElement('label');
            item.className = 'builder-check-item';
            if (formState.selectedProfessions.indexOf(label) >= 0) item.classList.add('selected');
            item.innerHTML = ''
                + '<input type="checkbox" value="' + label + '"' + (formState.selectedProfessions.indexOf(label) >= 0 ? ' checked' : '') + '>'
                + '<strong>' + label + '</strong>'
                + '<span>Add this profession to the live team widget.</span>';
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
            var li = document.createElement('li');
            li.textContent = entry;
            list.appendChild(li);
        });
    }

    function addChronogramRow(row) {
        formState.chronogramRows.push({
            id: row && row.id ? row.id : Date.now() + Math.random(),
            task: row && row.task ? row.task : '',
            startDate: row && row.startDate ? row.startDate : '',
            endDate: row && row.endDate ? row.endDate : ''
        });
        renderChronogramRows();
    }

    function renderChronogramRows() {
        var tbody = getInput('chronogram-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        formState.chronogramRows.forEach(function(row) {
            var tr = document.createElement('tr');
            tr.innerHTML = ''
                + '<td><input type="text" data-chrono-field="task" data-row-id="' + row.id + '" value="' + escapeHtml(row.task) + '" placeholder="Task name"></td>'
                + '<td><input type="date" data-chrono-field="startDate" data-row-id="' + row.id + '" value="' + escapeHtml(row.startDate) + '"></td>'
                + '<td><input type="date" data-chrono-field="endDate" data-row-id="' + row.id + '" value="' + escapeHtml(row.endDate) + '"></td>'
                + '<td><button type="button" class="builder-inline-btn" data-remove-row="' + row.id + '">Remove</button></td>';
            tbody.appendChild(tr);
        });
    }

    function escapeHtml(value) {
        var div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    }

    function readFiles(files) {
        var list = Array.from(files || []);
        if (!list.length) {
            formState.documents = [];
            renderDocuments();
            return Promise.resolve();
        }

        var readers = list.map(function(file, index) {
            return new Promise(function(resolve) {
                var item = {
                    id: Date.now() + index,
                    name: file.name,
                    size: file.size,
                    mimeType: file.type,
                    docType: '',
                    dataUrl: ''
                };

                if (file.type && file.type.indexOf('image/') === 0) {
                    var reader = new FileReader();
                    reader.onload = function(event) {
                        item.dataUrl = event.target && event.target.result ? event.target.result : '';
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

        return Promise.all(readers).then(function(results) {
            formState.documents = results;
            var firstImage = results.find(function(item) { return item.dataUrl; });
            if (firstImage) formState.imageDataUrl = firstImage.dataUrl;
            renderDocuments();
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
                + '<div>'
                + '<div class="builder-document-name">' + escapeHtml(doc.name) + '</div>'
                + '<div class="builder-document-size">' + Math.max(1, Math.round((doc.size || 0) / 1024)) + ' KB</div>'
                + '</div>'
                + '<select data-document-id="' + doc.id + '">'
                + '<option value="">Document Type</option>'
                + '<option value="deed"' + (doc.docType === 'deed' ? ' selected' : '') + '>Deed</option>'
                + '<option value="permit"' + (doc.docType === 'permit' ? ' selected' : '') + '>Permit</option>'
                + '<option value="photo"' + (doc.docType === 'photo' ? ' selected' : '') + '>Photo</option>'
                + '<option value="budget"' + (doc.docType === 'budget' ? ' selected' : '') + '>Budget</option>'
                + '<option value="other"' + (doc.docType === 'other' ? ' selected' : '') + '>Other</option>'
                + '</select>';
            container.appendChild(item);
        });
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
            simpleNeed: getValue('opp-simple-need'),
            financingModel: getValue('opp-financing-model'),
            capitalGap: getValue('opp-capital-gap'),
            serviceChecklist: formState.selectedProfessions.slice(),
            chronogram: formState.chronogramRows.slice(),
            documents: formState.documents.slice(),
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
        if (index >= 0) {
            list[index] = payload;
        } else {
            list.unshift(payload);
        }
        app.writeJson(targetKey, list);
    }

    function removeFromStorage(targetKey, itemId) {
        var list = app.readJson(targetKey, []);
        app.writeJson(targetKey, list.filter(function(item) {
            return String(item.id) !== String(itemId);
        }));
    }

    function saveOpportunity(status) {
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
        formState.selectedProfessions = Array.isArray(editingRecord.serviceChecklist) ? editingRecord.serviceChecklist.slice() : [];
        formState.chronogramRows = Array.isArray(editingRecord.chronogram) ? editingRecord.chronogram.slice() : [];
        formState.documents = Array.isArray(editingRecord.documents) ? editingRecord.documents.slice() : [];
        formState.imageDataUrl = editingRecord.imageDataUrl || '';

        setSelectedType(formState.type);
        renderServiceChecklist();
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
            renderServiceChecklist();
        });
    });

    progressButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            var target = button.getAttribute('data-target-step');
            openStep(target);
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

    getInput('opp-property-type').addEventListener('change', function() {
        formState.selectedProfessions = [];
        renderServiceChecklist();
        updateTeamWidget();
    });

    getInput('builder-service-checklist').addEventListener('change', function(event) {
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
        readFiles(event.target.files);
    });

    getInput('builder-documents-list').addEventListener('change', function(event) {
        var select = event.target.closest('select[data-document-id]');
        if (!select) return;
        var documentId = select.getAttribute('data-document-id');
        formState.documents = formState.documents.map(function(doc) {
            if (String(doc.id) === String(documentId)) {
                doc.docType = select.value;
            }
            return doc;
        });
    });

    getInput('opp-save-draft').addEventListener('click', function() {
        saveOpportunity('draft');
    });

    getInput('opp-submit').addEventListener('click', function() {
        saveOpportunity('published');
    });

    if (!editId) {
        addChronogramRow();
    }
    loadEditingRecord();
    if (!formState.type) {
        toggleTypeVisibility();
    }
    renderServiceChecklist();
    renderChronogramRows();
    renderDocuments();
    updateTeamWidget();
    openStep('type');
});
