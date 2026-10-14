import { NextResponse } from "next/server";
import os from "os";

export async function GET() {
  const interfaces = os.networkInterfaces();
  let localIp = "localhost";

  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (!iface) continue;
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal && alias.address !== "127.0.0.1") {
        localIp = alias.address;
        break;
      }
    }
  }

  return NextResponse.json({ ip: localIp });
}
