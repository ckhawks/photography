import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAlignJustify, faCircle, faTableCells } from "@fortawesome/free-solid-svg-icons";
import styles from "../../app/page.module.scss";

const MODES = [
  { id: "grid", label: "Grid", icon: faTableCells },
  { id: "column", label: "Column", icon: faAlignJustify },
];

/**
 * Grid or column, for any page that shows photos.
 *
 * `params` is whatever that page needs to keep as you switch — the gallery
 * carries its tier filter, an album carries its sort — so the toggle never
 * silently drops the rest of the query string.
 */
export default function ViewControls({ view, basePath, params }) {
  return (
    <div className={`${styles["view-controls"]} ${styles["controls-group"]}`}>
      <div className={styles["controls-label"]}>View</div>
      <div className={styles["controls-buttons"]}>
        {MODES.map((mode) => {
          const next = new URLSearchParams(params);
          next.set("view", mode.id);
          return (
            <Link
              key={mode.id}
              href={`${basePath}?${next.toString()}`}
              className={`${styles["control-button"]} ${view === mode.id ? styles.active : ""}`}
              replace
            >
              <FontAwesomeIcon icon={mode.icon} /> {mode.label}
              {view === mode.id && (
                <FontAwesomeIcon icon={faCircle} className={styles["circle"]} />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
