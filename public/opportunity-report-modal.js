/**
 * Opportunity Report Modal — React island for post-opportunity.html
 *
 * Loaded after React + ReactDOM UMD scripts. Mounts into #opp-report-root.
 * Listens for the custom event 'opp:open-report' (detail: { reportId })
 * fired by post-opportunity.js when "View Opportunity Report" is clicked.
 *
 * Fetches the report from GET /api/opportunity-report/:id and renders it
 * in a full-window modal. All state is React state — no localStorage.
 */

(function () {
  'use strict';

  var React = window.React;
  var ReactDOM = window.ReactDOM;
  if (!React || !ReactDOM) return;

  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useCallback = React.useCallback;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function fmt(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return val.toLocaleString();
    return String(val);
  }

  function fmtDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return iso; }
  }

  function fmtPct(fraction) {
    if (fraction === null || fraction === undefined) return null;
    return Math.round(fraction * 100) + '%';
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

  // ── Sub-components ────────────────────────────────────────────────────────

  function SourceTag({ source, provenance }) {
    var label = source || provenance || null;
    if (!label) return null;
    var isUnverified = label === 'fetched-unverified';
    return h('span', {
      className: isUnverified ? 'opp-provenance-unverified' : 'opp-field-source'
    }, isUnverified ? 'fetched — confirm' : label);
  }

  function Field({ label, sourced, missingFields, conflictMap }) {
    if (!sourced) return null;

    var fieldKey = label.toLowerCase().replace(/\s+/g, '');
    var isMissing = Array.isArray(missingFields) && missingFields.some(function(m) {
      return m.toLowerCase().replace(/\s+/g, '') === fieldKey ||
             m.toLowerCase().replace(/[^a-z]/g, '') === fieldKey.replace(/[^a-z]/g, '');
    });
    var conflict = conflictMap && conflictMap[fieldKey];

    var value = sourced.value;
    var isNull = value === null || value === undefined;

    return h('div', {
      className: 'opp-field' + (conflict ? ' is-conflict' : '') + (isMissing || isNull ? ' is-missing' : '')
    },
      h('div', { className: 'opp-field-label' }, label),
      isNull
        ? h('div', { className: 'opp-field-missing' }, 'Not available')
        : h('div', { className: 'opp-field-value' },
            typeof value === 'number' ? value.toLocaleString() : String(value)
          ),
      !isNull && (sourced.source || sourced.provenance)
        ? h(SourceTag, { source: sourced.source, provenance: sourced.provenance })
        : null,
      conflict
        ? h('div', null,
            h('span', { className: 'opp-conflict-badge' }, '⚠ Conflict'),
            h('div', { className: 'opp-conflict-values' },
              'ATTOM: ' + (conflict.attom != null ? conflict.attom : '—') +
              ' · PLUTO: ' + (conflict.pluto != null ? conflict.pluto : '—')
            )
          )
        : null
    );
  }

  function MathRow({ label, computed }) {
    if (!computed) return null;
    var val = computed.value;
    return h('div', { className: 'opp-math-row' },
      h('div', null,
        h('div', { className: 'opp-math-label' }, label),
        computed.formula
          ? h('span', { className: 'opp-math-formula' }, computed.formula)
          : null,
        computed.nullReason
          ? h('span', { className: 'opp-math-formula' }, '⚠ ' + computed.nullReason)
          : null
      ),
      h('div', { className: 'opp-math-value' },
        val === null || val === undefined
          ? '—'
          : (typeof val === 'number' ? val.toLocaleString() : String(val))
      )
    );
  }

  function ConfidenceBadge({ confidence }) {
    var cls = {
      high: 'opp-confidence opp-confidence-high',
      med:  'opp-confidence opp-confidence-med',
      low:  'opp-confidence opp-confidence-low',
    }[confidence] || 'opp-confidence opp-confidence-low';
    return h('span', { className: cls }, confidence || 'low');
  }

  function OpportunityCard({ opp }) {
    return h('div', { className: 'opp-card' },
      h('div', { className: 'opp-card-header' },
        h('h3', { className: 'opp-card-title' }, opp.title),
        h(ConfidenceBadge, { confidence: opp.confidence })
      ),
      h('p', { className: 'opp-card-summary' }, opp.summary),
      opp.basedOn
        ? h('div', { className: 'opp-card-based-on' }, 'Based on: ' + opp.basedOn)
        : null,
      opp.caveats && opp.caveats.length
        ? h('div', null,
            h('div', { className: 'opp-card-section-label' }, 'Caveats'),
            h('ul', { className: 'opp-card-list' },
              opp.caveats.map(function(c, i) { return h('li', { key: i }, c); })
            )
          )
        : null,
      opp.nextSteps && opp.nextSteps.length
        ? h('div', null,
            h('div', { className: 'opp-card-section-label' }, 'Next steps'),
            h('ul', { className: 'opp-card-list' },
              opp.nextSteps.map(function(s, i) { return h('li', { key: i }, s); })
            )
          )
        : null
    );
  }

  // ── Main report renderer ──────────────────────────────────────────────────

  function ReportView({ report }) {
    var property = report.property || {};
    var zoning = report.zoning || {};
    var analysis = report.analysis || {};
    var dq = report.dataQuality || {};
    var disclaimers = report.disclaimers || [];

    // Build a conflict map keyed by normalised field name for O(1) lookup
    var conflictMap = {};
    if (Array.isArray(dq.conflicts)) {
      dq.conflicts.forEach(function(c) {
        var key = String(c.field || '').toLowerCase().replace(/[^a-z]/g, '');
        conflictMap[key] = c;
      });
    }

    var missingFields = Array.isArray(dq.missing) ? dq.missing : [];
    var opportunities = Array.isArray(analysis.opportunities) ? analysis.opportunities : [];

    return h('div', null,

      // ── Property Information ────────────────────────────────────────────
      h('div', { className: 'opp-section' },
        h('h2', { className: 'opp-section-title' }, 'Property Information'),
        h('div', { className: 'opp-field-grid' },
          h(Field, { label: 'Address', sourced: property.address, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'BBL', sourced: property.bbl, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Borough', sourced: property.borough, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Block', sourced: property.block, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Lot', sourced: property.lot, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Owner', sourced: property.owner, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Building Class', sourced: property.buildingClass
            ? { value: (property.buildingClass.code && property.buildingClass.code.value) +
                (property.buildingClass.label && property.buildingClass.label.value ? ' — ' + property.buildingClass.label.value : ''),
                source: 'pluto' }
            : null, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Tax Class', sourced: property.taxClass, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Year Built', sourced: property.yearBuilt, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Stories', sourced: property.numStories, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Buildings on Lot', sourced: property.numBuildings, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Total Units', sourced: property.totalUnits, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Residential Units', sourced: property.residentialUnits, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Commercial Units', sourced: property.commercialUnits, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Total Area (sq ft)', sourced: property.totalArea, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Residential Area (sq ft)', sourced: property.residentialArea, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Commercial Area (sq ft)', sourced: property.commercialArea, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Bldg Frontage (ft)', sourced: property.buildingFrontage, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Bldg Depth (ft)', sourced: property.buildingDepth, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Sale Date', sourced: property.saleDate, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Sale Amount', sourced: property.saleAmount, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Construction Type', sourced: property.constructionType, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Building Style', sourced: property.buildingStyle, missingFields: missingFields, conflictMap: conflictMap })
        ),

        // Data quality note
        (dq.conflicts && dq.conflicts.length > 0) || missingFields.length > 0
          ? h('div', { style: { marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.4)' } },
              dq.conflicts && dq.conflicts.length > 0
                ? '⚠ ' + dq.conflicts.length + ' field(s) disagreed between ATTOM and PLUTO — flagged above.  '
                : '',
              missingFields.length > 0
                ? missingFields.length + ' field(s) not available from any source.'
                : ''
            )
          : null
      ),

      // ── Land Information ────────────────────────────────────────────────
      h('div', { className: 'opp-section' },
        h('h2', { className: 'opp-section-title' }, 'Land'),
        h('div', { className: 'opp-field-grid' },
          h(Field, { label: 'Frontage (ft)', sourced: property.land && property.land.frontage, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Depth (ft)', sourced: property.land && property.land.depth, missingFields: missingFields, conflictMap: conflictMap }),
          h(Field, { label: 'Area (sq ft)', sourced: property.land && property.land.area, missingFields: missingFields, conflictMap: conflictMap })
        )
      ),

      // ── Zoning ──────────────────────────────────────────────────────────
      h('div', { className: 'opp-section' },
        h('h2', { className: 'opp-section-title' }, 'Zoning'),
        zoning.needsManualConfirmation
          ? h('div', { className: 'opp-lead-banner', style: { marginBottom: 12 } },
              '⚠ This district was not found in the verified rules table. Values below were fetched and are UNVERIFIED — confirm with the NYC Zoning Resolution before relying on them.'
            )
          : null,
        h('div', { className: 'opp-field-grid' },
          h('div', { className: 'opp-field' },
            h('div', { className: 'opp-field-label' }, 'District'),
            h('div', { className: 'opp-field-value' }, zoning.district || '—'),
            zoning.districtName
              ? h('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 } }, zoning.districtName)
              : null,
            h('span', {
              className: zoning.needsManualConfirmation ? 'opp-provenance-unverified' : 'opp-provenance-verified'
            }, zoning.needsManualConfirmation ? 'fetched — confirm' : 'verified table')
          ),
          h('div', { className: 'opp-field' },
            h('div', { className: 'opp-field-label' }, 'Height Regime'),
            h('div', { className: 'opp-field-value' },
              zoning.heightRegime && zoning.heightRegime.value ? zoning.heightRegime.value : '—'
            )
          ),
          h('div', { className: 'opp-field' },
            h('div', { className: 'opp-field-label' }, 'Residential FAR'),
            h('div', { className: 'opp-field-value' },
              zoning.far && zoning.far.residential && zoning.far.residential.value != null
                ? zoning.far.residential.value
                : '—'
            )
          ),
          h('div', { className: 'opp-field' },
            h('div', { className: 'opp-field-label' }, 'Community Facility FAR'),
            h('div', { className: 'opp-field-value' },
              zoning.far && zoning.far.communityFacility && zoning.far.communityFacility.value != null
                ? zoning.far.communityFacility.value
                : '—'
            )
          ),
          h('div', { className: 'opp-field' },
            h('div', { className: 'opp-field-label' }, 'Max Building Height'),
            h('div', { className: 'opp-field-value' },
              zoning.maxHeight && zoning.maxHeight.value != null
                ? zoning.maxHeight.value + ' ft'
                : 'Sky-exposure plane'
            )
          ),
          h('div', { className: 'opp-field' },
            h('div', { className: 'opp-field-label' }, 'Max Base Height'),
            h('div', { className: 'opp-field-value' },
              zoning.maxBaseHeight && zoning.maxBaseHeight.value != null
                ? zoning.maxBaseHeight.value + ' ft'
                : '—'
            )
          ),
          h('div', { className: 'opp-field' },
            h('div', { className: 'opp-field-label' }, 'Max Lot Coverage'),
            h('div', { className: 'opp-field-value' },
              zoning.lotCoverage && zoning.lotCoverage.value != null
                ? Math.round(zoning.lotCoverage.value * 100) + '%'
                : 'Open-space-ratio rule'
            )
          ),
          h('div', { className: 'opp-field', style: { gridColumn: 'span 2' } },
            h('div', { className: 'opp-field-label' }, 'Allowed Uses'),
            h('div', { className: 'opp-field-value', style: { fontSize: 12, fontWeight: 400 } },
              zoning.allowedUseGroups && zoning.allowedUseGroups.value
                ? zoning.allowedUseGroups.value
                : '—'
            )
          )
        ),

        // Provenance notes
        zoning.provenanceNotes && zoning.provenanceNotes.length
          ? h('div', { style: { marginTop: 10 } },
              zoning.provenanceNotes.map(function(note, i) {
                return h('div', {
                  key: i,
                  style: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 3, paddingLeft: 10 }
                }, '· ' + note);
              })
            )
          : null
      ),

      // ── Analysis: Math + Opportunities ──────────────────────────────────
      h('div', { className: 'opp-section' },
        h('h2', { className: 'opp-section-title' }, 'Baseline Analysis'),

        // Investigate-lead framing banner
        h('div', { className: 'opp-lead-banner' },
          '⚠ Investigate leads — not entitlements. These numbers are computed from public data and as-of-right zoning baselines. They do not account for variances, special permits, landmarks, environmental reviews, or other site-specific conditions. All figures require verification with a licensed architect and the NYC Department of Buildings.'
        ),

        // Math block
        h('div', { className: 'opp-math-block' },
          h(MathRow, { label: 'Lot area', computed: analysis.lotAreaSqFt }),
          h(MathRow, { label: 'Existing building area', computed: analysis.existingAreaSqFt }),
          h(MathRow, { label: 'Residential FAR', computed: analysis.residentialFAR }),
          h(MathRow, { label: 'Max buildable area', computed: analysis.maxBuildableArea }),
          h(MathRow, { label: 'Remaining FAR capacity', computed: analysis.remainingCapacity }),
          h(MathRow, { label: 'Existing stories', computed: analysis.existingStories }),
          h(MathRow, { label: 'Max implied stories', computed: analysis.maxImpliedStories }),
          h(MathRow, { label: 'Story headroom', computed: analysis.storyHeadroom }),
          h(MathRow, { label: 'Est. additional units', computed: analysis.potentialAdditionalUnits }),
          h(MathRow, { label: 'Current lot coverage', computed: analysis.currentLotCoverageRatio
            ? Object.assign({}, analysis.currentLotCoverageRatio, {
                value: analysis.currentLotCoverageRatio.value != null
                  ? Math.round(analysis.currentLotCoverageRatio.value * 100) + '%'
                  : null
              })
            : null }),
          h(MathRow, { label: 'Max lot coverage', computed: analysis.maxLotCoverageRatio
            ? Object.assign({}, analysis.maxLotCoverageRatio, {
                value: analysis.maxLotCoverageRatio.value != null
                  ? Math.round(analysis.maxLotCoverageRatio.value * 100) + '%'
                  : null
              })
            : null }),
          h(MathRow, { label: 'Lot coverage headroom', computed: analysis.lotCoverageHeadroom
            ? Object.assign({}, analysis.lotCoverageHeadroom, {
                value: analysis.lotCoverageHeadroom.value != null
                  ? Math.round(analysis.lotCoverageHeadroom.value * 100) + '%'
                  : null
              })
            : null })
        ),

        // Opportunities
        opportunities.length > 0
          ? h('div', null,
              h('div', { style: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 12 } },
                opportunities.length + ' investigate lead' + (opportunities.length !== 1 ? 's' : '') + ' identified by AI — review each carefully.'
              ),
              opportunities.map(function(opp, i) {
                return h(OpportunityCard, { key: i, opp: opp });
              })
            )
          : h('div', { style: { fontSize: 13, color: 'rgba(255,255,255,0.45)', padding: '12px 0' } },
              analysis.llmError
                ? 'AI analysis unavailable: ' + analysis.llmError
                : 'No specific leads identified from the available data.'
            )
      ),

      // ── Disclaimers ──────────────────────────────────────────────────────
      disclaimers.length
        ? h('div', { className: 'opp-disclaimers' },
            h('div', { className: 'opp-disclaimers-title' }, 'Important Disclaimers'),
            h('ul', { className: 'opp-disclaimers-list' },
              disclaimers.map(function(d, i) { return h('li', { key: i }, d); })
            )
          )
        : null
    );
  }

  // ── Modal shell ───────────────────────────────────────────────────────────

  function Modal({ reportId, onClose }) {
    var _s = useState({ status: 'loading', report: null, error: null });
    var state = _s[0];
    var setState = _s[1];

    useEffect(function() {
      if (!reportId) return;
      setState({ status: 'loading', report: null, error: null });

      var base = getApiBase();
      var url = base + '/api/opportunity-report/' + reportId;

      fetch(url)
        .then(function(res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function(data) {
          setState({ status: 'ready', report: data, error: null });
        })
        .catch(function(err) {
          setState({ status: 'error', report: null, error: err.message });
        });
    }, [reportId]);

    // Close on Escape
    useEffect(function() {
      function onKey(e) { if (e.key === 'Escape') onClose(); }
      document.addEventListener('keydown', onKey);
      return function() { document.removeEventListener('keydown', onKey); };
    }, [onClose]);

    // Lock body scroll
    useEffect(function() {
      var prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return function() { document.body.style.overflow = prev; };
    }, []);

    var report = state.report;
    var address = report ? (report.address || '') : '';
    var generatedAt = report ? fmtDate(report.generatedAt) : '';

    return h('div', {
      className: 'opp-report-overlay',
      onClick: function(e) { if (e.target === e.currentTarget) onClose(); }
    },
      h('div', { className: 'opp-report-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Opportunity Report' },

        // Top bar
        h('div', { className: 'opp-report-topbar' },
          h('h1', { className: 'opp-report-topbar-title' },
            address || 'Opportunity Report'
          ),
          generatedAt
            ? h('span', { className: 'opp-report-topbar-meta' }, 'Generated ' + generatedAt)
            : null,
          h('button', {
            className: 'opp-report-close',
            onClick: onClose,
            'aria-label': 'Close report'
          }, '✕')
        ),

        // Body
        h('div', { className: 'opp-report-body' },
          state.status === 'loading'
            ? h('div', { className: 'opp-report-loading' },
                h('div', { className: 'opp-report-spinner' }),
                h('div', null, 'Loading report…')
              )
            : state.status === 'error'
            ? h('div', { className: 'opp-report-loading' },
                h('div', { style: { color: '#f87171' } }, 'Could not load report: ' + state.error)
              )
            : report
            ? h(ReportView, { report: report })
            : null
        )
      )
    );
  }

  // ── App root ──────────────────────────────────────────────────────────────

  function App() {
    var _s = useState(null);
    var reportId = _s[0];
    var setReportId = _s[1];

    var close = useCallback(function() { setReportId(null); }, []);

    useEffect(function() {
      function handler(e) {
        var id = e && e.detail && e.detail.reportId;
        if (id) setReportId(id);
      }
      window.addEventListener('opp:open-report', handler);
      return function() { window.removeEventListener('opp:open-report', handler); };
    }, []);

    if (!reportId) return null;
    return h(Modal, { reportId: reportId, onClose: close });
  }

  // ── Mount ─────────────────────────────────────────────────────────────────

  var root = document.getElementById('opp-report-root');
  if (!root) return;

  if (ReactDOM.createRoot) {
    ReactDOM.createRoot(root).render(h(App, null));
  } else {
    ReactDOM.render(h(App, null), root);
  }

})();
