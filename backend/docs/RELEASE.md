# PS2 backend clean-checkout verification

From the repository root, with Node 22+, Python 3.13 and mongod 7 available:

    python3.13 -m venv /tmp/ridesync-release-env
    /tmp/ridesync-release-env/bin/pip install -r backend/requirements-ps2.txt
    export PS2_PYTHON=/tmp/ridesync-release-env/bin/python
    cd backend
    npm ci
    MONGOMS_SYSTEM_BINARY="$(command -v mongod)" npm test

For deployment provide JWT_SECRET, MONGODB_URI, CLIENT_ORIGIN and PS2_PYTHON.
Use a replica set for transactional joins. Keep the repository layout: backend
scripts resolve ai-engine relative to their source. Required AI assets are
phase1/{demand.py,roads.py,canonical-v1/{metadata.json,pipeline.joblib,holdout.csv}},
phase2/dispatch.py, phase3/replay.py, validation/belagavi.graphml and
phase4/{spatial.py,belagavi.graphml}. The packaged directed graph includes
OpenStreetMap attribution; © OpenStreetMap contributors, ODbL.
No download or training is needed at runtime. See API.md for payloads.
