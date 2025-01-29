// import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.scss";

export const metadata = {
  title: "Photography — stlr.cx",
};

// import "bootstrap/dist/css/bootstrap.min.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en" style={{ scrollbarGutter: "stable" }}>
      <body>{children}</body>
    </html>
  );
}
