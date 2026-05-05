#!/bin/bash

set -euo pipefail

LABEL="com.user.repo-weekly-task"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/.wake_runner.sh"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$REPO_ROOT/logs"
LOG_FILE="$LOG_DIR/wake_runner.log"
ERR_FILE="$LOG_DIR/wake_runner.err"

COMMAND="pnpm fetch-all --all --env=prod"
DAYS="S"  # default Saturday
WAKE_TIME="14:00"

# COMMAND="echo 'Hello testing the wake job!'"
# DAYS="T"
# WAKE_TIME="10:01"

# --- parse args ---
for arg in "$@"; do
    case $arg in
        --disable)
            MODE="disable"
            shift
            ;;
        --days=*)
            RAW_DAYS="${arg#*=}"
            DAYS=$(echo "$RAW_DAYS" | tr -d ' ' | tr ',' '')
            shift
            ;;
        *)
            ;;
    esac
done

MODE="${MODE:-install}"

# --- validate days ---
if [[ ! "$DAYS" =~ ^[MTWRFSU]+$ ]]; then
    echo "Invalid --days value. Use letters: M,T,W,R,F,S,U (e.g. --days=R,S)"
    exit 1
fi

function install_runner_script() {
cat > "$SCRIPT_PATH" << 'EOF'
#!/bin/bash

set -euo pipefail

REPO_ROOT="__REPO_PATH__"
LOG_DIR="$REPO_ROOT/logs"
STAMP_FILE="/tmp/repo_weekly_task_last_run"
SLEEP_FLAG_FILE="/tmp/repo_weekly_task_was_sleeping"
ALLOWED_DAYS="__DAYS__"

# Ensure logs directory exists
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log all executions (not just successes)
{
  echo "[$TIMESTAMP] Script invoked"

# Map current day of week to letter (M T W R F S U)
DAY_NUM=$(date +%u)  # 1=Mon ... 7=Sun
case $DAY_NUM in
    1) TODAY="M" ;;
    2) TODAY="T" ;;
    3) TODAY="W" ;;
    4) TODAY="R" ;;
    5) TODAY="F" ;;
    6) TODAY="S" ;;
    7) TODAY="U" ;;
esac

echo "[$TIMESTAMP] Today is $TODAY (allowed: $ALLOWED_DAYS)"

# Only run on configured days
if [[ "$ALLOWED_DAYS" != *"$TODAY"* ]]; then
    echo "[$TIMESTAMP] Not a configured day, exiting"
    exit 0
fi

# Only run once per calendar day
TODAY_DATE=$(date +%Y-%m-%d)
if [ -f "$STAMP_FILE" ] && [ "$(cat "$STAMP_FILE")" = "$TODAY_DATE" ]; then
    echo "[$TIMESTAMP] Already ran today, exiting"
    exit 0
fi

echo "$TODAY_DATE" > "$STAMP_FILE"

echo "[$TIMESTAMP] Starting fetch..."

# Detect if system woke recently (with timeout to prevent hanging)
if timeout 5 log show --predicate 'eventMessage contains[cd] "Wake from Sleep"' --last 30m 2>/dev/null | grep -q "Wake from Sleep"; then
    echo "[$TIMESTAMP] System woke from sleep recently"
    echo "1" > "$SLEEP_FLAG_FILE"
else
    echo "[$TIMESTAMP] System was already awake"
    echo "0" > "$SLEEP_FLAG_FILE"
fi

cd "$REPO_ROOT"

# Keep system awake during fetch (prevent idle sleep)
echo "[$TIMESTAMP] Preventing sleep during fetch..."
timeout 1200 caffeinate -i bash -c "pnpm fetch-all --all --env=prod" >> "$LOG_DIR/fetch.log" 2>&1 || true

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] Fetch complete"

# Sleep again only if we woke it
if [ -f "$SLEEP_FLAG_FILE" ] && [ "$(cat "$SLEEP_FLAG_FILE")" = "1" ]; then
    echo "[$TIMESTAMP] Putting system back to sleep"
    sleep 5  # Brief delay before sleep
    pmset sleepnow
fi

echo "[$TIMESTAMP] Script complete"
} >> "$LOG_DIR/wake_runner.log" 2>&1
EOF

sed -i '' "s|__REPO_PATH__|$(pwd)|g" "$SCRIPT_PATH"
sed -i '' "s|__DAYS__|$DAYS|g" "$SCRIPT_PATH"
chmod +x "$SCRIPT_PATH"
}

function install_launch_agent() {
mkdir -p "$LOG_DIR"
cat > "$PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
 "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>

    <key>Label</key>
    <string>$LABEL</string>

    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPT_PATH</string>
    </array>

    <key>StartInterval</key>
    <integer>300</integer>

    <key>ThrottleInterval</key>
    <integer>1800</integer>

    <key>StandardOutPath</key>
    <string>$LOG_FILE</string>

    <key>StandardErrorPath</key>
    <string>$ERR_FILE</string>

</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
}

function schedule_wake() {
echo "Scheduling wake for days: $DAYS at $WAKE_TIME"
sudo pmset repeat wakeorpoweron "$DAYS" "$WAKE_TIME:00"
}

function unschedule_wake() {
sudo pmset repeat cancel || true
}

function uninstall() {
echo "Disabling job..."

launchctl unload "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
rm -f "$SCRIPT_PATH"

unschedule_wake

echo "Disabled."
}

function install() {
echo "Installing job..."

install_runner_script
install_launch_agent
schedule_wake

echo "Installed."
echo "Will run at $WAKE_TIME on days: $DAYS"
}

# --- entrypoint ---

if [[ "$MODE" == "disable" ]]; then
    uninstall
else
    install
fi
