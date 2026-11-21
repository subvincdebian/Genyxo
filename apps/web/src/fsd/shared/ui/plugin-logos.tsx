// Official brand logos for the plugin catalog, served from /images/plugins.
// Sources: theSVG (@thesvg/icons, MIT) and each brand's own site icon for
// Xmind, Mobbin, Higgsfield and Prime Radiant (Superpowers). Logos that are
// dark glyphs have a "-light" file for light tiles; the main file is drawn
// light-on-dark. Trademarks belong to their owners.
type Logo = { ext: "svg" | "png"; light?: boolean };

const LOGOS: Record<string, Logo> = {
  "apple-music": { ext: "svg" },
  atlassian: { ext: "svg" },
  binance: { ext: "svg" },
  bybit: { ext: "svg", light: true },
  canva: { ext: "svg" },
  coinmarketcap: { ext: "svg", light: true },
  dropbox: { ext: "svg" },
  figma: { ext: "svg" },
  github: { ext: "svg", light: true },
  gitlab: { ext: "svg" },
  gmail: { ext: "svg" },
  "google-calendar": { ext: "svg" },
  "google-drive": { ext: "svg" },
  higgsfield: { ext: "png" },
  kahoot: { ext: "svg" },
  linear: { ext: "svg" },
  linkedin: { ext: "svg" },
  lovable: { ext: "svg" },
  malwarebytes: { ext: "svg" },
  "microsoft-teams": { ext: "svg" },
  mobbin: { ext: "svg" },
  "mongodb-atlas": { ext: "svg" },
  namecheap: { ext: "svg" },
  netlify: { ext: "svg" },
  notion: { ext: "svg" },
  "outlook-calendar": { ext: "svg" },
  "outlook-email": { ext: "svg" },
  paypal: { ext: "svg" },
  railway: { ext: "svg", light: true },
  render: { ext: "svg", light: true },
  shazam: { ext: "svg" },
  shopify: { ext: "svg" },
  spotify: { ext: "svg" },
  "stack-overflow": { ext: "svg" },
  stripe: { ext: "svg" },
  supabase: { ext: "svg" },
  superpowers: { ext: "svg", light: true },
  tripo: { ext: "svg", light: true },
  vercel: { ext: "svg", light: true },
  wix: { ext: "svg" },
  "wordpress-com": { ext: "svg" },
  xmind: { ext: "png" },
  zoom: { ext: "png" },
};

export const hasPluginLogo = (id: string) => id in LOGOS;

/** A plugin's brand logo sized to fit inside a rounded tile. */
export function PluginLogo({ id, size = 24 }: { id: string; size?: number }) {
  const logo = LOGOS[id];
  if (!logo)
    return <svg className="gx-plugin-logo" data-plugin={id} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5M13.3 5.5l-2.6 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>;
  const source = `/images/plugins/${id}`;
  const image = (src: string, className: string) => <img className={`gx-plugin-logo ${className}`} data-plugin={id} src={src} width={size} height={size} alt="" aria-hidden="true" decoding="async" draggable={false} />;
  return logo.light
    ? <>{image(`${source}.${logo.ext}`, "gx-logo-on-dark")}{image(`${source}-light.${logo.ext}`, "gx-logo-on-light")}</>
    : image(`${source}.${logo.ext}`, "");
}
