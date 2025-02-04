// import "bootstrap/dist/css/bootstrap.min.css";
import Head from "next/head";
import MobileTopMenubar from "../components/MobileTopMenubar";
import "./globals.scss";

export const metadata = {
  title: "Photography — stlr.cx",
};

// import "bootstrap/dist/css/bootstrap.min.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en" style={{ scrollbarGutter: "stable" }}>
      <Head>
        <meta name="viewport" content="width=device-width; initial-scale=1" />
      </Head>
      <body>
        <MobileTopMenubar />
        {children}
      </body>
    </html>
  );
}
