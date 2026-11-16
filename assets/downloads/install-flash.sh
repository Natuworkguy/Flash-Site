#!/usr/bin/env bash
# Installs Flash: asks first (with a box to tick for the dev version, where there is one), then runs its installer
# (the same command as its README) and shows what it says in a window of its own, then a popup when it is done. The
# window is zenity's or, without it, Python's Tk; with neither (or no screen) it is this terminal.
# Run it with: bash install-flash.sh   (add --dev for the dev version without being asked)
APP='Flash'
COMMAND='curl -fsSL https://flashproject.dev/install.sh | bash'
DEVCOMMAND='curl -fsSL https://raw.githubusercontent.com/Natuworkguy/Flash/dev/install.sh | bash -s -- --dev'
DEVTEXT="Install the dev version: the newest changes, before they are released, so less tested."
dir="$(mktemp -d)"; log="$dir/install.log"; status="$dir/status"
screen=""; [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ] && screen=1
tk=""; command -v python3 >/dev/null 2>&1 && python3 -c 'import tkinter' 2>/dev/null && tk=1

# ----- what to install -----
which=stable
if [ "${1:-}" = "--dev" ] && [ -n "$DEVCOMMAND" ]; then which=dev
elif [ -n "$screen" ] && command -v zenity >/dev/null 2>&1; then
  if [ -n "$DEVCOMMAND" ]; then
    picked=$(zenity --list --checklist --title="Install $APP" --text="This downloads $APP and installs it for you. It can take a few minutes, and a window shows each step." \
      --column="" --column="" --hide-header --ok-label=Install --cancel-label=Cancel --width=560 --height=260 FALSE "$DEVTEXT" 2>/dev/null) || exit 0
    [ -n "$picked" ] && which=dev
  else
    zenity --question --title="Install $APP" --text="This downloads $APP and installs it for you. It can take a few minutes, and a window shows each step." --ok-label=Install --cancel-label=Cancel --width=420 2>/dev/null || exit 0
  fi
elif [ -n "$screen" ] && [ -n "$tk" ]; then
  which=$(python3 - "$APP" "$DEVTEXT" "$([ -n "$DEVCOMMAND" ] && echo 1)" <<'PY'
import sys, tkinter as tk
app, devtext, can_dev = sys.argv[1], sys.argv[2], sys.argv[3] == "1"
root = tk.Tk(); root.title(f"Install {app}"); root.geometry("640x260"); out = ["cancel"]
tk.Label(root, text=f"Install {app}", font=("sans", 20, "bold"), anchor="w").pack(fill="x", padx=24, pady=(24, 6))
tk.Label(root, text=f"This downloads {app} and installs it for you. It can take a few minutes, and a window shows each step.", wraplength=590, justify="left", anchor="w").pack(fill="x", padx=24)
dev = tk.BooleanVar(value=False)
if can_dev: tk.Checkbutton(root, text=devtext, variable=dev, anchor="w").pack(fill="x", padx=20, pady=12)
row = tk.Frame(root); row.pack(side="bottom", anchor="e", padx=20, pady=16)
def go(): out[0] = "dev" if dev.get() else "stable"; root.destroy()
tk.Button(row, text="Cancel", command=root.destroy).pack(side="left", padx=6)
tk.Button(row, text="Install", default="active", command=go).pack(side="left")
root.bind("<Return>", lambda e: go()); root.mainloop(); print(out[0])
PY
)
  [ "$which" = cancel ] && exit 0
elif [ -n "$DEVCOMMAND" ] && [ -t 0 ]; then
  read -r -p "Install the dev version of $APP (the newest changes, less tested)? [y/N] " yes
  case "$yes" in [yY]*) which=dev ;; esac
fi
[ "$which" = dev ] && COMMAND="$DEVCOMMAND"

printf 'Installing %s%s. Running its installer:\n  %s\n\n' "$([ "$which" = dev ] && echo 'the dev version of ')" "$APP" "$COMMAND" > "$log"
(
  bash -c "$COMMAND" < /dev/null 2>&1 | sed -u -e 's/\x1b\[[0-9;?]*[ -/]*[@-~]//g' -e 's/^.*\r\(.\)/\1/' >> "$log"
  echo "${PIPESTATUS[0]}" > "$status"
) &
worker=$!
code() { cat "$status" 2>/dev/null || echo 1; }
done_text="$APP is installed. Open it from your applications menu, or run: $(echo "$APP" | tr '[:upper:]' '[:lower:]')"
fail_text="The installer stopped before $APP was installed. What it said is in the window, and in $log"

if [ -n "$screen" ] && command -v zenity >/dev/null 2>&1; then
  # the log as it grows, until the installer is done; then the popup
  ( tail -n +1 -f --pid="$worker" "$log" ) | zenity --text-info --auto-scroll --title="Installing $APP" --width=780 --height=480 --ok-label=Close 2>/dev/null &
  wait "$worker"
  if [ "$(code)" = 0 ]; then zenity --info --title="Done" --text="$done_text" --width=380 2>/dev/null
  else zenity --warning --title="Not installed" --text="$fail_text" --width=380 2>/dev/null; fi
elif [ -n "$screen" ] && [ -n "$tk" ]; then
  python3 - "$APP" "$log" "$status" "$done_text" "$fail_text" <<'PY'
import os, sys, tkinter as tk
from tkinter import messagebox
app, log, status, done_text, fail_text = sys.argv[1:]
root = tk.Tk(); root.title(f"Installing {app}"); root.geometry("780x480")
tk.Label(root, text=f"Installing {app}. This shows what the installer is doing; it can take a few minutes.", anchor="w").pack(fill="x", padx=12, pady=(12, 4))
frame = tk.Frame(root); frame.pack(fill="both", expand=True, padx=12, pady=(0, 12))
bar = tk.Scrollbar(frame); bar.pack(side="right", fill="y")
text = tk.Text(frame, wrap="word", font=("monospace", 10), yscrollcommand=bar.set); text.pack(fill="both", expand=True); bar.config(command=text.yview)
at = 0
def tick():
    global at
    try:
        with open(log, "rb") as f:
            f.seek(at); more = f.read(); at += len(more)
        if more:
            text.insert("end", more.decode("utf-8", "replace")); text.see("end")
    except OSError:
        pass
    if os.path.exists(status):
        code = open(status).read().strip()
        if code == "0":
            root.title(f"{app} is installed"); messagebox.showinfo("Done", done_text, parent=root); root.destroy()
        else:
            root.title(f"{app} did not install"); messagebox.showwarning("Not installed", fail_text, parent=root)
        return
    root.after(300, tick)
root.after(100, tick); root.mainloop()
PY
  wait "$worker"
else
  # no window to draw in: the log here, then a notification if there is a desktop to show one
  tail -n +1 -f --pid="$worker" "$log"
  wait "$worker"
  if [ "$(code)" = 0 ]; then echo; echo "Done. $done_text"; command -v notify-send >/dev/null 2>&1 && notify-send "Done" "$done_text"
  else echo; echo "$fail_text"; command -v notify-send >/dev/null 2>&1 && notify-send "Not installed" "$fail_text"; fi
fi
[ "$(code)" = 0 ]
