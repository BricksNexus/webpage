import SiteChrome from "@/components/site/SiteChrome";
import "./globals.css";

export const metadata = {
  title: "BricksNexus",
  description: "Marketplace, tokenization tools, and property feasibility — BricksNexus.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SiteChrome />
        {children}
      </body>
    </html>
  );
}
