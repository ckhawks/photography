import styles from "./ButtonSwap.module.css";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShuffle } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

const ButtonSwap = (props) => {
  return (
    <Link href={props.to} className={styles.ButtonSwap}>
      <FontAwesomeIcon
        icon={faShuffle}
        size={"sm"}
        style={{ height: "14px" }}
      />
      {props.text}
    </Link>
  );
};
export default ButtonSwap;
