export const metadata = {
  title: "Condo Package Backend",
  description: "Next.js API backend",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
