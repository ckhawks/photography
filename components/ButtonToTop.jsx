"use client";

import styles from "./ButtonToTop.module.css";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp } from "@fortawesome/free-solid-svg-icons";

const ButtonToTop = (props) => {
  const scrollToTop = () => {
    // document.body.scrollTop = 0; // For Safari
    window.scrollTo({ top: 0, behavior: "smooth" });
    // document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
    console.log(document.body.scrollHeight);
  };

  return (
    <button onClick={scrollToTop} className={styles.ButtonToTop}>
      <FontAwesomeIcon
        icon={faArrowUp}
        size={"sm"}
        style={{ height: "14px" }}
      />
      Back to top
    </button>
  );
};
export default ButtonToTop;
