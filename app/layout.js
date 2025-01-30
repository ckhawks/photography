// import "bootstrap/dist/css/bootstrap.min.css";
import MobileTopMenubar from "../components/MobileTopMenubar";
import "./globals.scss";

export const metadata = {
  title: "Photography — stlr.cx",
};

// import "bootstrap/dist/css/bootstrap.min.css";

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
