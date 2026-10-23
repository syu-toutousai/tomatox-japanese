#!/usr/bin/env node
'use strict';

// TOMATOX の配布物（resources/app）に日本語化パッチを当てる。
//
// 使い方:
//   node tools/apply-ja.js <resources/app ディレクトリ>
//
// 対象:
//   dist/app.js
//   dist/main.js
//   dist/index.html
//
// 置換は「見つかった数」を検査しながら行う。上流の版が変わって
// 対応表と一致しなくなった場合は、勝手に進めずに失敗する。

const fs = require('fs');
const path = require('path');
const mapping = require('../patches/ja');

function applyFile(file, replacements) {
    let text = fs.readFileSync(file, 'utf8');
    const applied = [];

    for (const [find, replace, expected] of replacements) {
        const count = text.split(find).length - 1;
        if (count !== expected) {
            throw new Error(
                `${path.basename(file)}: 「${find}」を ${expected} 個見つける予定でしたが、${count} 個でした`
            );
        }
        text = text.split(find).join(replace);
        applied.push({ find, replace, count });
    }
    fs.writeFileSync(file, text);
    return applied;
}

function applyOptional(file, replacements) {
    let text = fs.readFileSync(file, 'utf8');
    let count = 0;
    for (const [find, replace] of replacements) {
        const found = text.split(find).length - 1;
        if (found > 0) {
            text = text.split(find).join(replace);
            count += found;
        }
    }
    fs.writeFileSync(file, text);
    return count;
}

function replaceLegalStatement(file) {
    let text = fs.readFileSync(file, 'utf8');
    const marker = '"版权声明：';
    const start = text.indexOf(marker);
    if (start < 0) {
        if (text.includes('著作権について')) {
            return false;
        }
        throw new Error('著作権声明の文字列が見つかりません');
    }

    const quote = text[start];
    let end = start + 1;
    while (end < text.length) {
        if (text[end] === '\\') {
            end += 2;
            continue;
        }
        if (text[end] === quote) {
            break;
        }
        end += 1;
    }
    if (end >= text.length) {
        throw new Error('著作権声明の文字列が閉じていません');
    }

    text = text.slice(0, start) + JSON.stringify(mapping.statement) + text.slice(end + 1);
    fs.writeFileSync(file, text);
    return true;
}

function ensureJapaneseChromiumLocale(file) {
    let text = fs.readFileSync(file, 'utf8');
    const marker = "appendSwitch('lang', 'ja-JP')";
    if (text.includes(marker)) {
        return false;
    }
    const line = "try { require('electron').app.commandLine.appendSwitch('lang', 'ja-JP'); } catch (e) {}\n";
    fs.writeFileSync(file, line + text);
    return true;
}

function assertNoForbidden(file) {
    const text = fs.readFileSync(file, 'utf8');
    const hits = mapping.forbidden.filter(word => text.includes(word));
    if (hits.length) {
        throw new Error(
            `${path.basename(file)} に中国語の画面文言が残っています: ${hits.join(' / ')}`
        );
    }
}

function assertPresent(file, words) {
    const text = fs.readFileSync(file, 'utf8');
    const missing = words.filter(word => !text.includes(word));
    if (missing.length) {
        throw new Error(
            `${path.basename(file)} に日本語の文言が見つかりません: ${missing.join(' / ')}`
        );
    }
}

function main() {
    const appDir = process.argv[2];
    if (!appDir) {
        console.error('使い方: node tools/apply-ja.js <resources/app ディレクトリ>');
        process.exit(2);
    }

    const dist = path.join(appDir, 'dist');
    const appJs = path.join(dist, 'app.js');
    const mainJs = path.join(dist, 'main.js');
    const indexHtml = path.join(dist, 'index.html');

    for (const file of [appJs, mainJs, indexHtml]) {
        if (!fs.existsSync(file)) {
            throw new Error(`対象ファイルがありません: ${file}`);
        }
    }

    const appApplied = applyFile(appJs, mapping.replacements['app.js']);
    if (!replaceLegalStatement(appJs)) {
        console.log('著作権声明はすでに日本語でした');
    }
    const mainApplied = applyFile(mainJs, mapping.replacements['main.js']);
    const mainOptional = applyOptional(mainJs, mapping.optionalMainReplacements);
    const localeAdded = ensureJapaneseChromiumLocale(mainJs);
    const htmlApplied = applyFile(indexHtml, mapping.replacements['index.html']);

    assertNoForbidden(appJs);
    assertPresent(appJs, [
        'おすすめ',
        'ジャンル',
        'ライブ',
        'さがす',
        '見たもの',
        'お気に入り',
        '設定',
        'このアプリについて',
        '動画の取り入れ先',
        'はじめから',
        'よみこみ中…',
        '画面いっぱいにする',
        'つくった人：Freeless',
        '著作権について'
    ]);
    assertPresent(indexHtml, ['<html lang="ja">', 'ネットの動画をさがして見るプレーヤー']);

    console.log(`app.js: ${appApplied.length} 件の置換`);
    console.log(`main.js: ${mainApplied.length + mainOptional} 件の置換${localeAdded ? ' + Chromium の言語設定' : ''}`);
    console.log(`index.html: ${htmlApplied.length} 件の置換`);
    console.log('日本語化パッチを当てました');
}

main();
