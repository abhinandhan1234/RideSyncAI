# Test RideSync on an Android phone over Wi-Fi

Vite listens on `0.0.0.0:5173` and Express listens on `0.0.0.0:5002`. The browser
uses the same-origin `/api` proxy, so the phone does not need a hard-coded API
address. MongoDB remains on the laptop and is never exposed to Wi-Fi.

## Quick disposable demo

1. Connect the Windows laptop and Android phone to the same trusted Wi-Fi.
   Disable mobile data/VPN temporarily if the phone routes traffic away from Wi-Fi.
2. In PowerShell, open the repository root and run:

   ```powershell
   npm run install:local
   npm run local
   ```

   Wait for both server readiness messages. `npm run local` starts the existing
   backend with a temporary MongoDB replica set; database changes are removed
   when you stop it with Ctrl+C.
3. Find the laptop's IPv4 address in PowerShell:

   ```powershell
   ipconfig
   ```

   Use the IPv4 Address under the Wi-Fi adapter connected to the phone (for
   example, `192.168.1.42`). Do not use the WSL, virtual-machine, Ethernet, or
   VPN adapter address.
4. On Android Chrome, open `http://<laptop-ip>:5173`, such as
   `http://192.168.1.42:5173`.
5. To stop the demo, return to PowerShell and press Ctrl+C.

## Persistent MongoDB

Copy `backend/.env.example` to `backend/.env`; set your own MongoDB URI and a
random `JWT_SECRET` of at least 32 characters. Keep MongoDB bound to the laptop
or Atlas and do not open its port in Windows Firewall. In PowerShell terminal 1:

```powershell
cd backend
npm run dev
```

In PowerShell terminal 2 from the repository root:

```powershell
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

Then open `http://<laptop-ip>:5173` on Android. The frontend proxies `/api` and
`/uploads` to `127.0.0.1:5002` from the laptop, so `VITE_API_URL` remains `/api`.
If a separate frontend host is used, set `VITE_API_URL` to that host's reachable
backend address and add the exact frontend origin to `CLIENT_ORIGINS`.

Some Android browsers block Geolocation on an HTTP LAN address because it is not
a secure context. Ride booking still supports map selection. The Sarathi
dashboard can use GPS when allowed, or accept latitude/longitude entered from a
map pin; those coordinates must be in a configured Belagavi zone.

## Firewall and network troubleshooting

- Confirm both devices use the same Wi-Fi and the laptop IPv4 address has not
  changed. Guest Wi-Fi may block device-to-device traffic; use a trusted private
  network without client isolation.
- Keep both terminal windows running. Confirm Vite reports port 5173 and Express
  reports port 5002; check `http://localhost:5002/api/health` on the laptop.
- If Windows Defender Firewall prompted when Node started, allow Node.js on the
  **Private networks** profile only. Do not allow it on Public networks.
- Verify listening ports from PowerShell with
  `Get-NetTCPConnection -State Listen -LocalPort 5173,5002`.
- If the firewall prompt was dismissed, open **Windows Security → Firewall &
  network protection → Allow an app through firewall**, choose **Change
  settings**, then allow Node.js on **Private** only. If policy requires port
  rules, create inbound TCP rules for 5173 and 5002 scoped to the Private profile
  and local subnet. Do not create a public port-forward on the router.
- Do not expose MongoDB (normally port 27017), credentials, or dev servers to the
  public internet. Remove any temporary firewall rule after testing if no longer
  needed.
- For direct backend calls from a separately hosted frontend, list only trusted
  origins in `CLIENT_ORIGINS`, comma-separated. Credentials are not exposed to
  frontend build variables.
