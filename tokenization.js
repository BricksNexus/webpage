(function() {
    'use strict';

    var tokenData = {
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

    function byId(id) {
        return document.getElementById(id);
    }

    function formatCurrency(value) {
        return '$' + Number(value || 0).toLocaleString();
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
        byId('token-contract-address').textContent = tokenData.smartContractAddress.slice(0, 8) + '...' + tokenData.smartContractAddress.slice(-6);
        byId('token-explorer-link').href = tokenData.explorerUrl;
    }

    function renderGallery() {
        var main = byId('token-gallery-main');
        var thumbs = byId('token-gallery-thumbs');
        if (!main || !thumbs) return;

        function setActive(index) {
            var item = tokenData.gallery[index];
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
        var percent = Math.min(100, Math.round((tokenData.raisedAmount / tokenData.fundingGoal) * 100));
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
                '<div class="token-doc-icon">PDF</div>' +
                '<div><strong>' + doc.name + '</strong><p>' + doc.type + ' · ' + doc.size + '</p></div>' +
                '</div>' +
                '<button type="button" class="token-doc-download">Download</button>';
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

    renderHeaderData();
    renderGallery();
    renderProgress();
    renderThesis();
    renderCapitalStack();
    renderCashFlow();
    renderDocuments();
    setupTabs();
    setupCalculator();
})();
