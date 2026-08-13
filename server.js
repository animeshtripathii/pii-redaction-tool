// express server aur swagger ui integration ka script

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const JSZip = require('jszip');
const { faker } = require('@faker-js/faker');
const { P_LIST, C_LIST, A_LIST } = require('./gazetteer');
const { calcMetrics } = require('./evaluate');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

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

// regex patterns for text redaction & dynamic address matching
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

// text redaction logic
function proc(txt, pMap, cMap, eMap, phMap, aMap, cinMap, regMap, panMap) {
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

  txt = txt.replace(R_CIN, m => cinMap.get(m));
  R_CIN.lastIndex = 0;

  txt = txt.replace(R_REG, m => regMap.get(m));
  R_REG.lastIndex = 0;

  txt = txt.replace(R_PAN, m => panMap.get(m));
  R_PAN.lastIndex = 0;

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

// 2-pass memory-efficient docx buffer redaction
async function redactBuf(rawBuf) {
  const pMap = new MapCls(() => faker.person.fullName());
  const cMap = new MapCls(() => `${faker.company.name()} Limited`);
  const eMap = new MapCls(() => faker.internet.email().toLowerCase());
  const phMap = new MapCls(() => `+91 ${faker.number.int({min:70000,max:99999})} ${faker.number.int({min:10000,max:99999})}`);
  const aMap = new MapCls(() => `${faker.location.streetAddress()}, ${faker.location.city()} - ${faker.number.int({min:400000,max:499999})}`);
  const cinMap = new MapCls(() => `U${faker.number.int({min:10000,max:99999})}MH2020PLC${faker.number.int({min:100000,max:999999})}`);
  const regMap = new MapCls(() => `INM${faker.number.int({min:100000000,max:999999999})}`);
  const panMap = new MapCls(() => `${faker.string.alpha({length:5,casing:'upper'})}${faker.number.int({min:1000,max:9999})}${faker.string.alpha({length:1,casing:'upper'})}`);

  const zip = await JSZip.loadAsync(rawBuf);
  const targetFiles = Object.keys(zip.files).filter(name =>
    /^word\/(document|header\d*|footer\d*)\.xml$/.test(name)
  );

  for (const f of targetFiles) {
    let xmlStr = await zip.file(f).async('string');

    // Pass 1: w:t tag level — directly replace entities that exist in single w:t tags (emails, phones, CIN, names)
    xmlStr = xmlStr.replace(/<w:t(\b[^>]*)>([\s\S]*?)<\/w:t>/gi, (match, attrs, content) => {
      if (!content.trim()) return match;
      const red = proc(content, pMap, cMap, eMap, phMap, aMap, cinMap, regMap, panMap);
      if (red === content) return match;
      const safe = red.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<w:t${attrs}>${safe}</w:t>`;
    });

    zip.file(f, xmlStr);
  }

  const outBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const toObj = mapObj => Object.fromEntries(mapObj.map);

  return {
    outBuf,
    stats: { p: pMap.map.size, c: cMap.map.size, e: eMap.map.size, ph: phMap.map.size, a: aMap.map.size, cin: cinMap.map.size, reg: regMap.map.size },
    mappings: {
      personNames: toObj(pMap),
      companyNames: toObj(cMap),
      emails: toObj(eMap),
      phones: toObj(phMap),
      addresses: toObj(aMap),
      cins: toObj(cinMap),
      regs: toObj(regMap)
    }
  };
}

// swagger doc JSON configuration
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'PII Redaction Tool & Evaluation API',
    version: '1.0.0',
    description: 'Node.js REST API with Swagger UI to redact DOCX files, inspect verbose PII mappings, and view live benchmark metrics.',
  },
  paths: {
    '/api/redact': {
      post: {
        summary: 'Upload DOCX file and download redacted output file',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary', description: 'DOCX file to redact' },
                },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Redacted DOCX output file download',
            content: {
              'application/octet-stream': {
                schema: { type: 'string', format: 'binary' }
              }
            },
          },
        },
      },
    },
    '/api/inspect': {
      post: {
        summary: 'Upload DOCX file and view verbose JSON list of all detected PII entities & replacements',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary', description: 'DOCX file to inspect' },
                },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Verbose JSON breakdown of all detected PII entities and fake replacements',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    summary: { type: 'object' },
                    mappings: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/evaluate': {
      get: {
        summary: 'View live benchmark evaluation metrics report JSON',
        responses: {
          200: {
            description: 'Precision, Recall, F1 Score, and Accuracy metrics JSON',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    precision: { type: 'string', example: '100.0%' },
                    recall: { type: 'string', example: '96.0%' },
                    f1Score: { type: 'string', example: '97.9%' },
                    accuracy: { type: 'string', example: '96.0%' },
                    metrics: {
                      type: 'object',
                      properties: {
                        truePositives: { type: 'number', example: 95 },
                        falseNegatives: { type: 'number', example: 4 },
                        falsePositives: { type: 'number', example: 0 },
                        totalGroundTruth: { type: 'number', example: 99 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

// 1. API routes FIRST
app.post('/api/redact', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a .docx file.' });
    }

    const buf = fs.readFileSync(req.file.path);
    const { outBuf } = await redactBuf(buf);

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="Redacted_Output.docx"');
    res.end(outBuf, 'binary');
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// verbose inspection endpoint (returns JSON list of detected PII entities and fake replacements)
app.post('/api/inspect', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a .docx file.' });
    }

    const buf = fs.readFileSync(req.file.path);
    const { stats, mappings } = await redactBuf(buf);

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({
      fileName: req.file.originalname,
      summary: stats,
      detectedMappings: mappings
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// dynamic evaluation endpoint (calls calcMetrics on real DOCX files dynamically)
app.get('/api/evaluate', async (req, res) => {
  try {
    const srcPath = path.join(__dirname, 'Red Herring Prospectus.docx');
    const redPath = path.join(__dirname, 'Red Herring Prospectus - REDACTED.docx');

    if (!fs.existsSync(srcPath) || !fs.existsSync(redPath)) {
      return res.status(404).json({ error: 'Evaluation DOCX files not found on server' });
    }

    const report = await calcMetrics(srcPath, redPath);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Swagger UI routes AFTER API endpoints
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/', (req, res) => res.redirect('/api-docs'));

// app server start karta hai
app.listen(port, () => {
  console.log(`[+] Server running at http://localhost:${port}`);
  console.log(`[+] Swagger UI docs available at http://localhost:${port}/api-docs`);
});
