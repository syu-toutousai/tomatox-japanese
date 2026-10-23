#!/usr/bin/env python3
"""日本語化した TOMATOX を起動し、画面のことばを確かめる。

使い方:
    tools/verify-ja.py <AppImage> [ポート]

依存: xvfb-run, python3 + websocket-client
"""

import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import urllib.request

import websocket

APPIMAGE = sys.argv[1] if len(sys.argv) > 1 else None
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 9334

if not APPIMAGE or not os.path.isfile(APPIMAGE):
    raise SystemExit("使い方: verify-ja.py <AppImage> [ポート]")

if shutil.which("xvfb-run") is None:
    raise SystemExit("xvfb-run がありません")

user_data = tempfile.mkdtemp(prefix="tomatox-ja-verify-")
log_path = os.path.join(tempfile.gettempdir(), "tomatox-ja-verify.log")
log = open(log_path, "w", encoding="utf-8")

proc = subprocess.Popen(
    [
        "xvfb-run", "-a", APPIMAGE,
        "--no-sandbox", "--disable-gpu",
        f"--user-data-dir={user_data}",
        f"--remote-debugging-port={PORT}",
    ],
    stdout=log,
    stderr=subprocess.STDOUT,
    stdin=subprocess.DEVNULL,
    start_new_session=True,
)


def cleanup():
    try:
        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
        time.sleep(1)
        os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
    except ProcessLookupError:
        pass
    shutil.rmtree(user_data, ignore_errors=True)
    log.close()


def page_ws():
    for _ in range(60):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json", timeout=2) as res:
                for page in json.load(res):
                    if page.get("type") == "page":
                        return page["webSocketDebuggerUrl"]
        except Exception:
            pass
        time.sleep(0.5)
    raise SystemExit(f"デバッグ用のページが見つかりません。ログ: {log_path}")


def evaluate(ws, expression):
    ws.send(json.dumps({
        "id": 1,
        "method": "Runtime.evaluate",
        "params": {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True,
        },
    }))
    while True:
        message = json.loads(ws.recv())
        if message.get("id") == 1:
            return message.get("result", {}).get("result", {}).get("value")


def main():
    ws = websocket.create_connection(page_ws(), timeout=30)

    ready = False
    for _ in range(40):
        ready = evaluate(ws, "document.body && document.body.innerText.includes('おすすめ')")
        if ready:
            break
        time.sleep(0.5)
    if not ready:
        print("画面の初期化を待てませんでした。ログ:", log_path)
        return 1

    checks = []

    def check(name, ok, detail=""):
        checks.append((name, ok, detail))

    check("html lang=ja", evaluate(ws, "document.documentElement.lang") == "ja")

    body = evaluate(ws, "document.body.innerText") or ""
    for word in ["おすすめ", "ジャンル", "ライブ", "さがす", "見たもの", "お気に入り", "設定", "このアプリについて"]:
        check(f"メニュー: {word}", word in body)
    for word in ["推荐", "分类", "直播", "搜索", "历史", "收藏", "设置", "关于"]:
        check(f"中国語が残っていない: {word}", word not in body)

    evaluate(ws, "location.hash = '#/setting'")
    time.sleep(1.5)
    body = evaluate(ws, "document.body.innerText") or ""
    for word in ["動画の取り入れ先", "取り入れ先をふやす", "なまえ", "あて先", "ふやす", "はじめから"]:
        check(f"設定: {word}", word in body)
    for word in ["视频源", "添加视频源", "名称", "地址", "添加"]:
        check(f"設定に中国語が残っていない: {word}", word not in body)

    evaluate(ws, "location.hash = '#/about'")
    time.sleep(1.5)
    body = evaluate(ws, "document.body.innerText") or ""
    for word in ["新しくなったか見る", "つくった人：Freeless", "著作権について"]:
        check(f"このアプリについて: {word}", word in body)
    for word in ["检查更新", "版权声明"]:
        check(f"このアプリについてに中国語が残っていない: {word}", word not in body)

    failed = [item for item in checks if not item[1]]
    for name, ok, _ in checks:
        print(("OK   " if ok else "NG   ") + name)
    print()
    if failed:
        print(f"失敗: {len(failed)} 件。ログ: {log_path}")
        return 1
    print(f"合格: {len(checks)} 件")
    return 0


try:
    sys.exit(main())
finally:
    cleanup()
