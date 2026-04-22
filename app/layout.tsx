export const metadata = {
  title: "Axiom Protocol | The Financial Operating System for Real-World Assets",
  description:
    "Axiom Protocol connects real estate, capital markets, and blockchain infrastructure. Tokenized assets, decentralized finance, and institutional-grade investment tools in one ecosystem.",
  openGraph: {
    title: "Axiom Protocol — The Financial Operating System for Real-World Assets",
    description:
      "Invest in tokenized real estate, private credit, and yield strategies powered by blockchain infrastructure and the AXUSD settlement layer.",
    url: "https://axiomprotocol.app",
    siteName: "Axiom Protocol",
    images: [
      {
        url: "https://axiomprotocol.app/axiom-og-image.jpg",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}