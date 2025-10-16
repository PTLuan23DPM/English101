import "./globals.css";

export const metadata = {
  title: "EnglishMaster",
  description: "AI English Learning Platform",
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
