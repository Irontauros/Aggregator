const { spawn } = require("child_process");
const qrcode = require("qrcode-terminal");

const tunnel = spawn(
  "C:\\Program Files (x86)\\Cloudflared\\cloudflared.exe",
  ["tunnel", "--url", "http://localhost:3000"]
);

let urlShown = false;

function handleData(data) {
  const text = data.toString();

  const match = text.match(
    /https:\/\/[a-z0-9-]+\.trycloudflare\.com/
  );

  if (match && !urlShown) {
    urlShown = true;

    const url = match[0];

    console.log("\n🌍 Public URL:");
    console.log(url);

    console.log("\n📱 QR Code:\n");
    qrcode.generate(url, { small: true });
  }
}

tunnel.stdout.on("data", handleData);
tunnel.stderr.on("data", handleData);

tunnel.on("close", (code) => {
  console.log(`\nTunnel process exited with code ${code}`);
});