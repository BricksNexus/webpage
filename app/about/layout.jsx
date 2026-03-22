import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "About BricksNexus",
  description:
    "Mission, pillars, and vision — democratizing development and the tokenization frontier.",
};

export default function AboutLayout({ children }) {
  return <div className={dmSans.className}>{children}</div>;
}
