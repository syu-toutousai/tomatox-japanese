#!/usr/bin/env node
'use strict';

// 対応表そのものの検査。アプリのバイナリがなくても実行できる。

const mapping = require('../patches/ja');

const simplifiedOnly = new Set(
    '设荐视频录删载详简类语导检发现错网弹轨闭览码请试您权'.
        split('')
);

const errors = [];

for (const [file, replacements] of Object.entries(mapping.replacements)) {
    const seen = new Set();
    for (const entry of replacements) {
        if (!Array.isArray(entry) || entry.length !== 3) {
            errors.push(`${file}: 置換は [find, replace, count] の形にしてください: ${JSON.stringify(entry)}`);
            continue;
        }
        const [find, replace, count] = entry;
        if (typeof find !== 'string' || !find) {
            errors.push(`${file}: find が空です`);
        }
        if (typeof replace !== 'string') {
            errors.push(`${file}: replace が文字列ではありません: ${find}`);
        }
        if (find === replace) {
            errors.push(`${file}: find と replace が同じです: ${find}`);
        }
        if (!Number.isInteger(count) || count < 1) {
            errors.push(`${file}: count は 1 以上にしてください: ${find}`);
        }
        if (seen.has(find)) {
            errors.push(`${file}: find が重複しています: ${find}`);
        }
        seen.add(find);
        if (typeof replace === 'string') {
            const bad = [...replace].filter(ch => simplifiedOnly.has(ch));
            if (bad.length) {
                errors.push(`${file}: 置換先に中国語の簡体字らしき文字があります (${bad.join('')}): ${replace}`);
            }
        }
    }
}

if (typeof mapping.statement !== 'string' || !mapping.statement.includes('著作権')) {
    errors.push('statement がありません');
}
if (!Array.isArray(mapping.forbidden) || mapping.forbidden.length === 0) {
    errors.push('forbidden がありません');
}
for (const word of mapping.forbidden) {
    if (typeof word !== 'string' || !word) {
        errors.push(`forbidden の項目が不正です: ${JSON.stringify(word)}`);
    }
    if (mapping.statement.includes(word)) {
        errors.push(`statement に禁止語が含まれています: ${word}`);
    }
}

if (errors.length) {
    for (const error of errors) {
        console.error('NG: ' + error);
    }
    process.exit(1);
}

const total = Object.values(mapping.replacements)
    .reduce((sum, list) => sum + list.length, 0);
console.log(`合格: ${total} 件の置換と ${mapping.forbidden.length} 件の禁止語を検査しました`);
