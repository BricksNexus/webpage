import "./globals.css";

export const metadata = {
  title: "BricksNexus Tokenization",
  description: "Tokenization opportunity detail page for BricksNexus."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
