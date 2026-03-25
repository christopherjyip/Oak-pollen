#!/bin/bash
#
# CloudKey Setup Script for Pool Controller
#
# This script sets up:
# 1. Node.js 20 (if not installed)
# 2. The pool controller app
# 3. Tailscale for remote access
# 4. Cron job for temperature polling
# 5. Systemd service for the Next.js app
#
# Run as root on your UniFi CloudKey Gen2 Plus:
#   curl -sL <url> | bash
# or:
#   chmod +x setup-cloudkey.sh && sudo ./setup-cloudkey.sh
#

set -e

APP_DIR="/opt/pool-controller"
APP_USER="pool"
LOG_DIR="/var/log"

echo "=== Pool Controller - CloudKey Setup ==="
echo ""

# ── Check if running as root ──
if [ "$(id -u)" -ne 0 ]; then
  echo "Error: This script must be run as root (sudo)"
  exit 1
fi

# ── 1. Install Node.js 20 ──
echo "[1/6] Checking Node.js..."
if command -v node &>/dev/null && node -v | grep -q "v20"; then
  echo "  Node.js $(node -v) already installed"
else
  echo "  Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  echo "  Installed Node.js $(node -v)"
fi

# ── 2. Install Tailscale ──
echo "[2/6] Checking Tailscale..."
if command -v tailscale &>/dev/null; then
  echo "  Tailscale already installed"
  tailscale status || echo "  (not connected yet - run: sudo tailscale up)"
else
  echo "  Installing Tailscale..."
  curl -fsSL https://tailscale.com/install.sh | sh
  echo "  Tailscale installed. Run 'sudo tailscale up' to connect."
fi

# ── 3. Create app user ──
echo "[3/6] Setting up app user..."
if id "$APP_USER" &>/dev/null; then
  echo "  User '$APP_USER' already exists"
else
  useradd --system --shell /bin/false --home-dir "$APP_DIR" "$APP_USER"
  echo "  Created system user '$APP_USER'"
fi

# ── 4. Set up app directory ──
echo "[4/6] Setting up application..."
mkdir -p "$APP_DIR/data"

if [ -d "$APP_DIR/package.json" ] || [ -f "$APP_DIR/package.json" ]; then
  echo "  App directory exists, updating..."
  cd "$APP_DIR"
  git pull origin main 2>/dev/null || echo "  (not a git repo, skipping pull)"
else
  echo "  Cloning/copying app to $APP_DIR..."
  echo "  NOTE: Copy your project files to $APP_DIR or clone your repo:"
  echo "    git clone <your-repo-url> $APP_DIR"
fi

# Create .env if it doesn't exist
if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" << 'ENVEOF'
# Pool Controller Configuration
# IntelliCenter connection (local network)
INTELLICENTER_HOST=
INTELLICENTER_PORT=6680

# Set to "false" for live mode
DEMO_MODE=false

# Database path (on CloudKey's 1TB SSD)
DB_PATH=/opt/pool-controller/data/pool-history.db

# Data retention in days
RETENTION_DAYS=90

# Weather Underground (optional)
WUNDERGROUND_API_KEY=
WUNDERGROUND_STATION_ID=
WUNDERGROUND_LAT=
WUNDERGROUND_LON=
ENVEOF
  echo "  Created $APP_DIR/.env - edit this with your IntelliCenter IP!"
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ── 5. Set up systemd service ──
echo "[5/6] Setting up systemd service..."
cat > /etc/systemd/system/pool-controller.service << SERVICEEOF
[Unit]
Description=Pool Controller Web Interface
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node $APP_DIR/.next/standalone/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
echo "  Created pool-controller.service"
echo "  Start with: sudo systemctl start pool-controller"
echo "  Enable at boot: sudo systemctl enable pool-controller"

# ── 6. Set up cron job for temperature polling ──
echo "[6/6] Setting up temperature polling cron job..."
CRON_LINE="*/15 * * * * cd $APP_DIR && /usr/bin/npx tsx scripts/poll-temperatures.ts >> $LOG_DIR/pool-poller.log 2>&1"

# Install tsx globally for the cron job
npm install -g tsx 2>/dev/null || echo "  tsx already installed"

# Add cron job for the app user
(crontab -u "$APP_USER" -l 2>/dev/null | grep -v "poll-temperatures"; echo "$CRON_LINE") | crontab -u "$APP_USER" -
echo "  Cron job installed (every 15 minutes)"

# Set up log rotation
cat > /etc/logrotate.d/pool-controller << LOGEOF
$LOG_DIR/pool-poller.log {
  daily
  missingok
  rotate 7
  compress
  notifempty
}
LOGEOF

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit $APP_DIR/.env with your IntelliCenter IP address"
echo "     Find it in your UniFi controller or run:"
echo "     npx tsx -e \"const {FindUnits}=require('node-intellicenter'); const f=new FindUnits(); f.on('serverFound',(u)=>{console.log(u.addressStr+':'+u.port);f.close()}); f.search()\""
echo ""
echo "  2. Copy your project files to $APP_DIR and build:"
echo "     cd $APP_DIR && npm ci && npm run build"
echo ""
echo "  3. Start the service:"
echo "     sudo systemctl enable --now pool-controller"
echo ""
echo "  4. Connect Tailscale:"
echo "     sudo tailscale up"
echo ""
echo "  5. Access from anywhere via Tailscale:"
echo "     http://<cloudkey-tailscale-ip>:3000"
echo ""
echo "  6. (Optional) Set up Weather Underground:"
echo "     Add your API key and station ID to $APP_DIR/.env"
echo ""
