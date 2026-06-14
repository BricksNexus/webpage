'use client';

import Script from 'next/script';
import OpportunityReportModal from './OpportunityReportModal';

export default function PostOpportunityPage() {
  return (
    <>
      {/* CSS from public/ — precedence prop tells React 19 to hoist these to <head> */}
      <link rel="stylesheet" href="/post-opportunity.css" precedence="default" />
      <link rel="stylesheet" href="/mobile-base.css" precedence="default" />
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
        precedence="default"
      />

      {/*
        Load app-state.js → auth check → post-opportunity.js in sequence.
        post-opportunity.js wraps its init in DOMContentLoaded, which has already
        fired by the time afterInteractive scripts run in Next.js.  We patch
        document.addEventListener so that any 'DOMContentLoaded' registration is
        called synchronously when the document is already ready.
      */}
      <Script id="post-opp-loader" strategy="afterInteractive">{`
        (function() {
          function loadScript(src, onload) {
            var s = document.createElement('script');
            s.src = src;
            s.onload = onload || null;
            document.head.appendChild(s);
          }

          loadScript('/app-state.js', function() {
            // Auth gate
            if (window.BricksNexusApp && !window.BricksNexusApp.isAuthenticated()) {
              var returnTo = encodeURIComponent('/post-opportunity' + window.location.search);
              window.location.replace('/login.html?return=' + returnTo);
              return;
            }

            // Patch addEventListener so DOMContentLoaded callbacks fire immediately
            var _orig = document.addEventListener.bind(document);
            document.addEventListener = function(type, fn, opts) {
              if (type === 'DOMContentLoaded') { fn(); return; }
              return _orig(type, fn, opts);
            };

            loadScript('/post-opportunity.js', function() {
              document.addEventListener = _orig;
            });
          });
        })();
      `}</Script>

      {/* ── Page shell (identical structure to public/post-opportunity.html) ── */}
      <div className="builder-shell">
        <aside className="builder-sidebar">
          <div className="builder-brand">
            <a href="/index.html">BricksNexus</a>
            <span>Opportunity Builder</span>
          </div>

          <div className="builder-sidebar-card">
            <p className="builder-sidebar-eyebrow">Progress</p>
            <nav className="builder-progress" aria-label="Opportunity builder steps">
              <button type="button" className="builder-progress-step active" data-target-step="type">
                <span className="builder-progress-index">1</span>
                <span>Type</span>
              </button>
              <button type="button" className="builder-progress-step" data-target-step="details">
                <span className="builder-progress-index">2</span>
                <span>Details</span>
              </button>
              <button type="button" className="builder-progress-step" data-target-step="needs">
                <span className="builder-progress-index">3</span>
                <span>What I Need</span>
              </button>
              <button type="button" className="builder-progress-step" data-target-step="chronogram">
                <span className="builder-progress-index">4</span>
                <span>Chronogram</span>
              </button>
              <button type="button" className="builder-progress-step" data-target-step="financing">
                <span className="builder-progress-index">5</span>
                <span>Financing</span>
              </button>
              <button type="button" className="builder-progress-step" data-target-step="documents">
                <span className="builder-progress-index">6</span>
                <span>Documents</span>
              </button>
            </nav>
          </div>
        </aside>

        <main className="builder-main">
          <header className="builder-header">
            <div>
              <p className="builder-header-eyebrow">B2B Marketplace</p>
              <h1>Create New Opportunity</h1>
              <p className="builder-header-copy">
                Build a structured posting for hiring, services, full real estate / construction
                projects, or exploring ideas and interest.
              </p>
            </div>
            <a href="/dashboard.html" className="builder-dashboard-link">Go to Dashboard</a>
          </header>

          <section className="builder-layout">
            <form className="builder-form" id="opportunity-builder-form">
              <section className="builder-section active" id="builder-step-type" data-step="type" data-step-index="0">
                <button type="button" className="builder-section-toggle">
                  <span className="builder-section-number">1</span>
                  <span className="builder-section-title">Type</span>
                </button>
                <div className="builder-section-panel">
                  <p className="builder-section-copy">Choose the type of opportunity you want to publish.</p>
                  <div className="builder-type-grid" id="builder-type-options">
                    <label className="builder-type-card">
                      <input type="radio" name="opportunity_kind" value="hiring" />
                      <strong>Hiring</strong>
                      <span>Simple posting focused on role, job description, location, and budget.</span>
                    </label>
                    <label className="builder-type-card">
                      <input type="radio" name="opportunity_kind" value="services" />
                      <strong>Services</strong>
                      <span>Simple posting for hiring service providers and contractors.</span>
                    </label>
                    <label className="builder-type-card">
                      <input type="radio" name="opportunity_kind" value="project" />
                      <strong>Project</strong>
                      <span>Structured project builder with team, chronogram, financing, and documents.</span>
                    </label>
                    <label className="builder-type-card">
                      <input type="radio" name="opportunity_kind" value="exploring" />
                      <strong>Exploring</strong>
                      <span>Early-stage or exploratory posting to gauge interest, partners, or ideas before committing to a full project.</span>
                    </label>
                  </div>
                  <div className="builder-section-actions">
                    <button type="button" className="builder-btn builder-btn-secondary" data-save-draft-step="type">Save as Draft</button>
                    <button type="button" className="builder-btn builder-btn-primary" data-continue-step="type">Continue</button>
                  </div>
                </div>
              </section>

              <section className="builder-section" id="builder-step-details" data-step="details" data-step-index="1">
                <button type="button" className="builder-section-toggle">
                  <span className="builder-section-number">2</span>
                  <span className="builder-section-title">Details</span>
                </button>
                <div className="builder-section-panel">
                  <div className="builder-grid-two">
                    <div className="builder-field">
                      <label htmlFor="opp-title">Opportunity title</label>
                      <input type="text" id="opp-title" placeholder="e.g. Mixed-use building permitting package" />
                    </div>
                    <div className="builder-field project-only">
                      <label htmlFor="opp-property-type">Property type</label>
                      <select id="opp-property-type">
                        <option value="">Select a property type</option>
                        <option value="land">Land / Lot</option>
                        <option value="house">House</option>
                        <option value="apartment">Apartment</option>
                        <option value="building">Building</option>
                        <option value="office">Office</option>
                      </select>
                    </div>
                  </div>
                  <div className="builder-field">
                    <label htmlFor="opp-summary">Job description / project brief</label>
                    <textarea id="opp-summary" rows="4" placeholder="Describe the scope, stage, urgency, and deliverables you expect."></textarea>
                  </div>
                  <div className="builder-field project-only">
                    <label>Opportunity description checklist</label>
                    <p className="builder-field-hint">These options adapt to the selected property type.</p>
                    <div className="builder-checklist builder-property-checklist" id="builder-property-checklist"></div>
                  </div>
                  <div className="builder-grid-three">
                    <div className="builder-field">
                      <label htmlFor="opp-city">City</label>
                      <input type="text" id="opp-city" placeholder="Austin" />
                    </div>
                    <div className="builder-field">
                      <label htmlFor="opp-region">State / region</label>
                      <input type="text" id="opp-region" placeholder="TX" />
                    </div>
                    <div className="builder-field">
                      <label htmlFor="opp-budget">Budget</label>
                      <input type="text" id="opp-budget" placeholder="$350k - $800k" />
                    </div>
                  </div>
                  <div className="builder-field">
                    <label htmlFor="opp-address">Address / site note</label>
                    <input type="text" id="opp-address" placeholder="Street address, district, or nearest landmark" />
                  </div>
                  <div className="builder-section-actions">
                    <button type="button" className="builder-btn builder-btn-secondary" data-open-step="type">Back</button>
                    <button type="button" className="builder-btn builder-btn-secondary" data-save-draft-step="details">Save as Draft</button>
                    <button type="button" className="builder-btn builder-btn-primary" data-continue-step="details">Continue</button>
                  </div>
                </div>
              </section>

              <section className="builder-section" id="builder-step-needs" data-step="needs" data-step-index="2">
                <button type="button" className="builder-section-toggle">
                  <span className="builder-section-number">3</span>
                  <span className="builder-section-title">What I Need</span>
                </button>
                <div className="builder-section-panel">
                  <p className="builder-section-copy project-only">Select the professionals you need for this project. Every checked profession appears as a live tag in My Team.</p>
                  <div className="builder-checklist builder-team-checklist project-only" id="builder-team-checklist"></div>
                  <div className="builder-field simple-only">
                    <label htmlFor="opp-simple-need">What do you need?</label>
                    <textarea id="opp-simple-need" rows="3" placeholder="Describe the role or service provider you need to hire."></textarea>
                  </div>
                  <div className="builder-field">
                    <label htmlFor="opp-terms">Success criteria / deliverables</label>
                    <textarea id="opp-terms" rows="3" placeholder="List the exact deliverables, standards, permits, or milestones expected."></textarea>
                  </div>
                  <div className="builder-section-actions">
                    <button type="button" className="builder-btn builder-btn-secondary" data-open-step="details">Back</button>
                    <button type="button" className="builder-btn builder-btn-secondary" data-save-draft-step="needs">Save as Draft</button>
                    <button type="button" className="builder-btn builder-btn-primary" data-continue-step="needs">Continue</button>
                  </div>
                </div>
              </section>

              <section className="builder-section" id="builder-step-chronogram" data-step="chronogram" data-step-index="3">
                <button type="button" className="builder-section-toggle">
                  <span className="builder-section-number">4</span>
                  <span className="builder-section-title">Chronogram</span>
                </button>
                <div className="builder-section-panel">
                  <p className="builder-section-copy">Create a simplified timeline similar to a lightweight Primavera / Gantt schedule.</p>
                  <div className="builder-table-wrap">
                    <table className="builder-table">
                      <thead>
                        <tr>
                          <th>Task Name</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody id="chronogram-body"></tbody>
                    </table>
                  </div>
                  <button type="button" className="builder-inline-btn" id="chronogram-add-row">Add Task</button>
                  <div className="builder-section-actions">
                    <button type="button" className="builder-btn builder-btn-secondary" data-open-step="needs">Back</button>
                    <button type="button" className="builder-btn builder-btn-secondary" data-save-draft-step="chronogram">Save as Draft</button>
                    <button type="button" className="builder-btn builder-btn-primary" data-continue-step="chronogram">Continue</button>
                  </div>
                </div>
              </section>

              <section className="builder-section" id="builder-step-financing" data-step="financing" data-step-index="4">
                <button type="button" className="builder-section-toggle">
                  <span className="builder-section-number">5</span>
                  <span className="builder-section-title">Financing</span>
                </button>
                <div className="builder-section-panel">
                  <div className="builder-grid-two">
                    <div className="builder-field">
                      <label htmlFor="opp-financing-model">Financing model</label>
                      <select id="opp-financing-model">
                        <option value="">Select a model</option>
                        <option value="self-funded">Self-funded</option>
                        <option value="debt">Debt</option>
                        <option value="equity">Equity</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                    <div className="builder-field">
                      <label htmlFor="opp-roi">Target ROI / margin</label>
                      <input type="text" id="opp-roi" placeholder="e.g. 12% ROI" />
                    </div>
                  </div>
                  <div className="builder-grid-two">
                    <div className="builder-field">
                      <label htmlFor="opp-equity">Equity offered</label>
                      <input type="text" id="opp-equity" placeholder="e.g. Up to 10%" />
                    </div>
                    <div className="builder-field">
                      <label htmlFor="opp-capital-gap">Capital gap / hiring budget note</label>
                      <input type="text" id="opp-capital-gap" placeholder="Optional" />
                    </div>
                  </div>
                  <div className="builder-section-actions">
                    <button type="button" className="builder-btn builder-btn-secondary" data-open-step="chronogram">Back</button>
                    <button type="button" className="builder-btn builder-btn-secondary" data-save-draft-step="financing">Save as Draft</button>
                    <button type="button" className="builder-btn builder-btn-primary" data-continue-step="financing">Continue</button>
                  </div>
                </div>
              </section>

              <section className="builder-section" id="builder-step-documents" data-step="documents" data-step-index="5">
                <button type="button" className="builder-section-toggle">
                  <span className="builder-section-number">6</span>
                  <span className="builder-section-title">Documents</span>
                </button>
                <div className="builder-section-panel">
                  <label className="builder-upload-zone" htmlFor="opp-attachments">
                    <input type="file" id="opp-attachments" multiple />
                    <strong>Upload files</strong>
                    <span>Deeds, permits, photos, budgets, or any supporting material.</span>
                  </label>
                  <div id="builder-documents-list" className="builder-documents-list"></div>
                  <div className="builder-section-actions">
                    <button type="button" className="builder-btn builder-btn-secondary" data-open-step="financing">Back</button>
                    <button type="button" className="builder-btn builder-btn-secondary" data-save-draft-step="documents">Save as Draft</button>
                  </div>
                </div>
              </section>
            </form>

            <aside className="builder-sidepanel">
              <div className="builder-side-card">
                <p className="builder-side-eyebrow">Live team</p>
                <h2>My Team</h2>
                <p className="builder-side-copy">Checked professions appear here instantly as tags.</p>
                <div id="builder-team-list" className="builder-team-tags"></div>
                <p id="builder-team-empty" className="builder-side-empty">No professions selected yet.</p>
              </div>
              <div className="builder-side-card">
                <p className="builder-side-eyebrow">Publishing</p>
                <h2>Before you publish</h2>
                <ul className="builder-side-notes">
                  <li>Guests can view your card, but contact and bid actions require login.</li>
                  <li>Project postings can include team needs, schedule rows, and typed documents.</li>
                  <li>Use draft mode if you want to return and complete the builder later.</li>
                </ul>
              </div>
            </aside>
          </section>
        </main>
      </div>

      <footer className="builder-footer">
        <button type="button" className="builder-btn builder-btn-secondary" id="opp-save-draft">Save as Draft</button>
        <button type="button" className="builder-btn builder-btn-primary" id="opp-submit" disabled>Publish</button>
      </footer>

      <div className="builder-chatbox-widget" aria-live="polite">
        <button type="button" className="builder-chatbox-prompt" id="opp-chat-help-prompt">
          Need help creating an opportunity?
        </button>
        <button type="button" className="builder-chatbox-launcher" id="opp-chat-launcher" aria-label="Open Explore Opportunities chat">
          Chat
        </button>

        <section className="builder-opportunity-explorer builder-explorer-floating hidden" id="opp-chat-panel" aria-label="Explore Opportunities chat">
          <div className="builder-explorer-head">
            <div>
              <h3>Explore Opportunities</h3>
            </div>
            <button type="button" className="builder-chatbox-close" id="opp-chat-close-btn" aria-label="Close chatbox">×</button>
          </div>

          <div className="builder-explorer-address">
            <label htmlFor="opp-chat-address">Your property address</label>
            <div className="builder-explorer-address-row">
              <input
                id="opp-chat-address"
                type="text"
                placeholder="e.g. 123 Main St, Boston, MA 02108"
                autoComplete="street-address"
              />
              <button type="button" className="builder-btn builder-btn-primary" id="opp-chat-start-btn">
                Start
              </button>
            </div>
            <div className="builder-explorer-options" id="opp-chat-options" role="group" aria-label="Common ways to add units">
              <p className="builder-explorer-options-hint">Pick a path you&apos;re curious about (optional). You can change it anytime.</p>
              <div className="builder-explorer-option-grid">
                <button type="button" className="builder-explorer-option" data-explore-key="adu"
                  data-explore-label="a backyard cottage or ADU"
                  data-explore-focus="Adding an accessory dwelling unit (ADU)—a separate small home on the same lot, often called a backyard cottage or in-law apartment.">
                  Backyard cottage or ADU
                </button>
                <button type="button" className="builder-explorer-option" data-explore-key="basement"
                  data-explore-label="a basement or in-law apartment"
                  data-explore-focus="Finishing or converting a basement or lower level into a legal apartment or in-law suite.">
                  Basement / in-law apartment
                </button>
                <button type="button" className="builder-explorer-option" data-explore-key="convert"
                  data-explore-label="splitting the house into two or more units"
                  data-explore-focus="Converting an existing single-family house into two or more units (like a duplex) with minimal or no new exterior footprint.">
                  Split house into 2+ units
                </button>
                <button type="button" className="builder-explorer-option" data-explore-key="addition"
                  data-explore-label="building an addition"
                  data-explore-focus="Adding new square footage (an addition) to create another dwelling unit or more living space.">
                  Build an addition
                </button>
                <button type="button" className="builder-explorer-option" data-explore-key="subdivide"
                  data-explore-label="subdividing the lot"
                  data-explore-focus="Subdividing the property into additional lots or building multiple homes on a large lot.">
                  Subdivide the lot
                </button>
                <button type="button" className="builder-explorer-option" data-explore-key="unsure"
                  data-explore-label="comparing my options"
                  data-explore-focus="The homeowner is not sure which approach fits yet; compare the most common ways to add units in plain language for this property.">
                  Not sure — compare options
                </button>
              </div>
            </div>
          </div>

          <div className="builder-explorer-chat">
            <div className="builder-explorer-log" id="opp-chat-log" aria-live="polite"></div>
            <div className="builder-explorer-compose">
              <label className="builder-visually-hidden" htmlFor="opp-chat-message-input">Your reply</label>
              <div className="builder-explorer-compose-row">
                <textarea
                  id="opp-chat-message-input"
                  rows="2"
                  placeholder="Ask a follow-up question… (Enter to send, Shift+Enter for new line)"
                  disabled
                ></textarea>
                <button type="button" className="builder-btn builder-btn-primary" id="opp-chat-send-btn" disabled>
                  Send
                </button>
              </div>
            </div>
          </div>

          <div className="builder-explorer-actions">
            <button type="button" className="builder-btn builder-btn-primary" id="opp-chat-apply-btn" disabled>
              Apply to Opportunity
            </button>
            <button type="button" className="builder-btn builder-btn-report hidden" id="opp-chat-report-btn">
              View Opportunity Report
            </button>
          </div>
        </section>
      </div>

      {/* React modal — listens for opp:open-report and renders in Next's tree */}
      <OpportunityReportModal />
    </>
  );
}
