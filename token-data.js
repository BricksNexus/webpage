export const tokenData = {
  id: "bnx-miami-harbor-001",
  propertyName: "Miami Harbor Residences",
  location: "Wynwood, Miami, Florida",
  tokenPrice: 50,
  estimatedAnnualYield: 12.5,
  minimumInvestment: 1000,
  fundingGoal: 2500000,
  raisedAmount: 1687500,
  totalTokens: 50000,
  availableTokens: 16250,
  smartContractAddress: "0x7b39cB426d8A9E1E0f1966e0F4FbF7091D3c54Ee",
  network: "Polygon",
  explorerUrl: "https://polygonscan.com/address/0x7b39cB426d8A9E1E0f1966e0F4FbF7091D3c54Ee",
  description:
    "Miami Harbor Residences is a mixed-use waterfront redevelopment positioned for rental growth and long-term appreciation. The asset combines stabilized residential income, curated retail frontage, and a phased upgrade plan designed to unlock NOI expansion.",
  investmentThesis: [
    "Prime submarket with sustained residential absorption and strong tenant demand.",
    "Refinancing and cap-rate compression potential after renovation milestones.",
    "Tokenized structure creates a lower barrier to entry for qualified investors."
  ],
  gallery: [
    {
      id: "gallery-1",
      title: "Aerial View",
      image:
        "linear-gradient(135deg, rgba(26,43,60,0.92), rgba(45,156,219,0.48)), url('https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80')"
    },
    {
      id: "gallery-2",
      title: "Lobby Concept",
      image:
        "linear-gradient(135deg, rgba(16,32,47,0.82), rgba(45,156,219,0.38)), url('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80')"
    },
    {
      id: "gallery-3",
      title: "Retail Frontage",
      image:
        "linear-gradient(135deg, rgba(16,32,47,0.84), rgba(45,156,219,0.34)), url('https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80')"
    }
  ],
  capitalStack: [
    { label: "Senior Debt", value: 62, color: "#1A2B3C" },
    { label: "Sponsor Equity", value: 18, color: "#2D9CDB" },
    { label: "Tokenized Equity", value: 20, color: "#6FCF97" }
  ],
  projectedCashFlow: [
    { year: "Year 1", revenue: "$382,000", distributions: "$128,000", totalReturn: "8.3%" },
    { year: "Year 2", revenue: "$417,500", distributions: "$156,000", totalReturn: "10.4%" },
    { year: "Year 3", revenue: "$449,000", distributions: "$181,500", totalReturn: "12.1%" },
    { year: "Year 4", revenue: "$476,000", distributions: "$202,000", totalReturn: "13.5%" },
    { year: "Year 5", revenue: "$514,000", distributions: "$231,000", totalReturn: "15.4%" }
  ],
  documents: [
    { id: "doc-1", name: "Independent Appraisal", type: "PDF", size: "2.4 MB" },
    { id: "doc-2", name: "Private Placement Memorandum", type: "PDF", size: "5.1 MB" },
    { id: "doc-3", name: "Title Deed & Legal Pack", type: "PDF", size: "3.7 MB" }
  ]
};

export function getFundingProgressPercent(data) {
  return Math.min(100, Math.round((data.raisedAmount / data.fundingGoal) * 100));
}
