import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tailwind v4 runs as a Turbopack loader in this template.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
