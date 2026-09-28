import fs from 'node:fs';
import ts from 'typescript';
import {execFileSync} from 'node:child_process';
const source=fs.readFileSync('figma-plugin-standard/code.ts','utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.None}});
fs.writeFileSync('figma-plugin-standard/code.js',outputText);
fs.mkdirSync('public',{recursive:true});
execFileSync('zip',['-j','-q','public/figma-plugin-standard.zip','figma-plugin-standard/manifest.json','figma-plugin-standard/code.js','figma-plugin-standard/ui.html','figma-plugin-standard/README.md']);
console.log('Built standard Figma plugin and local ZIP. No upload or deployment performed.');
