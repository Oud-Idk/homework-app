import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            new URL('https://lh3.googleusercontent.com/**'),
            new URL('https://homework.solartuff.co.id/storage/user-uploads/**')
        ]
    },
    output: 'standalone',
};

export default nextConfig;
