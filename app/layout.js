import MobileTopMenubar from "../components/MobileTopMenubar";
import "./globals.scss";

export const metadata = {
  title: "Photography — stlr.cx",
};

// Was a <meta> inside next/head, which does nothing in the app directory. The
// content string also separated the two values with a semicolon rather than a
// comma, so initial-scale was being dropped.
export const viewport = {
  width: "device-width",
  initialScale: 1,
};


export default function RootLayout({ children }) {
  return (
    <html lang="en" style={{ scrollbarGutter: "stable" }}>
      <body>
        <MobileTopMenubar />
        {children}
      </body>
    </html>
  );
}
