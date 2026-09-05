import os from "node:os";
import type { NextConfig } from "next";

function lanDevOrigins() {
  const hosts = new Set(["localhost", "127.0.0.1"]);
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      hosts.add(addr.address);
    }
  }
  const origins: string[] = [];
  for (const host of hosts) {
    origins.push(host, `${host}:3000`);
    const parts = host.split(".");
    if (parts.length === 4) {
      origins.push(`${parts[0]}.${parts[1]}.*.*`, `${parts[0]}.${parts[1]}.*.*:3000`);
    }
  }
  origins.push("192.168.*.*", "10.*.*.*", "172.16.*.*", "172.31.*.*");
  return [...new Set(origins)];
}

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["@prisma/client"],
  allowedDevOrigins: lanDevOrigins(),
};

export default nextConfig;
