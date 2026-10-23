#!/usr/bin/env node
'use strict';

// Electron の app.asar を、実行せずに展開する。
// 使い方: node tools/extract-asar.js <app.asar> <出力ディレクトリ>

const fs = require('fs');
const path = require('path');

function main() {
    const [, , asarPath, outDir] = process.argv;
    if (!asarPath || !outDir) {
        console.error('使い方: node tools/extract-asar.js <app.asar> <出力ディレクトリ>');
        process.exit(2);
    }

    const buf = fs.readFileSync(asarPath);
    const jsonSize = buf.readUInt32LE(12);
    const dataStart = 8 + buf.readUInt32LE(4);
    const header = JSON.parse(buf.subarray(16, 16 + jsonSize).toString('utf8'));

    let files = 0;
    let bytes = 0;

    function walk(node, current) {
        for (const [name, entry] of Object.entries(node.files || {})) {
            const target = path.join(current, name);
            if (entry.files !== undefined) {
                fs.mkdirSync(target, { recursive: true });
                walk(entry, target);
            } else if (entry.link !== undefined) {
                fs.symlinkSync(entry.link, target);
            } else {
                const offset = dataStart + parseInt(entry.offset, 10);
                fs.mkdirSync(path.dirname(target), { recursive: true });
                fs.writeFileSync(target, buf.subarray(offset, offset + entry.size));
                files += 1;
                bytes += entry.size;
            }
        }
    }

    fs.mkdirSync(outDir, { recursive: true });
    walk(header, outDir);
    console.log(`展開しました: ${files} ファイル, ${bytes} バイト -> ${outDir}`);
}

main();
