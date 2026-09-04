import type { Metadata } from "next";
import "@fontsource-variable/bodoni-moda";
import "@fontsource-variable/onest";
import "@fontsource-variable/syne";
import "./globals.css";
import "./warm-theme.css";

export const metadata: Metadata = { title: "Simsan Admin", description: "Simsan Fraser Maintenance administration" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="warm-theme">{children}</body></html>;
}
