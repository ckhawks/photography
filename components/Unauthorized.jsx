"use client";

import styles from "../app/page.module.scss";
import NavigationSidebar from "./NavigationSidebar";

export const Unauthorized = () => {
  return (
    <div className={`${styles.home} ${styles.body}`}>
      <NavigationSidebar />
      <div className={styles.all}>
        <div className={styles.container}>
          <div className={styles.rowColumns}>
            <div>
              {/* <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexGrow: "1",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}
              ></div> */}
            </div>
          </div>
          <h1 className={styles.title}>Unauthorized</h1>

          <p className={styles.description}>
            Sorry, but you can't access that.
          </p>
        </div>
      </div>
    </div>
  );
};
export default Unauthorized;
