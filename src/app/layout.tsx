import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

export const metadata = {
  title: "English101 - Master English with CEFR Levels",
  description: "Learn English from beginner to advanced with our structured approach",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          theme="light"
        />
      </body>
    </html>
  );
}
