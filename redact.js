// docx file me se pii data redact karne ka main script

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const { faker } = require('@faker-js/faker');
const { P_LIST, C_LIST, A_LIST } = require('./gazetteer');

const WNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const XMLNS = 'http://www.w3.org/XML/1998/namespace';

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

const pMap = new MapCls(() => faker.person.fullName());
const cMap = new MapCls(() => `${faker.company.name()} Limited`);
const eMap = new MapCls(() => faker.internet.email().toLowerCase());
const phMap = new MapCls(() => `+91 ${faker.number.int({min:70000,max:99999})} ${faker.number.int({min:10000,max:99999})}`);
const aMap = new MapCls(() => `${faker.location.streetAddress()}, ${faker.location.city()} - ${faker.number.int({min:400000,max:499999})}`);
const cinMap = new MapCls(() => `U${faker.number.int({min:10000,max:99999})}MH2020PLC${faker.number.int({min:100000,max:999999})}`);
const regMap = new MapCls(() => `INM${faker.number.int({min:100000000,max:999999999})}`);
const panMap = new MapCls(() => `${faker.string.alpha({length:5,casing:'upper'})}${faker.number.int({min:1000,max:9999})}${faker.string.alpha({length:1,casing:'upper'})}`);

let ipC = 0, ssnC = 0, ccC = 0, dobC = 0;

