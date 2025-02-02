"use client";

import { useSearchParams, useRouter } from "next/navigation";
import styles from "../../app/page.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle } from "@fortawesome/free-solid-svg-icons";

export default function FilterControls({ selectedTiers }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const toggleTier = (tier) => {
    const currentTiers = new Set(selectedTiers);
    if (currentTiers.has(tier)) {
      currentTiers.delete(tier);
    } else {
      currentTiers.add(tier);
    }

    // ✅ Build new URL params, but **remove `page`** to reset it to `1`
    const params = new URLSearchParams(searchParams);
    params.delete("photos"); // Remove all previous tier selections
    params.delete("page"); // ✅ Reset page to `1` when tiers change

    // Append selected tiers to the URL
    if (currentTiers.size > 0) {
      currentTiers.forEach((t) => params.append("photos", t));
    }

    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className={`${styles["controls-group"]} ${styles["controls-view"]}`}>
      <div className={styles["controls-label"]}>Photos</div>
      <div className={styles["controls-buttons"]}>
        {[
          { label: "Showcase", tier: 3 },
          { label: "Notable", tier: 2 },
          { label: "Extras", tier: 1 },
        ].map(({ label, tier }) => (
          <button
            key={tier}
            className={`${styles["control-button"]} ${
              selectedTiers.includes(tier) ? styles.active : ""
            }`}
            onClick={() => toggleTier(tier)}
          >
            {label}
            {selectedTiers.includes(tier) && (
              <FontAwesomeIcon icon={faCircle} className={styles["circle"]} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
