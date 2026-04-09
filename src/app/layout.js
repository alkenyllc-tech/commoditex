export const metadata = {
  title: "COMMODITEX — AI Trading Signals",
  description: "AI-powered commodity trading signals, prices, and news",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0a0a0a" }}>
        {children}
      </body>
    </html>
  );
}
