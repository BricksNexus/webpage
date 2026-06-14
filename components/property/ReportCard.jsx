/**
 * ReportCard — Property Information + Land Information
 * Props:
 *   report: the full report object from /api/opportunity/analyze
 * Context: COMPONENTS.md (ReportCard) | API.md (POST /api/opportunity/analyze response shape)
 */

function FieldRow({ label, value }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[55%] text-right font-medium text-slate-900">
        {value != null && value !== "" ? value : "—"}
      </span>
    </div>
  );
}

export default function ReportCard({ report }) {
  if (!report) return null;

  const p = report; // alias

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* Left: Property Information */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Property Information
          </h2>
        </div>
        <div className="px-5 py-4">
          <FieldRow label="Address"                    value={p.address} />
          <FieldRow label="Borough"                    value={p.borough} />
          <FieldRow label="Block"                      value={p.block} />
          <FieldRow label="Lot"                        value={p.lot} />
          <FieldRow label="Property Owner"             value={p.ownerName} />
          <FieldRow label="Building Class"             value={p.buildingClass} />
          <FieldRow label="Tax Class"                  value={p.taxClass} />
          <FieldRow label="Number of Buildings"        value={p.numBuildings} />
          <FieldRow label="Year Built"                 value={p.yearBuilt} />
          <FieldRow label="Number of Stories"          value={p.numFloors} />
          <FieldRow label="Total Area (sq ft)"         value={p.totalArea?.toLocaleString()} />
          <FieldRow label="Total Units"                value={p.totalUnits} />
          <FieldRow label="Residential Area (sq ft)"   value={p.residentialArea?.toLocaleString()} />
          <FieldRow label="Residential Units"          value={p.residentialUnits} />
          <FieldRow label="Commercial Area (sq ft)"    value={p.commercialArea?.toLocaleString()} />
          <FieldRow label="Commercial Units"           value={p.commercialUnits} />
          <FieldRow label="Building Style"             value={p.buildingStyle} />
          <FieldRow label="Building Frontage (ft)"     value={p.buildingFrontage} />
          <FieldRow label="Building Depth (ft)"        value={p.buildingDepth} />
          <FieldRow label="Construction Type"          value={p.constructionType} />
        </div>
      </div>

      {/* Right: Land Information */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Land Information
          </h2>
        </div>
        <div className="px-5 py-4">
          <FieldRow label="Land Frontage (ft)" value={p.landFrontage} />
          <FieldRow label="Land Depth (ft)"    value={p.landDepth} />
          <FieldRow label="Land Area (sq ft)"  value={p.lotAreaSqFt?.toLocaleString()} />
          <FieldRow label="Zoning District"    value={p.zoningDistrict} />
        </div>
      </div>
    </div>
  );
}
