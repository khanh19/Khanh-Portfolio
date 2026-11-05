import "react";

declare module "react" {
  /** Allow CSS custom properties (e.g. `--i`) in inline styles without casts. */
  interface CSSProperties {
    [customProperty: `--${string}`]: string | number | undefined;
  }
}
