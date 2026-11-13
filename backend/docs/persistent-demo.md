# Persistent local IntelliMarg demo

From the backend directory, use an unused, dedicated data directory and port. Requires mongod, mongosh, the existing PS2 Python environment and backend dependencies. Bind only to loopback. Use these commands for local development.

```sh
DEMO_DATA="$HOME/.local/share/intellimarg-demo"
mkdir -p "$DEMO_DATA"
mongod --dbpath "$DEMO_DATA" --bind_ip 127.0.0.1 --port 27183 --replSet intellimargDemo --fork --logpath "$DEMO_DATA/mongod.log"
# First setup only
mongosh --quiet --port 27183 --eval 'rs.initiate({_id:"intellimargDemo",members:[{_id:0,host:"127.0.0.1:27183"}]})'
mongosh --quiet --port 27183 --eval 'db.hello().isWritablePrimary'
```

Once primary, set DEMO_YATRI_PASSWORD and DEMO_SARATHI_PASSWORD privately in the shell, each at least 12 characters. Seed once with `node scripts/seed-persistent-demo.js`. The accounts are yatri@example.invalid and sarathi@example.invalid. Repeating the seed preserves existing passwords, rides, driver positions and availability.

Set MONGODB_URI to `mongodb://127.0.0.1:27183/intellimarg_demo?replicaSet=intellimargDemo`, supply a private stable JWT_SECRET of at least 32 characters, and set PS2_PYTHON to the configured interpreter. Run `npm start` (port 5002 by default). In frontend run `npm run dev`. Keep private values outside Git.

For restart, stop this mongod with Ctrl-C in foreground mode or send TERM to its specific PID. Repeat the mongod command with the same data directory and omit rs.initiate. The disposable fullstack-dev launcher creates its own replica set and URI. It does not attach to this directory. Never point test tools at this persistent instance.

On the verified local setup, the shell variables for the seed accounts and JWT are in the private file `$DEMO_DATA/demo.env` (mode 600). Source it in the backend shell. The seed uses a fixed local URI and never reads MONGODB_URI.
