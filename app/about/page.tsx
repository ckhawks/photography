import Head from "next/head";
import React from "react";

import "inter-ui/inter.css";
import styles from "../page.module.scss";
import NavigationSidebar from "../../components/NavigationSidebar";

const AboutPage = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/about`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return <p className="error-message">Failed to load photo counts</p>;
  }

  const { tier1Count, tier2Count, tier3Count, tier0Count } = await res.json();

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
                src={"/api/resource/headshot.jpeg"}
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
