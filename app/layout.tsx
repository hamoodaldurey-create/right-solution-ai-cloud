import type { Metadata } from "next";
export const metadata: Metadata = {title:"Right Solution AI Cloud",description:"Arabic and English business assistant"};
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) {return <html lang="ar" dir="rtl"><body>{children}</body></html>;}
