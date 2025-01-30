"use client";

import { useEffect, useState } from "react";
import sideBarStyles from "./NavigationSidebar.module.scss";
import styles from "../app/page.module.scss";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "react-feather";

const CURRENT_YEAR = new Date().getFullYear(); // returns the current year

const NavigationSidebar = (props) => {
  const pathname = usePathname(); // Get current path

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if the client-auth cookie is present
    const isAuthenticated = document.cookie
      .split("; ")
      .find((row) => row.startsWith("client-auth="));

    if (isAuthenticated) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  return (
    <div className={sideBarStyles.sidebar}>
      <div className={sideBarStyles.topsection}>
        <h1 className={styles.title}>Stellaric's Photography</h1>

        <p className={styles.description}>
          Please do enjoy, and let me know what you like by "liking" each photo.
        </p>
      </div>
      <div className={sideBarStyles.links}>
        <Link
          href={"/"}
          className={`${sideBarStyles.navlink} ${
            pathname === "/" ? sideBarStyles.active : ""
          }`}
        >
          Hall of Fame
        </Link>
        <Link
          href={"/gallery"}
          className={`${sideBarStyles.navlink} ${
            pathname === "/gallery" ? sideBarStyles.active : ""
          }`}
        >
          Gallery
        </Link>
        <Link
          href={"/about"}
          className={`${sideBarStyles.navlink} ${
            pathname === "/about" ? sideBarStyles.active : ""
          }`}
        >
          About
        </Link>
        <a
          target={"_blank"}
          href={"https://taste.stlr.cx/"}
          className={`${sideBarStyles.navlink}`}
        >
          Inspiration <ExternalLink size={14} />
        </a>
      </div>
      <div className={sideBarStyles.footer}>
        {isAuthenticated && (
          <div style={{ display: "inline-block", width: "fit-content" }}>
            <Link
              href={"/manage"}
              className={`${sideBarStyles.footerlink} ${"external-link"} ${
                pathname === "/manage" ? sideBarStyles.active : ""
              }`}
            >
              Manage
            </Link>
          </div>
        )}

        {isAuthenticated && (
          <div style={{ display: "inline-block", width: "fit-content" }}>
            <Link
              href={"/upload"}
              className={`${"external-link"} ${sideBarStyles.footerlink} ${
                pathname === "/upload" ? sideBarStyles.active : ""
              }`}
            >
              Upload
            </Link>
          </div>
        )}

        {isAuthenticated && (
          <div style={{ display: "inline-block", width: "fit-content" }}>
            <Link
              href={"/logout"}
              className={`${"external-link"} ${sideBarStyles.footerlink}`}
            >
              Logout
            </Link>
          </div>
        )}
        {isAuthenticated && <br />}
        <div style={{ display: "inline-block", width: "fit-content" }}>
          <a
            target="_blank"
            href={"https://github.com/ckhawks/photography"}
            className={`external-link ${sideBarStyles.footerlink}`}
          >
            GitHub
            <ExternalLink size={14} />
          </a>
        </div>

        {!isAuthenticated && (
          <div style={{ display: "inline-block", width: "fit-content" }}>
            <Link
              href={"/login"}
              className={`${"external-link"} ${sideBarStyles.footerlink}`}
            >
              Admin Login <ExternalLink size={14} />
            </Link>
          </div>
        )}

        <p
          className={styles.description}
          style={{ margin: "0", fontSize: "14px" }}
        >
          Stellaric © {CURRENT_YEAR}
        </p>
      </div>
    </div>
  );
};
export default NavigationSidebar;
