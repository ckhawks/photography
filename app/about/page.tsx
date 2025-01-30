import Head from "next/head";
import React from "react";

import "inter-ui/inter.css";
import styles from "../page.module.scss";
import NavigationSidebar from "../../components/NavigationSidebar";
import Image from "next/image";

const AboutPage = () => {
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
