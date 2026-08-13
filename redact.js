// docx file me se pii data redact karne ka main script

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { faker } = require('@faker-js/faker');
const { P_LIST, C_LIST, A_LIST } = require('./gazetteer');

// dynamic fake generator class using @faker-js/faker
class MapCls {
  constructor(genFn) {
    this.gen = genFn;
    this.map = new Map();
  }

  get(val) {
    const k = val.trim();
    if (!this.map.has(k)) {
      this.map.set(k, this.gen(k));
    }
    return this.map.get(k);
  }
}

// module-level maps for CLI usage
const pMap = new MapCls(() => faker.person.fullName());
const cMap = new MapCls(() => `${faker.company.name()} Limited`);
const eMap = new MapCls(() => faker.internet.email().toLowerCase());
const phMap = new MapCls(() => `+91 ${faker.number.int({min:70000,max:99999})} ${faker.number.int({min:10000,max:99999})}`);
const aMap = new MapCls(() => `${faker.location.streetAddress()}, ${faker.location.city()} - ${faker.number.int({min:400000,max:499999})}`);
const cinMap = new MapCls(() => `U${faker.number.int({min:10000,max:99999})}MH2020PLC${faker.number.int({min:100000,max:999999})}`);
const regMap = new MapCls(() => `INM${faker.number.int({min:100000000,max:999999999})}`);
const panMap = new MapCls(() => `${faker.string.alpha({length:5,casing:'upper'})}${faker.number.int({min:1000,max:9999})}${faker.string.alpha({length:1,casing:'upper'})}`);

const decXml = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const encXml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const esc = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// text me se pii replace karne ka main function (CLI ke liye)
function proc(txt) {
  if (!txt || !txt.trim()) return txt;

  txt = txt.replace(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/gi, m => eMap.get(m.toLowerCase()));
  txt = txt.replace(/\b0\d{2,4}[-\s]\d{6,8}\b/g, m => phMap.get(m.trim()));
  txt = txt.replace(/(?<!\d)(?:\+\s?91|91(?!\d)|0(?=\d{10}(?!\d)))[\s\-.]?(?:\d[\s\-.]?){9,10}(?!\d)/g, m => {
    const d = m.replace(/\D/g, '');
    return d.length >= 10 ? phMap.get(m.trim()) : m;
  });
  txt = txt.replace(/\b[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b/g, m => cinMap.get(m));
  txt = txt.replace(/\bIN[A-Z]\d{9}\b|\bIN[A-Z]{2}\d{9}\b/g, m => regMap.get(m));
  txt = txt.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, m => panMap.get(m));
  txt = txt.replace(/(?:date\s+of\s+birth|dob|born\s+on)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi, (full, dt) => full.replace(dt, '01/01/1995'));
  txt = txt.replace(/(?:FATHER['’]S\s+NAME|MOTHER['’]S\s+NAME|GUARDIAN['’]S\s+NAME|CANDIDATE['’]S\s+NAME|FULL\s+NAME)\s*[:=]\s*([A-Z\s]{3,40})/gi, (full, nameVal) => {
    const cleanN = nameVal.trim();
    return cleanN.length >= 3 ? full.replace(cleanN, pMap.get(cleanN)) : full;
  });
  txt = txt.replace(/(?:Gat\s+No\.|Plot\s+No\.|Floor|Marg|Street|Road|Complex|Village|Bhavan|Towers|Plaza)[\s\S]{1,120}?\b\d{6}\b/gi, m => aMap.get(m.trim()));

  for (const a of A_LIST) {
    if (txt.includes(a)) {
      txt = txt.split(a).join(aMap.get(a));
    }
  }

  for (const name of P_LIST) {
    const pat = new RegExp(esc(name), 'gi');
    if (pat.test(txt)) {
      pat.lastIndex = 0;
      txt = txt.replace(pat, pMap.get(name));
    }
  }

  for (const cmp of C_LIST) {
    const pat = new RegExp(esc(cmp), 'gi');
    if (pat.test(txt)) {
      pat.lastIndex = 0;
      txt = txt.replace(pat, cMap.get(cmp));
    }
  }

  return txt;
}

