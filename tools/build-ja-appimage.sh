#!/usr/bin/env bash
#
# TOMATOX の AppImage に日本語化パッチを当てて、新しい AppImage を作る。
#
# 使い方:
#   tools/build-ja-appimage.sh <元の.AppImage> <出力.AppImage>
#
# 元の AppImage は、上流のもの（resources/app.asar）でも、
# 既に別のパッチを当てたもの（resources/app）でもよい。
#
# 依存: bash, node, curl（appimagetool が無い場合のみ）
set -euo pipefail

SRC=${1:?使い方: build-ja-appimage.sh <元の.AppImage> <出力.AppImage>}
OUTPUT=${2:?使い方: build-ja-appimage.sh <元の.AppImage> <出力.AppImage>}
REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
OUTPUT=$(readlink -m "$OUTPUT")

if [ ! -f "$SRC" ]; then
    echo "元の AppImage がありません: $SRC" >&2
    exit 1
fi

WORK=$(mktemp -d /tmp/tomatox-ja-XXXXXX)
trap 'rm -rf "$WORK"' EXIT

echo "[1/5] AppImage を展開"
cd "$WORK"
"$SRC" --appimage-extract >/dev/null
APPDIR="$WORK/squashfs-root"

if [ -f "$APPDIR/resources/app.asar" ]; then
    echo "[2/5] app.asar を展開"
    node "$REPO_DIR/tools/extract-asar.js" \
        "$APPDIR/resources/app.asar" "$WORK/app"
    rm -f "$APPDIR/resources/app.asar"
    mv "$WORK/app" "$APPDIR/resources/app"
elif [ -d "$APPDIR/resources/app" ]; then
    echo "[2/5] 展開済みの resources/app を使う"
else
    echo "resources/app.asar も resources/app もありません" >&2
    exit 1
fi

echo "[3/5] 日本語化パッチを当てる"
node "$REPO_DIR/tools/apply-ja.js" "$APPDIR/resources/app"
node --check "$APPDIR/resources/app/dist/app.js"
node --check "$APPDIR/resources/app/dist/main.js"

echo "[4/5] .desktop の説明を日本語にする"
node - "$APPDIR/tomatox.desktop" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/^Comment=.*$/m, 'Comment=ネットの動画をさがして見るプレーヤー');
text = text.replace(/^Categories=.*$/m, 'Categories=AudioVideo;Video;Player;');
fs.writeFileSync(file, text);
NODE

echo "[5/5] AppImage を再構築"
mkdir -p "$(dirname "$OUTPUT")"
cd "$WORK"
if command -v appimagetool >/dev/null 2>&1; then
    ARCH=x86_64 appimagetool "$APPDIR" "$OUTPUT"
else
    TOOL="$WORK/appimagetool.AppImage"
    curl -fsSL -o "$TOOL" \
        "https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage"
    chmod +x "$TOOL"
    ARCH=x86_64 "$TOOL" --appimage-extract-and-run "$APPDIR" "$OUTPUT"
fi
chmod +x "$OUTPUT"

echo "できあがり: $OUTPUT"
