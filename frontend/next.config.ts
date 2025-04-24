import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/auth/login',
        permanent: false, // Usa `false` para redirecciones temporales (302)
      },
    ];
  },
};

export default nextConfig;