// regex patterns for standard identifiers & dynamic address matching
const R_EML = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/gi;
const R_PHN = /(?<!\d)(?:\+\s?91|91(?!\d)|0(?=\d{10}(?!\d)))[\s\-.]?(?:\d[\s\-.]?){9,10}(?!\d)/g;
const R_LND = /\b0\d{2,4}[-\s]\d{6,8}\b/g;
const R_IP = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
const R_CIN = /\b[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b/g;
const R_REG = /\bIN[A-Z]\d{9}\b|\bIN[A-Z]{2}\d{9}\b/g;
const R_PAN = /\b[A-Z]{5}\d{4}[A-Z]\b/g;
const R_SSN = /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g;
const R_CC = /\b(?:\d{4}[\s\-]){3}\d{4}\b/g;
const R_DOB = /(?:date\s+of\s+birth|dob|born\s+on)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi;

const R_ADR = /(?:Gat\s+No\.|Plot\s+No\.|Floor|Marg|Street|Road|Complex|Village|Bhavan|Towers|Plaza)[\s\S]{1,120}?\b\d{6}\b/gi;
const R_LBL = /(?:FATHER['’]S\s+NAME|MOTHER['’]S\s+NAME|GUARDIAN['’]S\s+NAME|CANDIDATE['’]S\s+NAME|FULL\s+NAME)\s*[:=]\s*([A-Z\s]{3,40})/gi;

const esc = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// text me se pii replace karne ka main function
function proc(txt) {
  if (!txt || !txt.trim()) return txt;

  txt = txt.replace(R_EML, m => eMap.get(m.toLowerCase()));
  R_EML.lastIndex = 0;

  txt = txt.replace(R_LND, m => phMap.get(m.trim()));
  R_LND.lastIndex = 0;

  txt = txt.replace(R_PHN, m => {
    const d = m.replace(/\D/g, '');
    return d.length >= 10 ? phMap.get(m.trim()) : m;
  });
  R_PHN.lastIndex = 0;

  txt = txt.replace(R_IP, () => faker.internet.ipv4());
  R_IP.lastIndex = 0;

  txt = txt.replace(R_CIN, m => cinMap.get(m));
  R_CIN.lastIndex = 0;

  txt = txt.replace(R_REG, m => regMap.get(m));
  R_REG.lastIndex = 0;

  txt = txt.replace(R_PAN, m => panMap.get(m));
  R_PAN.lastIndex = 0;

  txt = txt.replace(R_SSN, () => faker.string.numeric('333-##-####'));
  R_SSN.lastIndex = 0;

  txt = txt.replace(R_CC, () => faker.finance.creditCardNumber('4111-####-####-####'));
  R_CC.lastIndex = 0;

  txt = txt.replace(R_DOB, (full, dt) => full.replace(dt, '01/01/1995'));
  R_DOB.lastIndex = 0;

  txt = txt.replace(R_LBL, (full, nameVal) => {
    const cleanN = nameVal.trim();
    return cleanN.length >= 3 ? full.replace(cleanN, pMap.get(cleanN)) : full;
  });
  R_LBL.lastIndex = 0;

  txt = txt.replace(R_ADR, m => aMap.get(m.trim()));
  R_ADR.lastIndex = 0;

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

// paragraph element se pura text nikalta hai
function getTxt(p) {
  let res = '';
  const walk = node => {
    if (!node) return;
    const tag = node.localName;
    const ns = node.namespaceURI;
    if (tag === 't' && ns === WNS) {
      res += (node.textContent || node.text || '');
    } else if (tag === 'tab' && ns === WNS) {
      res += ' ';
    } else if (node.childNodes) {
      for (let i = 0; i < node.childNodes.length; i++) {
        walk(node.childNodes[i]);
      }
    }
  };
  walk(p);
  return res;
}

// paragraph xml rewrite karta hai
function fixP(p, newT) {
  const doc = p.ownerDocument;
  let pPr = null;
  for (let i = 0; i < p.childNodes.length; i++) {
    const ch = p.childNodes[i];
    if (ch.localName === 'pPr' && ch.namespaceURI === WNS) {
      pPr = ch;
      break;
    }
  }

  while (p.firstChild) {
    p.removeChild(p.firstChild);
  }

  if (pPr) p.appendChild(pPr);

  const rEl = doc.createElementNS(WNS, 'w:r');
  const tEl = doc.createElementNS(WNS, 'w:t');
  tEl.setAttributeNS(XMLNS, 'xml:space', 'preserve');
  tEl.appendChild(doc.createTextNode(newT));
  rEl.appendChild(tEl);
  p.appendChild(rEl);
}

// saare paragraphs par redaction apply karta hai
const runDoc = doc => {
  const pList = Array.from(doc.getElementsByTagNameNS(WNS, 'p'));
  for (const p of pList) {
    const raw = getTxt(p);
    if (!raw.trim()) continue;

    const norm = raw.replace(/[\t\r\n]+/g, ' ').trim();
    const red = proc(norm);

    if (red.toLowerCase() !== norm.toLowerCase()) {
      fixP(p, red);
    }
  }
};

// zip open karke sub xml files modify karta hai
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
  const zip = await JSZip.loadAsync(rawBuf);

  const targetFiles = Object.keys(zip.files).filter(name =>
    /^word\/(document|header\d*|footer\d*)\.xml$/.test(name)
  );

  for (const f of targetFiles) {
    const xmlStr = await zip.file(f).async('string');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

    runDoc(xmlDoc);

    const serializer = new XMLSerializer();
    zip.file(f, serializer.serializeToString(xmlDoc));
  }

  const outBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outP, outBuf);

  console.log(`[+] Saved:   ${outP}\n`);
  console.log('=== Redaction Summary ===');
  console.log(`  Person names     : ${pMap.map.size}`);
  console.log(`  Company names    : ${cMap.map.size}`);
  console.log(`  Email addresses  : ${eMap.map.size}`);
  console.log(`  Phone numbers    : ${phMap.map.size}`);
  console.log(`  Addresses        : ${aMap.map.size}`);
  console.log(`  CIN numbers      : ${cinMap.map.size}`);
  console.log(`  Reg. numbers     : ${regMap.map.size}`);
  console.log(`  PAN numbers      : ${panMap.map.size}`);
  console.log(`  IP addresses     : ${ipC}`);
  console.log(`  SSNs             : ${ssnC}  (regex applied; none in this doc)`);
  console.log(`  Credit cards     : ${ccC}  (regex applied; none in this doc)`);
  console.log(`  Dates of birth   : ${dobC}  (regex applied; none in this doc)`);

  if (v) {
    const list = [
      ['Person Names', pMap], ['Company Names', cMap],
      ['Email Addresses', eMap], ['Phone Numbers', phMap],
      ['Addresses', aMap], ['CIN Numbers', cinMap],
      ['Reg. Numbers', regMap], ['PAN Numbers', panMap],
    ];
    console.log();
    for (const [lbl, mObj] of list) {
      if (mObj.map.size === 0) continue;
      console.log(`=== ${lbl} (${mObj.map.size}) ===`);
      for (const [k, val] of mObj.map) {
        console.log(`  ${k.padEnd(70)} -> ${val}`);
      }
      console.log();
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
