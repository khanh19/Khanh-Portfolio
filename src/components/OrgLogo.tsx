import type { Organization } from "../data/portfolio";
import "./OrgLogo.css";

interface OrgLogoProps {
  org: Organization;
  size?: "md" | "lg";
}

/**
 * Employer/school mark on a rounded tile. Decorative: the organization's name
 * is always printed next to it, so the image carries an empty alt.
 */
export default function OrgLogo({ org, size = "md" }: OrgLogoProps) {
  return (
    <span className={`org-logo org-logo--${size}${org.logo ? "" : " org-logo--monogram"}`} aria-hidden="true">
      {org.logo ? (
        <img src={org.logo} alt="" width={48} height={48} loading="lazy" decoding="async" />
      ) : (
        <span className="org-logo__monogram">{org.monogram}</span>
      )}
    </span>
  );
}
