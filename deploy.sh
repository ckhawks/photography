#!/usr/bin/env bash
#
# Build photos.stlr.cx locally and ship a standalone artifact to Dallas.
#
# Never build on the server: server-side npm install / next build is what makes
# unit memory peak far above serving size and blocks a useful MemoryMax.
#
#   ./deploy.sh                build, ship, activate, smoke test
#   ./deploy.sh --no-pull      skip git pull (deploy the working tree)
#   ./deploy.sh --rollback     point current at the previous release, restart
#
# Run from Linux with the same platform as the server (Ubuntu 24.04, glibc
# 2.39, x86_64, node 24.19.0). On SENTINEL that means WSL, from a WSL-native
# checkout, never /mnt/c.

set -euo pipefail

APP=photography
SERVER=dallas
BASE=/root/apps/$APP
PORT=3011
NODE=/usr/local/bin/node24
RELEASE=$(date -u +%Y%m%d-%H%M%S)

PULL=1
ROLLBACK=0
for arg in "$@"; do
  case "$arg" in
    --no-pull) PULL=0 ;;
    --rollback) ROLLBACK=1 ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

say() { printf '\n== %s\n' "$1"; }

if [ "$ROLLBACK" = "1" ]; then
  say "rolling back"
  ssh "$SERVER" bash -s <<ROLLBACK_SCRIPT
set -euo pipefail
cd $BASE/releases
current=\$(basename "\$(readlink $BASE/current)")
previous=\$(ls -1 | grep -v "^\$current\$" | sort | tail -1)
[ -n "\$previous" ] || { echo "no previous release"; exit 1; }
ln -sfn "$BASE/releases/\$previous" "$BASE/current"
systemctl restart $APP
echo "rolled back: \$current -> \$previous"
ROLLBACK_SCRIPT
  exit 0
fi

# ---- guards -----------------------------------------------------------------
case "$(uname -s)" in Linux) ;; *) echo "FAIL: build on Linux, not $(uname -s)"; exit 1 ;; esac
case "$(command -v node)" in
  /mnt/c/*) echo "FAIL: node resolves to the Windows install; use nvm inside WSL"; exit 1 ;;
  "") echo "FAIL: no node on PATH"; exit 1 ;;
esac
case "$PWD" in /mnt/c/*) echo "FAIL: building under /mnt/c is IO-bound over 9p; clone into ~/apps"; exit 1 ;; esac

BUILD_NODE=$(node -v)
SERVER_NODE=$(ssh "$SERVER" "$NODE -v")
if [ "$BUILD_NODE" != "$SERVER_NODE" ]; then
  echo "FAIL: node mismatch, building on $BUILD_NODE but server runs $SERVER_NODE"
  exit 1
fi
echo "node $BUILD_NODE on both sides"

# ---- build ------------------------------------------------------------------
if [ "$PULL" = "1" ]; then
  say "git pull"
  git pull --ff-only
fi

say "npm ci"
npm ci

say "next build"
npm run build

# ---- assemble ---------------------------------------------------------------
# standalone deliberately excludes public/ and .next/static; without them every
# static asset 404s at runtime.
say "assemble artifact"
STAGE=$(mktemp -d)
cp -r .next/standalone/. "$STAGE/"
mkdir -p "$STAGE/.next"
cp -r .next/static "$STAGE/.next/static"
[ -d public ] && cp -r public "$STAGE/public"
du -sh "$STAGE" | awk '{print "  artifact: " $1}'

# ---- ship -------------------------------------------------------------------
say "ship release $RELEASE"
ssh "$SERVER" "mkdir -p $BASE/releases/$RELEASE $BASE/shared"
rsync -a --delete "$STAGE/" "$SERVER:$BASE/releases/$RELEASE/"
rm -rf "$STAGE"

say "activate"
ssh "$SERVER" bash -s <<ACTIVATE
set -euo pipefail
test -f $BASE/shared/.env.local || { echo "FAIL: $BASE/shared/.env.local is missing"; exit 1; }
ln -sfn $BASE/releases/$RELEASE $BASE/current
systemctl restart $APP
ACTIVATE

# ---- smoke test -------------------------------------------------------------
say "smoke test"
sleep 3
code=$(ssh "$SERVER" "curl -s -o /dev/null -w '%{http_code}' --max-time 20 http://127.0.0.1:$PORT/")
echo "  GET / -> $code"
if [ "$code" != "200" ]; then
  echo "FAIL: unhealthy, rolling back"
  "$0" --rollback
  exit 1
fi

say "prune to 3 releases"
ssh "$SERVER" "cd $BASE/releases && ls -1 | sort | head -n -3 | xargs -r rm -rf; ls -1 | sort"

echo
echo "deployed $RELEASE"
