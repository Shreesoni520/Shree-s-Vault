import os from "node:os";
import type { NextConfig } from "next";

function lanDevOrigins() {
  const hosts = new Set([
    "localhost",
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "172.20.*.*",
    "172.21.*.*",
    "172.22.*.*",
    "172.23.*.*",
    "172.24.*.*",
    "172.25.*.*",
    "172.26.*.*",
    "172.27.*.*",
    "172.28.*.*",
    "172.29.*.*",
    "172.30.*.*",
    "172.31.*.*",
  ]);
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      const ipv4 = addr.family === "IPv4" || addr.family === 4;
      if (ipv4 && !addr.internal) hosts.add(addr.address);
    }
  }
  const origins: string[] = [];
  for (const host of hosts) {
    origins.push(host, `${host}:3000`);
  }
  return origins;
}

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["@prisma/client"],
  agentRules: false,
  allowedDevOrigins: lanDevOrigins(),
};

export default nextConfig;