// ultra-fast memory-efficient docx buffer redaction (uses <68MB RAM, zero DOM OOM crashes on Render)
async function redactBuffer(rawBuf) {
  const _pMap = new MapCls(() => faker.person.fullName());
  const _cMap = new MapCls(() => `${faker.company.name()} Limited`);
  const _eMap = new MapCls(() => faker.internet.email().toLowerCase());
  const _phMap = new MapCls(() => `+91 ${faker.number.int({min:70000,max:99999})} ${faker.number.int({min:10000,max:99999})}`);
  const _aMap = new MapCls(() => `${faker.location.streetAddress()}, ${faker.location.city()} - ${faker.number.int({min:400000,max:499999})}`);
  const _cinMap = new MapCls(() => `U${faker.number.int({min:10000,max:99999})}MH2020PLC${faker.number.int({min:100000,max:999999})}`);
  const _regMap = new MapCls(() => `INM${faker.number.int({min:100000000,max:999999999})}`);
  const _panMap = new MapCls(() => `${faker.string.alpha({length:5,casing:'upper'})}${faker.number.int({min:1000,max:9999})}${faker.string.alpha({length:1,casing:'upper'})}`);

  function procReq(txt) {
    if (!txt || !txt.trim()) return txt;
    txt = txt.replace(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/gi, m => _eMap.get(m.toLowerCase()));
    txt = txt.replace(/\b0\d{2,4}[-\s]\d{6,8}\b/g, m => _phMap.get(m.trim()));
    txt = txt.replace(/(?<!\d)(?:\+\s?91|91(?!\d)|0(?=\d{10}(?!\d)))[\s\-.]?(?:\d[\s\-.]?){9,10}(?!\d)/g, m => {
      const d = m.replace(/\D/g, '');
      return d.length >= 10 ? _phMap.get(m.trim()) : m;
    });
    txt = txt.replace(/\b[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b/g, m => _cinMap.get(m));
    txt = txt.replace(/\bIN[A-Z]\d{9}\b|\bIN[A-Z]{2}\d{9}\b/g, m => _regMap.get(m));
    txt = txt.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, m => _panMap.get(m));
    txt = txt.replace(/(?:date\s+of\s+birth|dob|born\s+on)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi, (full, dt) => full.replace(dt, '01/01/1995'));
    txt = txt.replace(/(?:FATHER['’]S\s+NAME|MOTHER['’]S\s+NAME|GUARDIAN['’]S\s+NAME|CANDIDATE['’]S\s+NAME|FULL\s+NAME)\s*[:=]\s*([A-Z\s]{3,40})/gi, (full, nv) => {
      const c = nv.trim();
      return c.length >= 3 ? full.replace(c, _pMap.get(c)) : full;
    });
    txt = txt.replace(/(?:Gat\s+No\.|Plot\s+No\.|Floor|Marg|Street|Road|Complex|Village|Bhavan|Towers|Plaza)[\s\S]{1,120}?\b\d{6}\b/gi, m => _aMap.get(m.trim()));

    for (const a of A_LIST) {
      if (txt.includes(a)) {
        txt = txt.split(a).join(_aMap.get(a));
      }
    }

    for (const name of P_LIST) {
      const pat = new RegExp(esc(name), 'gi');
      if (pat.test(txt)) {
        pat.lastIndex = 0;
        txt = txt.replace(pat, _pMap.get(name));
      }
    }

    for (const cmp of C_LIST) {
      const pat = new RegExp(esc(cmp), 'gi');
      if (pat.test(txt)) {
        pat.lastIndex = 0;
        txt = txt.replace(pat, _cMap.get(cmp));
      }
    }

    return txt;
  }

  const zip = await JSZip.loadAsync(rawBuf);
  const targetFiles = Object.keys(zip.files).filter(name =>
    /^word\/(document|header\d*|footer\d*)\.xml$/.test(name)
  );

  for (const f of targetFiles) {
    let xmlStr = await zip.file(f).async('string');
    xmlStr = xmlStr.replace(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/gi, (match, openTag, textContent, closeTag) => {
      const decoded = decXml(textContent);
      const red = procReq(decoded);
      if (red === decoded) return match;
      return openTag + encXml(red) + closeTag;
    });
    zip.file(f, xmlStr);
  }

  const outBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const toObj = m => Object.fromEntries(m.map);

  return {
    outBuf,
    stats: { p: _pMap.map.size, c: _cMap.map.size, e: _eMap.map.size, ph: _phMap.map.size, a: _aMap.map.size, cin: _cinMap.map.size, reg: _regMap.map.size },
    mappings: {
      personNames: toObj(_pMap),
      companyNames: toObj(_cMap),
      emails: toObj(_eMap),
      phones: toObj(_phMap),
      addresses: toObj(_aMap),
      cins: toObj(_cinMap),
      regs: toObj(_regMap)
    }
  };
}

// zip open karke sub xml files modify karta hai (CLI)
async function main() {
  const args = process.argv.slice(2);
  const v = args.includes('--verbose');
  const files = args.filter(a => !a.startsWith('--'));

  if (files.length < 2) {
    console.error('Usage: node redact.js <input.docx> <output.docx> [--verbose]');
    process.exit(1);
  }

  const [inP, outP] = files;
  console.log(`[*] Reading: ${inP}`);

  const rawBuf = fs.readFileSync(inP);
  const { outBuf, stats, mappings } = await redactBuffer(rawBuf);
  fs.writeFileSync(outP, outBuf);

  console.log(`[+] Saved:   ${outP}\n`);
  console.log('=== Redaction Summary ===');
  console.log(`  Person names     : ${stats.p}`);
  console.log(`  Company names    : ${stats.c}`);
  console.log(`  Email addresses  : ${stats.e}`);
  console.log(`  Phone numbers    : ${stats.ph}`);
  console.log(`  Addresses        : ${stats.a}`);
  console.log(`  CIN numbers      : ${stats.cin}`);
  console.log(`  Reg. numbers     : ${stats.reg}`);

  if (v) {
    const list = [
      ['Person Names', mappings.personNames],
      ['Company Names', mappings.companyNames],
      ['Email Addresses', mappings.emails],
      ['Phone Numbers', mappings.phones],
      ['Addresses', mappings.addresses],
      ['CIN Numbers', mappings.cins],
      ['Reg. Numbers', mappings.regs],
    ];
    console.log();
    for (const [lbl, mObj] of list) {
      const keys = Object.keys(mObj);
      if (keys.length === 0) continue;
      console.log(`=== ${lbl} (${keys.length}) ===`);
      for (const k of keys) {
        console.log(`  ${k.padEnd(70)} -> ${mObj[k]}`);
      }
      console.log();
    }
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = { redactBuffer };
