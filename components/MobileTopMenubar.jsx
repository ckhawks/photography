"use client";

import styles from "../app/page.module.scss";
import menubarStyles from "./MobileTopMenubar.module.scss";
import { Menu } from "react-feather";
import { useState } from "react";
import NavigationSidebar from "./NavigationSidebar";

const MobileTopMenubar = (props) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      <div className={menubarStyles.menubar}>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className={menubarStyles.menuButton}
        >
          <Menu size={24} />
        </button>
      </div>
      {/* Sidebar Popover */}
      {isSidebarOpen && (
        <div
          className={menubarStyles.overlay}
          onClick={() => setIsSidebarOpen(false)}
        >
          <NavigationSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            isMobileSidebar={true}
          />
        </div>
      )}
    </>
  );
};
export default MobileTopMenubar;
