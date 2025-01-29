"use client";

import styles from "./ButtonRefresh.module.scss";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRefresh } from "@fortawesome/free-solid-svg-icons";

const ButtonRefresh = (props) => {
  const refresh = () => {
    // Refresh the page
    location.reload();
  };

  return (
    <div onClick={refresh} className={styles.ButtonRefresh}>
      <FontAwesomeIcon
        icon={faRefresh}
        size={"sm"}
        style={{ height: "14px" }}
      />
      Refresh
    </div>
  );
};
export default ButtonRefresh;
