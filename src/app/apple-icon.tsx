import { ImageResponse } from "next/og";
import { ICON_INK, maskableIconSvg } from "@/lib/appIcon";

// iOS ignores SVG touch icons and, with none supplied, falls back to a letter
// tile generated from the site name. Rendering a PNG here is what stops the
// home screen showing a plain "Y".
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const svg = `data:image/svg+xml;base64,${Buffer.from(maskableIconSvg()).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: ICON_INK,
        }}
      >
        <img src={svg} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
