#!/usr/bin/env bash
#
# できあがった日本語版 AppImage を自分の環境に入れる。
#
# 使い方:
#   tools/install-local.sh <日本語版.AppImage>
#
# 既存の ~/.local/share/applications/tomatox.desktop があれば、その Exec と
# Comment だけを日本語版に書き換える（先に .bak-日時 で控えを取る）。
# 無ければ tomatox-ja.desktop を新しく作る。
set -euo pipefail

SRC=${1:?使い方: install-local.sh <日本語版.AppImage>}
SRC=$(readlink -m "$SRC")
[ -x "$SRC" ] || { echo "実行できる AppImage ではありません: $SRC" >&2; exit 1; }

DEST_DIR="$HOME/Applications"
DEST="$DEST_DIR/TOMATOX-2.0.2-ja.AppImage"
DESKTOP_DIR="$HOME/.local/share/applications"
EXISTING="$DESKTOP_DIR/tomatox.desktop"
NEW_ENTRY="$DESKTOP_DIR/tomatox-ja.desktop"

mkdir -p "$DEST_DIR" "$DESKTOP_DIR"
install -m755 "$SRC" "$DEST"

if [ -f "$EXISTING" ]; then
    BACKUP="$EXISTING.bak-$(date +%Y%m%d%H%M%S)"
    cp -p "$EXISTING" "$BACKUP"
    node - "$EXISTING" "$DEST" <<'NODE'
const fs = require('fs');
const [file, exec] = process.argv.slice(2);
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/^Exec=.*$/m, `Exec=${exec} %U`);
text = text.replace(/^Comment=.*$/m, 'Comment=ネットの動画をさがして見るプレーヤー');
if (!/^Comment=/m.test(text)) {
    text = text.replace(/^Type=Application$/m, 'Type=Application\nComment=ネットの動画をさがして見るプレーヤー');
}
fs.writeFileSync(file, text);
NODE
    echo "入れた:       $DEST"
    echo "入口を更新:   $EXISTING"
    echo "控え:         $BACKUP"
else
    cat > "$NEW_ENTRY" <<EOF
[Desktop Entry]
Type=Application
Name=TOMATOX
Name[ja]=TOMATOX
Comment=ネットの動画をさがして見るプレーヤー
Comment[ja]=ネットの動画をさがして見るプレーヤー
Exec=$DEST %U
Icon=tomatox
Terminal=false
Categories=AudioVideo;Video;Player;
StartupWMClass=tomatox
StartupNotify=true
EOF
    chmod 644 "$NEW_ENTRY"
    echo "入れた:       $DEST"
    echo "入口を作成:   $NEW_ENTRY"
fi

if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
fi
