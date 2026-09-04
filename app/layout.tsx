import type { Metadata } from "next";
import "@fontsource-variable/bodoni-moda";
import "@fontsource-variable/onest";
import "@fontsource-variable/syne";
import "./globals.css";

export const metadata: Metadata = { title: "Simsan Admin", description: "Simsan Fraser Maintenance administration" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
