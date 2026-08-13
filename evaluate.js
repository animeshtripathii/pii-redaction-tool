// redacted file ki accuracy aur recall test karne ka script

const fs = require('fs');
const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');

const WNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

// ground truth dataset
const GT_DATA = {
  PERSON_NAME: [
    'Kushal Subbayya Hegde', 'Pushpa Kushal Hegde', 'Rajesh Kushal Hegde',
    'Rohit Kushal Hegde', 'Rakhi Girija Shetty',
    'Sandesh Bhagwat', 'Amod Joshi', 'Sarthak Malvadkar', 'Ganesh Prasad',
    'Lokesh Shah', 'Soumavo Sarkar', 'Kishan Rastogi', 'Abhijit Diwan',
    'Shanti Gopalkrishnan', 'Prakash Boricha',
    'Eric Bacha', 'Sachin Gawade', 'Pravin Teli', 'Siddharth Jadhav',
    'Tushar Gavankar', 'Hitesh Ramani', 'Chitra Raste', 'Sharmila Joshi',
    'Cherag Gyara', 'Manisha Shukla', 'Tushar Wakhele', 'Anand Soni',
    'Parag Pansare', 'Ashish Mathew Pulloor', 'Kushal Hegde',
  ],

  COMPANY_NAME: [
    'KSH International Limited', 'KSH Logistics Private Limited',
    'Nuvama Wealth Management Limited', 'ICICI Securities Limited',
    'Link Intime India Private Limited',
    'HDFC Bank Limited', 'ICICI Bank Limited', 'Export-Import Bank of India',
    'IndusInd Bank Limited', 'Federal Bank Limited', 'Bajaj Finance Limited',
    'State Bank of India', 'MUFG Bank, Ltd.', 'Trilegal', 'Kirtane & Pandit LLP',
    'Kushal Electricals',
  ],

  EMAIL: [
    'cs.connect@kshinternational.com',
    'sarthak.malvadkar@kshinterantional.com',
    'ksh.ipo@nuvama.com',
    'customerservice.mb@nuvama.com',
    'prakash.boricha@nuvama.com',
    'sheetal.parab@nuvama.com',
    'ksh@icicisecurities.com',
    'customercare@icicisecurities.com',
    'ipo@trilegal.com',
    'kshinternational.ipo@in.mpms.mufg.com',
    'parag.pansare@kirtanepandit.com',
    'siddharth.jadhav@hdfcbank.com',
    'sachin.gawade@hdfcbank.com',
    'eric.bacha@hdfcbank.com',
    'tushar.gavankar@hdfcbank.com',
    'pravin.teli2@hdfcbank.com',
    'manisha.shukla@hdfcbank.com',
    'Ipocmg@icicibank.com',
    'hitesh.ramani@citi.com',
    'pro@eximbankindia.in',
    'sharmila.joshi@indusind.com',
    'cherag.gyara@icicibank.com',
    'rm6.ifbpune@sbi.co.in',
    'ashishmp@federalbank.co.in',
    'anand.soni@bajajfinserv.in',
    'hingnetare@gmail.com',
  ],

  PHONE: [
    '+ 91 20 4505 3237', '+ 91 20 45053237',
    '+ 91 22 4009 4400', '+91 22 40094400', '+91 22 6807 7100',
    '+91 22 4079 1000', '+91 81081 14949',
    '+91 22 30752929', '+91 22 30752928', '+91 22 30752914',
    '022-68052182',
    '+91 20 6606 4494', '+91 20 2640 3100', '+91-20-26234000',
    '+ 91 8879770456', '+91 20 6769 4648', '+91 20 2561 8211',
    '+ 91 91586 40360', '+91 20 7157 6403', '+91 22 4009 4400',
    '+ 91 20 6729 5100',
  ],

  ADDRESS: [
    '7th Floor, The Ruby, 29 Senapati Bapat Marg, Dadar (West), Mumbai',
    'C-101, 1st Floor, 247 Park, Lal Bahadur Shastri Marg, Vikhroli (West), Mumbai - 400 083',
    '163, 5th Floor, H.T.Parekh Marg Backbay Reclamation Churchgate, Mumbai',
    'SEBI Bhavan, Plot No. C4-A, G Block, Bandra Kurla Complex, Bandra (East), Mumbai - 400 051',
    'Exchange Plaza, C-1, Block G, Bandra Kurla Complex, Bandra (East), Mumbai - 400 051',
    'Phiroze Jeejeebhoy Towers, Dalal Street, Fort, Mumbai - 400 001',
  ],

  CIN: [
    'U28129PN1979PLC141032', 'U67190MH1999PTC118368',
    'L65920MH1994PLC080618', 'L65190GJ1994PLC021012',
  ],

  REG_NUMBER: [
    'INM000013004', 'INM000011179', 'INR000004058', 'INZ000166136',
  ],

  SSN: [],
  CREDIT_CARD: [],
  DOB: [],
  IP_ADDRESS: [],
};

