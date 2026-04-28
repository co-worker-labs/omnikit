import { SPLASH_DEVICES } from "../libs/pwa/splash-devices.mjs";

export function IOSSplashLinks() {
  return (
    <>
      {SPLASH_DEVICES.map((d) => {
        const w = d.width * d.dpr;
        const h = d.height * d.dpr;
        const href = `/icons/splash/${d.label}-${w}x${h}.png`;
        const media =
          `(device-width: ${d.width}px) and (device-height: ${d.height}px) ` +
          `and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: portrait)`;
        return <link key={href} rel="apple-touch-startup-image" href={href} media={media} />;
      })}
    </>
  );
}
