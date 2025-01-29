import styles from "./ButtonBack.module.css";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

const ButtonBack = (props) => {
  return (
    <Link href={props.to} className={styles.ButtonBack}>
      <FontAwesomeIcon
        icon={faArrowLeft}
        size={"sm"}
        style={{ height: "14px" }}
      />
      {props.text}
    </Link>
  );
};
export default ButtonBack;