const NO_PII = [
  'SEBI', 'BSE', 'NSE', 'RBI', 'IRDAI', 'AMFI', 'MCA',
  'Regulation 6(1)', 'Section 32', 'Schedule II',
  'SEBI ICDR Regulations', 'Companies Act, 2013',
  'Fiscal 2024', 'Fiscal 2025',
  'Order No.', 'Form SH-4', 'Chapter IX',
];

const norm = str => str.replace(/\s+/g, ' ').trim();

const hasTxt = (big, sub) => norm(big).toLowerCase().includes(norm(sub).toLowerCase());

// docx xml me se pure text ko string me read karta hai
async function readDoc(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);

  const targets = Object.keys(zip.files).filter(f =>
    /^word\/(document|header\d*|footer\d*)\.xml$/.test(f)
  );

  let out = '';
  for (const f of targets) {
    const xmlStr = await zip.file(f).async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, 'application/xml');

    const nodes = doc.getElementsByTagNameNS(WNS, 't');
    for (let i = 0; i < nodes.length; i++) {
      out += (nodes[i].textContent || nodes[i].text || '') + ' ';
    }
  }
  return out;
}

// accuracy test calculate karke JSON metrics return karta hai
async function calcMetrics(srcPath, redPath) {
  const rawOrg = await readDoc(srcPath);
  const rawRed = await readDoc(redPath);

  let totTP = 0, totFN = 0, totFP = 0;
  const perTypeRecall = {};

  for (const [typ, items] of Object.entries(GT_DATA)) {
    if (items.length === 0) continue;

    let tp = 0, fn = 0;
    for (const item of items) {
      const inOrg = hasTxt(rawOrg, item);
      const inRed = hasTxt(rawRed, item);

      if (!inOrg) continue;

      if (!inRed) {
        tp++;
      } else {
        fn++;
      }
    }

    const nGt = tp + fn;
    const rec = nGt > 0 ? (tp / nGt) : 0;
    totTP += tp;
    totFN += fn;
    perTypeRecall[typ] = `${(rec * 100).toFixed(1)}% (${tp}/${nGt})`;
  }

  for (const item of NO_PII) {
    if (hasTxt(rawOrg, item) && !hasTxt(rawRed, item)) {
      totFP++;
    }
  }

  const prec = (totTP + totFP) > 0 ? totTP / (totTP + totFP) : 0;
  const rec = (totTP + totFN) > 0 ? totTP / (totTP + totFN) : 0;
  const f1 = (prec + rec) > 0 ? (2 * prec * rec) / (prec + rec) : 0;
  const acc = (totTP + totFN + totFP) > 0 ? totTP / (totTP + totFN + totFP) : 0;

  return {
    document: 'KSH International Limited - Red Herring Prospectus',
    precision: `${(prec * 100).toFixed(1)}%`,
    recall: `${(rec * 100).toFixed(1)}%`,
    f1Score: `${(f1 * 100).toFixed(1)}%`,
    accuracy: `${(acc * 100).toFixed(1)}%`,
    metrics: {
      truePositives: totTP,
      falseNegatives: totFN,
      falsePositives: totFP,
      totalGroundTruth: totTP + totFN
    },
    perTypeRecall,
    status: totFP === 0 ? 'Zero false positives on distractor set.' : 'False positives detected.'
  };
}

// CLI runner for terminal evaluation
async function runEval(srcPath, redPath) {
  console.log('='.repeat(72));
  console.log('  PII REDACTION TOOL (JS) - EVALUATION REPORT');
  console.log('  Document: KSH International Limited - Red Herring Prospectus');
  console.log('='.repeat(72));

  const report = await calcMetrics(srcPath, redPath);

  console.log();
  console.log(`  Precision : ${report.precision}`);
  console.log(`  Recall    : ${report.recall}`);
  console.log(`  F1 Score  : ${report.f1Score}`);
  console.log(`  Accuracy  : ${report.accuracy}`);
  console.log(`  TP: ${report.metrics.truePositives} | FN: ${report.metrics.falseNegatives} | FP: ${report.metrics.falsePositives}`);
  console.log();
}

// script start point
if (require.main === module) {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (args.length < 2) {
    console.error('Usage: node evaluate.js <original.docx> <redacted.docx>');
    process.exit(1);
  }
  runEval(args[0], args[1]).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = { calcMetrics, GT_DATA, NO_PII };
