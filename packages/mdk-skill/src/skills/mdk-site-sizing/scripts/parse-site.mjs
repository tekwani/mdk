#!/usr/bin/env node
// Parse a plain site description into sizing facts JSON (stdout).
//
//   node parse-site.mjs "ten Whatsminer M56S on an edge box, 4 cores, 8 GiB, SATA"
//   echo "..." | node parse-site.mjs

import { parseSiteDescription } from './lib.mjs'

const fromArgs = process.argv.slice(2).join(' ').trim()
const text = fromArgs || await readStdin()
if (!text) {
  console.error('usage: node parse-site.mjs <site description>')
  process.exit(2)
}
process.stdout.write(JSON.stringify(parseSiteDescription(text), null, 2) + '\n')

function readStdin () {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('')
    let buf = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (c) => { buf += c })
    process.stdin.on('end', () => resolve(buf.trim()))
  })
}
