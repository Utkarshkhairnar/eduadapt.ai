#!/bin/zsh
# ─────────────────────────────────────────────
#  EduAdapt AI — One-command startup script
#  Usage:  ./start.sh
# ─────────────────────────────────────────────

export NODE_BIN="/Users/utkarshmacbook/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
export PNPM_BIN="/Users/utkarshmacbook/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback"
export PATH="$NODE_BIN:$PNPM_BIN:$PATH"

PROJECT_DIR="/Users/utkarshmacbook/EduAdapt AI"

echo ""
echo "🚀  EduAdapt AI — Starting servers..."
echo ""

# ── Backend ──────────────────────────────────
echo "⚙️  Starting backend on http://localhost:8000"
cd "$PROJECT_DIR"
source venv/bin/activate
"$PROJECT_DIR/venv/bin/uvicorn" backend.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# ── Frontend ─────────────────────────────────
echo "🌐  Starting frontend on http://localhost:3000"
cd "$PROJECT_DIR/frontend"
pnpm run dev --host 0.0.0.0 --port 3000 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "✅  Both servers running."
echo "   Frontend → http://localhost:3000"
echo "   Backend  → http://localhost:8000"
echo ""
echo "   Press Ctrl+C to stop both."
echo ""

# Wait and clean up on Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'; exit" INT TERM
wait
