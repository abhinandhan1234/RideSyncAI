# Run RideSync on your computer

This source package includes the cinematic frontend and the booking backend from
this session. Nothing has been pushed to GitHub. Download/extract the ZIP first;
commands must run in the extracted `RideSyncAI` folder on **your computer**, not in
the cloud terminal. `localhost` will then refer to your own computer.

## Requirements

- Node.js **24 LTS** with npm (Windows, macOS, or a supported Linux distribution).
- Internet for the first dependency install and MongoDB binary download.
- A WebGL 2-capable browser for the 3D taxi. A static illustration is provided when
  WebGL is unavailable or reduced motion is enabled.

## Quick start — no MongoDB installation or credentials

Open Terminal / PowerShell in the extracted `RideSyncAI` folder:

```sh
npm run install:local
npm run local
```

Wait for both servers to say they are ready, then open:

- Frontend: http://localhost:5173
- Backend health: http://localhost:5002/api/health

The launcher runs the existing primary backend with a disposable MongoDB replica
set and three synthetic drivers. It never connects to your production database.
Demo records disappear when it stops. The initial MongoDB download may take a few
minutes. Leave the terminal open; press Ctrl+C to stop. If a port is already used,
stop its previous server first. The launch script works from paths containing spaces.

The frontend forwards `/api` requests to the backend. Passenger/Captain login
screens explicitly show integration pending: there is no backend auth service.
The preserved Book Ride page is still a placeholder; the full booking lifecycle
is exercised through the backend API, described in `backend/docs/API.md`.

## Persistent database

Copy `backend/.env.example` to `backend/.env` with your file manager. Set
`MONGODB_URI` to your own Atlas or MongoDB replica-set database, then run:

```sh
npm run local:persistent
```

An empty persistent database has no drivers until you provision them. Standalone
MongoDB is unsupported by the current booking backend; it requires transactions.
Never put a database URI or secret into frontend configuration.

## Run independently

Terminal 1:
```sh
cd backend
npm ci
npm run demo
```

Terminal 2:
```sh
cd frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

## Verify/build

```sh
npm run check:vehicle
npm run build
npm --prefix backend test
```

The vehicle check verifies every mesh's transform and wheel pivots against the
original GLB. `npm run build` creates `frontend/dist`. Preview that build with
`npm run preview`; Vite prints its preview port (normally 4173). Deep-link hosting
requires rewriting unknown paths to `index.html`.

## Troubleshooting

- `npm` not found: install Node 24 LTS, then reopen your terminal.
- PowerShell blocks `npm.ps1`: run the commands using `npm.cmd` or Command Prompt.
- Cannot connect: wait for server readiness and keep both processes running. The
  old cloud workspace URLs do not access the copy on your computer.
- MongoDB binary cannot download: check network access to MongoDB's download host;
  alternatively configure Atlas and use persistent mode.
- Linux MongoDB library errors: install your distribution's required OpenSSL 3
  runtime or use Atlas. No machine-specific binary is included in this archive.
- Only an illustration appears: check WebGL 2/hardware acceleration and the OS
  reduced-motion preference. The page and navigation still work without 3D.

The archive intentionally excludes node_modules, .git, .env secrets, build outputs,
cache folders and temporary databases. It retains `.env.example` templates,
source, lockfiles, model assets and reference directories. Run dependency
installation after extraction; don't copy node_modules between operating systems.
