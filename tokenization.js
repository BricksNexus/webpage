(function() {
    'use strict';

    var app = window.BricksNexusApp;
    var defaultTokenData = {
        propertyName: 'Miami Harbor Residences',
        location: 'Wynwood, Miami, Florida',
        tokenPrice: 50,
        estimatedAnnualYield: 12.5,
        minimumInvestment: 1000,
        fundingGoal: 2500000,
        raisedAmount: 1687500,
        smartContractAddress: '0x7b39cB426d8A9E1E0f1966e0F4FbF7091D3c54Ee',
        network: 'Polygon',
        explorerUrl: 'https://polygonscan.com/address/0x7b39cB426d8A9E1E0f1966e0F4FbF7091D3c54Ee',
        description:
            'Miami Harbor Residences is a mixed-use waterfront redevelopment positioned for rental growth and long-term appreciation. The asset combines stabilized residential income, curated retail frontage, and a phased upgrade plan designed to unlock NOI expansion.',
        investmentThesis: [
            'Prime submarket with sustained residential absorption and strong tenant demand.',
            'Refinancing and cap-rate compression potential after renovation milestones.',
            'Tokenized structure creates a lower barrier to entry for qualified investors.'
        ],
        gallery: [
            {
                id: 'gallery-1',
                title: 'Aerial View',
                caption: 'Aerial view of the mixed-use waterfront asset.',
                image: "linear-gradient(135deg, rgba(26,43,60,0.92), rgba(45,156,219,0.48)), url('https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80')"
            },
            {
                id: 'gallery-2',
                title: 'Lobby Concept',
                caption: 'Refreshed hospitality-driven arrival experience.',
                image: "linear-gradient(135deg, rgba(16,32,47,0.82), rgba(45,156,219,0.38)), url('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80')"
            },
            {
                id: 'gallery-3',
                title: 'Retail Frontage',
                caption: 'Ground-floor activation designed for premium tenancy.',
                image: "linear-gradient(135deg, rgba(16,32,47,0.84), rgba(45,156,219,0.34)), url('https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80')"
            }
        ],
        capitalStack: [
            { label: 'Senior Debt', value: 62, color: '#1A2B3C' },
            { label: 'Sponsor Equity', value: 18, color: '#2D9CDB' },
            { label: 'Tokenized Equity', value: 20, color: '#6FCF97' }
        ],
        projectedCashFlow: [
            { year: 'Year 1', revenue: '$382,000', distributions: '$128,000', totalReturn: '8.3%' },
            { year: 'Year 2', revenue: '$417,500', distributions: '$156,000', totalReturn: '10.4%' },
            { year: 'Year 3', revenue: '$449,000', distributions: '$181,500', totalReturn: '12.1%' },
            { year: 'Year 4', revenue: '$476,000', distributions: '$202,000', totalReturn: '13.5%' },
            { year: 'Year 5', revenue: '$514,000', distributions: '$231,000', totalReturn: '15.4%' }
        ],
        documents: [
            { id: 'doc-1', name: 'Independent Appraisal', type: 'PDF', size: '2.4 MB' },
            { id: 'doc-2', name: 'Private Placement Memorandum', type: 'PDF', size: '5.1 MB' },
            { id: 'doc-3', name: 'Title Deed & Legal Pack', type: 'PDF', size: '3.7 MB' }
        ]
    };

    var tokenData = resolveTokenData();

    function byId(id) {
        return document.getElementById(id);
    }

    function formatCurrency(value) {
        return '$' + Number(value || 0).toLocaleString();
    }

    function truncateAddress(value) {
        if (!value) return 'Pending deployment';
        if (value === 'Pending deployment') return value;
        if (value.length <= 16) return value;
        return value.slice(0, 8) + '...' + value.slice(-6);
    }

    function getQueryId() {
        try {
            return new URLSearchParams(window.location.search).get('id') || '';
        } catch (error) {
            return '';
        }
    }

    function resolveTokenData() {
        var selectedId = getQueryId();
        var submissions;

        try {
            submissions = JSON.parse(localStorage.getItem('bricksnexus_tokenization_submissions') || '[]');
        } catch (error) {
            console.error('Failed to parse tokenization submissions', error);
            submissions = [];
        }

        if (!Array.isArray(submissions) || !submissions.length) {
            return defaultTokenData;
        }

        var entry = submissions.find(function(item) {
            return String(item.id || '') === String(selectedId || '');
        }) || submissions[0];

        if (!entry || !entry.submissionData) {
            return defaultTokenData;
        }

        return normalizeSubmission(entry);
    }

    function normalizeSubmission(entry) {
        var submission = entry.submissionData || {};
        var property = submission.property || {};
        var financials = submission.financials || {};
        var legalCompliance = submission.legalCompliance || {};
        var mediaDocuments = submission.mediaDocuments || {};
        var tokenPrice = Number(financials.tokenPrice || 0);
        var annualYield = Number(financials.estimatedAnnualYield || 0);
        var fundingGoal = Number(financials.totalCapitalRaise || 0);
        var contractAddress = legalCompliance.smartContractAddress || '';

        return {
            propertyName: property.propertyName || defaultTokenData.propertyName,
            location: property.address || defaultTokenData.location,
            tokenPrice: tokenPrice || defaultTokenData.tokenPrice,
            estimatedAnnualYield: annualYield || defaultTokenData.estimatedAnnualYield,
            minimumInvestment: Math.max(1000, tokenPrice ? tokenPrice * 20 : 1000),
            fundingGoal: fundingGoal || defaultTokenData.fundingGoal,
            raisedAmount: 0,
            smartContractAddress: contractAddress || 'Pending deployment',
            network: 'Polygon',
            explorerUrl: contractAddress ? 'https://polygonscan.com/address/' + contractAddress : '#',
            description: property.description || 'A new tokenization opportunity submitted through the BricksNexus issuance workflow.',
            investmentThesis: buildInvestmentThesis(property, financials, legalCompliance),
            gallery: buildGallery(property, mediaDocuments),
            capitalStack: buildCapitalStack(property),
            projectedCashFlow: buildCashFlow(fundingGoal || defaultTokenData.fundingGoal, annualYield || defaultTokenData.estimatedAnnualYield),
            documents: buildDocuments(mediaDocuments, legalCompliance),
            sourceId: entry.id || '',
            ownerUserId: submission.creatorUserId || '',
            ownerName: submission.creatorName || 'Issuer'
        };
    }

    function buildInvestmentThesis(property, financials, legalCompliance) {
        return [
            (property.assetType || 'Real estate asset') + ' positioned for marketplace distribution and investor diligence.',
            'Target annual yield of ' + (financials.estimatedAnnualYield || defaultTokenData.estimatedAnnualYield) + '% with ' + ((financials.dividendFrequency || 'Quarterly').toLowerCase()) + ' distributions.',
            'Structured under ' + (legalCompliance.regulationType || 'verified regulation pathway') + ' via ' + (legalCompliance.spvName || 'a dedicated SPV') + '.'
        ];
    }

    function buildGallery(property, mediaDocuments) {
        var files = Array.isArray(mediaDocuments.propertyImages) ? mediaDocuments.propertyImages : [];
        var titles = files.length ? files.map(function(file, index) {
            return {
                id: file.id || ('gallery-' + index),
                title: file.name || ('Image ' + (index + 1)),
                caption: 'Uploaded asset media for ' + (property.propertyName || 'this tokenization opportunity') + '.'
            };
        }) : [
            { id: 'gallery-1', title: 'Hero View', caption: 'Primary branded preview for the tokenized asset.' },
            { id: 'gallery-2', title: 'Asset Overview', caption: 'High-level overview frame for marketplace presentation.' },
            { id: 'gallery-3', title: 'Investor Snapshot', caption: 'Detail-oriented slide for diligence and fundraising.' }
        ];

        return titles.slice(0, 3).map(function(item, index) {
            var backgrounds = [
                "linear-gradient(135deg, rgba(26,43,60,0.92), rgba(45,156,219,0.54))",
                "linear-gradient(135deg, rgba(16,32,47,0.88), rgba(39,174,96,0.38))",
                "linear-gradient(135deg, rgba(26,43,60,0.88), rgba(99,194,246,0.42))"
            ];

            return {
                id: item.id,
                title: item.title,
                caption: item.caption,
                image: backgrounds[index % backgrounds.length]
            };
        });
    }

    function buildCapitalStack(property) {
        if ((property.assetType || '').toLowerCase() === 'industrial') {
            return [
                { label: 'Senior Debt', value: 58, color: '#1A2B3C' },
                { label: 'Sponsor Equity', value: 22, color: '#2D9CDB' },
                { label: 'Tokenized Equity', value: 20, color: '#6FCF97' }
            ];
        }

        if ((property.assetType || '').toLowerCase() === 'commercial') {
            return [
                { label: 'Senior Debt', value: 60, color: '#1A2B3C' },
                { label: 'Sponsor Equity', value: 20, color: '#2D9CDB' },
                { label: 'Tokenized Equity', value: 20, color: '#6FCF97' }
            ];
        }

        return [
            { label: 'Senior Debt', value: 55, color: '#1A2B3C' },
            { label: 'Sponsor Equity', value: 20, color: '#2D9CDB' },
            { label: 'Tokenized Equity', value: 25, color: '#6FCF97' }
        ];
    }

    function buildCashFlow(fundingGoal, annualYield) {
        var rows = [];
        var baseRevenue = Math.round(fundingGoal * 0.14);
        var yieldValue = Number(annualYield || 0);

        for (var year = 1; year <= 5; year += 1) {
            var growthMultiplier = 1 + ((year - 1) * 0.05);
            var revenue = Math.round(baseRevenue * growthMultiplier);
            var distributions = Math.round(fundingGoal * ((yieldValue / 100) * (0.78 + ((year - 1) * 0.04))));
            rows.push({
                year: 'Year ' + year,
                revenue: formatCurrency(revenue),
                distributions: formatCurrency(distributions),
                totalReturn: (yieldValue + ((year - 1) * 1.1)).toFixed(1) + '%'
            });
        }

        return rows;
    }

    function buildDocuments(mediaDocuments, legalCompliance) {
        var files = Array.isArray(mediaDocuments.legalDocuments) ? mediaDocuments.legalDocuments : [];
        if (!files.length) {
            return [
                { id: 'doc-ppm', name: 'Private Placement Memorandum', type: 'PDF', size: 'Pending upload' },
                { id: 'doc-title', name: 'Title & Entity Structure', type: legalCompliance.regulationType || 'Legal', size: 'Pending upload' }
            ];
        }

        return files.map(function(file, index) {
            return {
                id: file.id || ('doc-' + index),
                name: file.name || ('Document ' + (index + 1)),
                type: inferFileType(file),
                size: formatFileSize(file.size)
            };
        });
    }

    function inferFileType(file) {
        var source = (file.type || file.name || '').toLowerCase();
        if (source.indexOf('pdf') !== -1) return 'PDF';
        if (source.indexOf('png') !== -1 || source.indexOf('jpg') !== -1 || source.indexOf('jpeg') !== -1) return 'Image';
        return 'Document';
    }

    function formatFileSize(size) {
        if (!size) return 'Uploaded';
        if (size >= 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB';
        return Math.max(1, Math.round(size / 1024)) + ' KB';
    }

    function renderHeaderData() {
        byId('token-property-name').textContent = tokenData.propertyName;
        byId('token-summary-title').textContent = tokenData.propertyName;
        byId('token-location').textContent = tokenData.location;
        byId('token-description').textContent = tokenData.description;
        byId('token-map-placeholder').innerHTML = 'Map Placeholder<br>' + tokenData.location;
        byId('token-price').textContent = formatCurrency(tokenData.tokenPrice);
        byId('token-yield').textContent = tokenData.estimatedAnnualYield + '%';
        byId('token-minimum-investment').textContent = 'Minimum Investment: ' + formatCurrency(tokenData.minimumInvestment);
        byId('token-raised-amount').textContent = formatCurrency(tokenData.raisedAmount) + ' raised';
        byId('token-target-amount').textContent = formatCurrency(tokenData.fundingGoal) + ' target';
        byId('token-network').textContent = tokenData.network;
        byId('token-contract-address').textContent = truncateAddress(tokenData.smartContractAddress);
        byId('token-explorer-link').href = tokenData.explorerUrl || '#';
        byId('token-explorer-link').setAttribute('aria-disabled', tokenData.explorerUrl === '#' ? 'true' : 'false');
        document.title = tokenData.propertyName + ' · Tokenization Opportunity · BricksNexus';
    }

    function renderGallery() {
        var main = byId('token-gallery-main');
        var thumbs = byId('token-gallery-thumbs');
        if (!main || !thumbs) return;

        function setActive(index) {
            var item = tokenData.gallery[index];
            if (!item) return;
            main.style.backgroundImage = item.image;
            byId('token-gallery-caption-text').textContent = item.caption;
            Array.prototype.forEach.call(thumbs.querySelectorAll('.token-thumb'), function(thumb, thumbIndex) {
                thumb.classList.toggle('active', thumbIndex === index);
            });
        }

        thumbs.innerHTML = '';
        tokenData.gallery.forEach(function(item, index) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'token-thumb' + (index === 0 ? ' active' : '');
            button.innerHTML =
                '<div class="token-thumb-image" style="background-image:' + item.image + ';"></div>' +
                '<div class="token-thumb-label">' + item.title + '</div>';
            button.addEventListener('click', function() {
                setActive(index);
            });
            thumbs.appendChild(button);
        });

        setActive(0);
    }

    function renderProgress() {
        var percent = tokenData.fundingGoal > 0
            ? Math.min(100, Math.round((tokenData.raisedAmount / tokenData.fundingGoal) * 100))
            : 0;
        byId('token-progress-percent').textContent = percent + '% sold';
        requestAnimationFrame(function() {
            byId('token-progress-fill').style.width = percent + '%';
        });
    }

    function renderThesis() {
        var list = byId('token-thesis-list');
        if (!list) return;
        list.innerHTML = '';
        tokenData.investmentThesis.forEach(function(item) {
            var li = document.createElement('li');
            li.textContent = item;
            list.appendChild(li);
        });
    }

    function renderCapitalStack() {
        var bar = byId('token-capital-bar');
        var legend = byId('token-capital-legend');
        if (!bar || !legend) return;

        bar.innerHTML = '';
        legend.innerHTML = '';

        tokenData.capitalStack.forEach(function(segment) {
            var part = document.createElement('div');
            part.className = 'token-capital-segment';
            part.style.width = segment.value + '%';
            part.style.backgroundColor = segment.color;
            bar.appendChild(part);

            var item = document.createElement('li');
            item.innerHTML =
                '<div class="token-capital-label"><span class="token-capital-dot" style="background:' + segment.color + ';"></span><span>' + segment.label + '</span></div>' +
                '<span class="token-capital-value">' + segment.value + '%</span>';
            legend.appendChild(item);
        });
    }

    function renderCashFlow() {
        var body = byId('token-cashflow-body');
        if (!body) return;
        body.innerHTML = '';
        tokenData.projectedCashFlow.forEach(function(row) {
            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td>' + row.year + '</td>' +
                '<td>' + row.revenue + '</td>' +
                '<td>' + row.distributions + '</td>' +
                '<td>' + row.totalReturn + '</td>';
            body.appendChild(tr);
        });
    }

    function renderDocuments() {
        var list = byId('token-doc-list');
        if (!list) return;
        list.innerHTML = '';

        tokenData.documents.forEach(function(doc) {
            var row = document.createElement('div');
            row.className = 'token-doc-row';
            row.innerHTML =
                '<div class="token-doc-meta">' +
                '<div class="token-doc-icon">' + doc.type + '</div>' +
                '<div><strong>' + doc.name + '</strong><p>' + doc.type + ' · ' + doc.size + '</p></div>' +
                '</div>' +
                '<button type="button" class="token-doc-download">View metadata</button>';
            list.appendChild(row);
        });
    }

    function setupTabs() {
        var tabs = byId('token-tabs');
        if (!tabs) return;
        tabs.addEventListener('click', function(event) {
            var button = event.target.closest('.token-tab');
            if (!button) return;
            var target = button.getAttribute('data-tab');
            Array.prototype.forEach.call(document.querySelectorAll('.token-tab'), function(tab) {
                tab.classList.toggle('active', tab === button);
            });
            Array.prototype.forEach.call(document.querySelectorAll('.token-tab-panel'), function(panel) {
                var isActive = panel.id === 'token-panel-' + target;
                panel.classList.toggle('active', isActive);
                panel.hidden = !isActive;
            });
        });
    }

    function setupCalculator() {
        var input = byId('investment-amount');
        if (!input) return;

        function update() {
            var amount = Number(input.value || 0);
            var monthlyIncome = (amount * (tokenData.estimatedAnnualYield / 100)) / 12;
            var totalReturn = amount * (1 + tokenData.estimatedAnnualYield / 100);
            var tokenCount = tokenData.tokenPrice > 0 ? amount / tokenData.tokenPrice : 0;

            byId('calc-monthly-income').textContent = '$' + monthlyIncome.toFixed(2);
            byId('calc-total-return').textContent = '$' + totalReturn.toFixed(2);
            byId('calc-token-count').textContent = tokenCount.toFixed(1);
        }

        input.addEventListener('input', update);
        update();
    }

    function setupInvestorInquiry() {
        var investBtn = byId('token-invest-btn');
        var messageBtn = byId('token-message-btn');
        if (!investBtn || !messageBtn || !app) return;

        function openThread(actionType) {
            if (!tokenData.sourceId) return;
            if (!app.isAuthenticated()) {
                app.requireAuth('tokenization.html?id=' + encodeURIComponent(tokenData.sourceId));
                return;
            }

            var thread = app.openCardThread({
                cardId: tokenData.sourceId,
                cardType: 'tokenization',
                cardTitle: tokenData.propertyName || 'Tokenization opportunity',
                cardLabel: 'Tokenization',
                ownerUserId: tokenData.ownerUserId || '',
                ownerName: tokenData.ownerName || 'Issuer',
                actionType: actionType || 'message'
            });
            if (!thread) return;
            window.location.href = 'dashboard.html?panel=messages&thread=' + encodeURIComponent(thread.id);
        }

        if (!tokenData.sourceId) {
            investBtn.disabled = true;
            messageBtn.disabled = true;
            investBtn.title = 'Messaging is available for published tokenization submissions.';
            messageBtn.title = 'Messaging is available for published tokenization submissions.';
            return;
        }

        investBtn.addEventListener('click', function() {
            openThread('invest');
        });
        messageBtn.addEventListener('click', function() {
            openThread('message');
        });
    }

    renderHeaderData();
    renderGallery();
    renderProgress();
    renderThesis();
    renderCapitalStack();
    renderCashFlow();
    renderDocuments();
    setupTabs();
    setupCalculator();
    setupInvestorInquiry();
})();
