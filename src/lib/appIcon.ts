/**
 * One drawing, used for the browser tab, the iOS home screen and the web
 * manifest, so the app looks the same everywhere it is pinned.
 *
 * An open book on warm ink. Kept to two bold shapes and a spine because the
 * favicon renders at 16px, where anything finer turns to mud.
 */
const INK = "#2a211b";
const PAGE = "#faf6ef";
const SPINE = "#d97706";

function book(): string {
  return `
    <path d="M7 16C16 11 26 12 32 18V51C26 45 16 44 7 48Z" fill="${PAGE}"/>
    <path d="M57 16C48 11 38 12 32 18V51C38 45 48 44 57 48Z" fill="${PAGE}"/>
    <path d="M32 18V51" stroke="${SPINE}" stroke-width="3.5" stroke-linecap="round"/>
  `;
}

/** Rounded tile, for the browser tab where nothing masks it for us. */
export function iconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="${INK}"/>
  ${book()}
</svg>`;
}

/** Full-bleed square: iOS and Android apply their own mask. */
export function maskableIconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" fill="${INK}"/>
  ${book()}
</svg>`;
}

export const ICON_INK = INK;
