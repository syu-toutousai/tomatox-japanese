# TOMATOX 日本語化パッチ

[TOMATOX](https://github.com/FreeIess/TOMATOX) 2.0.2（Electron + React の動画プレーヤー）の
画面と操作のことばを日本語にするパッチです。漢語を並べるより、なるべく大和言葉で
言い換える方針にしています。

- 左メニュー: おすすめ / ジャンル / ライブ / さがす / 見たもの / お気に入り / 設定 / このアプリについて
- 再生画面: 再生リスト、くわしいこと、ここまで見た、もどる、あらすじ など
- 設定: 動画の取り入れ先、取り入れ先をふやす、なまえ、あて先、はじめから、けす、ふやす
- 検索: 映画やドラマ、バラエティなど / どこでもさがす / 見つかりませんでした
- このアプリについて: 新しくなったか見る、受け取りました、つくった人：Freeless
- プレーヤー（xgplayer）: ながす / とめる / 画面いっぱいにする / 小窓で見る / ライブ など
- 著作権声明、更新時のメッセージ、入力時の注意、エラー説明も日本語

## 作る

```bash
tools/build-ja-appimage.sh \
  ~/Applications/TOMATOX-2.0.2.AppImage \
  ~/Applications/TOMATOX-2.0.2-ja.AppImage
```

元の AppImage は上流のものでも、既に別のパッチ（広告除去など）を当てたものでも
かまいません。`resources/app.asar` があれば展開し、`resources/app` があればそのまま
使います。最後に `appimagetool` で AppImage を作り直します。

依存: `bash`、`node`、`curl`（`appimagetool` が無い場合のみ）。
`tools/install-local.sh` も `node` を使います。

## 使う

```bash
tools/install-local.sh ~/Applications/TOMATOX-2.0.2-ja.AppImage
```

`~/Applications/TOMATOX-2.0.2-ja.AppImage` を置きます。
既存の `~/.local/share/applications/tomatox.desktop` があれば、その `Exec` と
`Comment` だけを日本語版に書き換えます（先に `.bak-日時` で控えを取ります）。
無ければ `tomatox-ja.desktop` を新しく作ります。

## 確かめる

```bash
# 対応表の検査（アプリ不要）
node tests/test-mapping.js

# 実際に起動して、画面のことばを検査（xvfb-run と websocket-client が必要）
python3 tools/verify-ja.py ~/Applications/TOMATOX-2.0.2-ja.AppImage
```

## 方針と限界

- **大和言葉を優先**: 「戻る」ではなく「もどる」、「削除」ではなく「けす」、
  「詳細」ではなく「くわしいこと」、「ダウンロード」ではなく「とっておく」など。
  ただし「設定」「再生」「字幕」など、日常で定着していることばはそのまま使っています。
- **内部 ID は変えない**: 既定の動画ソースの ID `默认` と `量子资源` は、保存済みの
  IndexedDB / localStorage と一致させるためそのまま残し、画面に出すときだけ
  「はじめから」「量子資源」と表示します。
- **ネットから来る内容は翻訳しない**: 作品名、ジャンル、出演者、あらすじなどは
  配信元の API が返す中国語のままです。画面の枠組みと操作ことばだけを日本語にします。
- **xgplayer の辞書**: `lang: "jp"` に切り替えたうえで、同梱の日本語辞書の値を
  大和言葉寄りに置き換えています。
- **広告除去は含みません**: 広告除去や単一インスタンス化は別のパッチの仕事です。
  それらを当てた AppImage を入力にすれば、日本語化と同時に使えます。
- **更新について**: 「新しくなったか見る」から上流の更新を実行すると、中国語の
  上流版に入れ替わる可能性があります。日本語版を保ちたいときは更新しないでください。

## 対応表

- [`patches/ja.js`](patches/ja.js) … 置換する文字列と、置換後に残ってはいけない語
- [`tools/apply-ja.js`](tools/apply-ja.js) … 数を検査しながら置換する本体
- [`docs/translation-notes.md`](docs/translation-notes.md) … 訳語の選び方と注意点

## ライセンス

上流の TOMATOX は MIT License です。このパッチも MIT License で公開します。
著作権表示は [`LICENSE`](LICENSE) を見てください。
