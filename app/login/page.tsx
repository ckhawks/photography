// app/login/page.tsx
"use client";
import React from "react";
import { useState } from "react";
import styles from "../page.module.scss";
import { useRouter } from "next/navigation";
import NavigationSidebar from "../../components/NavigationSidebar";

const LoginPage = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<any>(null);
  const router = useRouter();

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      // Redirect to the protected page after login
      router.push("/manage");
    } else {
      setError("Incorrect password");
    }
  };

  return (
    <div className={`${styles.home} ${styles.body}`}>
      <NavigationSidebar />
      <div className={styles.all}>
        <div className={styles.container}>
          <div className={styles.main}>
            <h1>Login</h1>
            {/*
              Plain elements. These were react-bootstrap's Form, Row, Col and
              Button, but bootstrap's stylesheet is commented out in globals
              and layout, so they only ever rendered as divs with classes
              nothing defines.
            */}
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", gap: "0.5rem", maxWidth: "500px" }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{ maxWidth: "300px", flex: 1 }}
                />
                <button type="submit">Login</button>
              </div>
              {error && <p>{error}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
