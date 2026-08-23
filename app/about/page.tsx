import Head from "next/head";
import React from "react";

import "inter-ui/inter.css";
import styles from "../page.module.scss";
import NavigationSidebar from "../../components/NavigationSidebar";
import { imageUrl } from "../../constants/images";
import { getTierCounts } from "../../util/db/counts";

const AboutPage = async () => {
  // was fetching its own /api/about route over HTTP from a server component
  let tier0Count = 0;
  let tier1Count = 0;
  let tier2Count = 0;
  let tier3Count = 0;
  try {
    ({ tier0Count, tier1Count, tier2Count, tier3Count } = await getTierCounts());
  } catch (error) {
    console.error("Failed to load photo counts:", error);
    return <p className="error-message">Failed to load photo counts</p>;
  }

  return (
    <div className={`${styles.home} ${styles.body}`}>
      <NavigationSidebar />
      <div className={styles.all}>
        <Head>
          <link
            href="https://fonts.googleapis.com/css?family=Inter"
            rel="stylesheet"
          />
        </Head>
        <div className={styles.container}>
          <h1 className={styles.title}>About</h1>
          <p className={styles.description}>Who am I?</p>

          <div className={styles.row} style={{ gap: "2rem" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                minWidth: "50%",
                justifyContent: "top",
                height: "100%",
                marginBottom: "auto",
              }}
            >
              <p style={{ color: "rgb(49 49 49)" }}>
                Carter Hawks is a photographer from Austin, Texas. He is
                available for booking for portrait shoots, events, or other
                work.
                <br />
                <br />
                He can be contacted on Discord @Stellaric or by email,
                hello@stellaric.pw.
              </p>
              <br />
              <div className={styles["about-stats-card"]}>
                <center>
                  <h3
                    style={{
                      paddingBottom: "1rem",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    Photo Count
                  </h3>
                </center>

                <br />
                <table style={{ borderSpacing: "0px" }}>
                  <tbody>
                    <tr>
                      <td style={{ paddingRight: "8rem" }}>
                        <b>Total</b>
                      </td>
                      <td>
                        <b>
                          {Number(tier1Count) +
                            Number(tier2Count) +
                            Number(tier3Count)}
                        </b>
                      </td>
                    </tr>
                    <tr>
                      <td>Showcase</td>
                      <td>{tier3Count}</td>
                    </tr>
                    <tr>
                      <td>Notable</td>
                      <td>{tier2Count}</td>
                    </tr>
                    <tr>
                      <td>Extras</td>
                      <td>{tier1Count}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <img
                src={imageUrl("headshot.jpeg")}
                style={{ minWidth: "100%", maxWidth: "100%" }}
                className={styles.photo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
