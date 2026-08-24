import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faCircle, faFilm } from "@fortawesome/free-solid-svg-icons";
import styles from "../../app/page.module.scss";
import { MEDIUMS } from "../../constants/mediums";

const ICONS = { film: faFilm, digital: faCamera };

/**
 * Film or digital, for any page that shows photos.
 *
 * A toggle rather than a multi-select: with two options, having both on is the
 * same as having neither, so clicking the active chip clears it instead of
 * offering a state that means nothing.
 *
 * Link-based like ViewControls, so it works in a server component and the
 * filter survives a reload and a shared URL.
 *
 * `params` is what the page needs to keep — the gallery carries its tiers, seed
 * and sort, an album carries its sort — so switching medium never silently
 * drops the rest of the query string. `page` is deliberately not carried:
 * filtering changes how many pages there are, so page 4 of the old set is
 * meaningless in the new one.
 */
export default function MediumControls({ medium, basePath, params = [] }) {
  return (
    <div className={styles["controls-group"]}>
      <div className={styles["controls-label"]}>Shot on</div>
      <div className={styles["controls-buttons"]}>
        {MEDIUMS.map((option) => {
          const active = medium === option.id;
          const next = new URLSearchParams(params);
          next.delete("page");
          if (active) next.delete("medium");
          else next.set("medium", option.id);

          const query = next.toString();
          return (
            <Link
              key={option.id}
              href={query ? `${basePath}?${query}` : basePath}
              className={`${styles["control-button"]} ${active ? styles.active : ""}`}
              replace
              scroll={false}
            >
              <FontAwesomeIcon icon={ICONS[option.id]} /> {option.label}
              {active && <FontAwesomeIcon icon={faCircle} className={styles["circle"]} />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
