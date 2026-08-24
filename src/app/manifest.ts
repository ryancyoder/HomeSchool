import type { MetadataRoute } from "next";
import { ICON_INK } from "@/lib/appIcon";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yoder Home School",
    short_name: "Home School",
    description:
      "Weekly plans, daily check-off and progress for Seth and Selah.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: ICON_INK,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
