import type { NextConfig } from "next";

const isProdPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: isProdPages ? "export" : undefined,
  basePath: isProdPages ? "/gorkiy-site" : "",
  env: {
    NEXT_PUBLIC_BASE_PATH: isProdPages ? "/gorkiy-site" : "",
  },
  images: {
    unoptimized: true,
  },
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
