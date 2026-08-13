// redacted file ki accuracy aur recall test karne ka script

const fs = require('fs');
const JSZip = require('jszip');

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
    '022-68052182', '8879770456', '8108114949', '45053237',
    '68077100', '26403100', '26234000', '67694648',
    '25618211', '71576403', '68052182'
  ],

  ADDRESS: [
    'Village Birdewadi Chakan Taluka - Khed Pune – 410 501',
    'Complex, Bandra East, Mumbai 400051',
    'Marg, Prabhadevi, Mumbai 400025',
    'Floor, L B S Marg, Vikhroli (West), Mumbai 400083',
    'Plot No. J-25, Taloja Industrial Area, Village Padghe, Taluka Panvel, Raigad – 410 208',
    'Plot No. 5, Chakan Industrial Area, Phase II, Village Khalumbre, Taluka Khed, Pune – 410 501',
    'Plot No. F-223, Supa Parner Industrial Park, Mauje Palve Khurd, Taluka Parner, Dist – Ahmednagar, Maharashtra – 414 301',
    'floor Near Akurdi Railway Station Akurdi, Pune – 411 044',
    'Road, opposite PYC basketball court, Deccan Gymkhana, Pune – 411 004',
    'Road Lane no. 3, Shivaji Nagar, Deccan Gymkhana, Pune – 411 004',
    'Road, opposite PYC basketball court, Erandawane, Deccan Gymkhana, Pune – 411 004',
    'Road, behind Sahara Hotel, Shivajinagar, Model Colony, Pune – 411 016',
    'Road, Erandawane, Pune – 411 004',
    'Road, Minal Residency, Huzur, Govindpura, Bhopal – 462 023',
    'Road, Pune – 411 008',
    'Marg Prabhadevi, Mumbai – 400 025',
    'Complex, Bandra East Mumbai 400 051',
    'Marg, Lower Parel (West) Mumbai – 400 013',
    'Floor, L B S Marg, Vikhroli (West) Mumbai 400083',
    'marg Railway Station, Kanjurmarg (East) Mumbai – 400042',
    'Floor, H.T.Parekh Marg Backbay Reclamation Churchgate, Mumbai – 400020',
    'Road, Pune – 411 038',
    'Complex Shaniwar Peth, Pune – 411 030',
    'road Shivaji Nagar, Pune – 411 004',
    'Road, Pune – 411 001',
    'Complex, Bandra (E) Mumbai – 400 051',
    'Gat No. 11/3, 11/4, 11/5, Village Birdewadi',
    '7th Floor, The Ruby, 29 Senapati Bapat Marg, Dadar (West), Mumbai',
    'C-101, 1st Floor, 247 Park, Lal Bahadur Shastri Marg, Vikhroli (West), Mumbai - 400 083',
  ],

  CIN: [
    'U28129PN1979PLC141032',
    'U67190MH1999PTC118368',
    'L65920MH1994PLC080618',
    'L65190GJ1994PLC021012',
  ],

  REG_NUMBER: [
    'INM000013004',
    'INM000011179',
    'INR000004058',
    'INZ000166136',
  ],
};

const DISTRACTORS = [
  'SEBI', 'BSE', 'NSE', 'RBI', 'IRDAI', 'AMFI', 'MCA',
  'Companies Act, 2013', 'Regulation 6(1)', 'Section 32', 'Schedule II',
  'Fiscal 2024', 'Fiscal 2025', 'Rs. 100', '10.5%', '100%', '500000',
];

// docx zip buffer me se clean plain text extract karne ka helper function
async function extractText(docBuf) {
  const zip = await JSZip.loadAsync(docBuf);
  let fullText = '';

  const targetFiles = Object.keys(zip.files).filter(name =>
    /^word\/(document|header\d*|footer\d*)\.xml$/.test(name)
  );

  for (const f of targetFiles) {
    const xmlStr = await zip.file(f).async('string');
    xmlStr.replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi, (_, t) => {
      fullText += t + ' ';
      return _;
    });
  }

  return fullText.replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ');
}

// ground truth vs redacted docx precision recall compute karne ka main function
async function calcMetrics(srcPath, redPath) {
  const srcBuf = fs.readFileSync(srcPath);
  const redBuf = fs.readFileSync(redPath);

  const srcText = await extractText(srcBuf);
  const redText = await extractText(redBuf);

  let tpTotal = 0, fnTotal = 0;
  const breakdown = {};

  for (const [cat, items] of Object.entries(GT_DATA)) {
    let tp = 0, fn = 0;

    for (const item of items) {
      const inSrc = srcText.toLowerCase().includes(item.toLowerCase());
      const inRed = redText.toLowerCase().includes(item.toLowerCase());

      if (inSrc) {
        if (!inRed) {
          tp++;
        } else {
          fn++;
        }
      }
    }

    const rec = (tp + fn) > 0 ? (tp / (tp + fn)) * 100 : 100;
    breakdown[cat] = { total: tp + fn, tp, fn, recall: `${rec.toFixed(1)}%` };
    tpTotal += tp;
    fnTotal += fn;
  }

  let fp = 0;
  for (const d of DISTRACTORS) {
    const inSrc = srcText.toLowerCase().includes(d.toLowerCase());
    const inRed = redText.toLowerCase().includes(d.toLowerCase());
    if (inSrc && !inRed) {
      fp++;
    }
  }

  const prec = (tpTotal + fp) > 0 ? (tpTotal / (tpTotal + fp)) * 100 : 100;
  const rec = (tpTotal + fnTotal) > 0 ? (tpTotal / (tpTotal + fnTotal)) * 100 : 0;
  const f1 = (prec + rec) > 0 ? (2 * prec * rec) / (prec + rec) : 0;
  const acc = (tpTotal + fnTotal + fp) > 0 ? (tpTotal / (tpTotal + fnTotal + fp)) * 100 : 0;

  return {
    precision: `${prec.toFixed(1)}%`,
    recall: `${rec.toFixed(1)}%`,
    f1Score: `${f1.toFixed(1)}%`,
    accuracy: `${acc.toFixed(1)}%`,
    metrics: {
      truePositives: tpTotal,
      falseNegatives: fnTotal,
      falsePositives: fp,
      totalGroundTruth: tpTotal + fnTotal,
    },
    categoryBreakdown: breakdown,
  };
}

// evaluation benchmark cli output render karne ka main function
async function main() {
  const args = process.argv.slice(2);
  const srcFile = args[0] || 'Red Herring Prospectus.docx';
  const redFile = args[1] || 'Red Herring Prospectus - REDACTED.docx';

  if (!fs.existsSync(srcFile) || !fs.existsSync(redFile)) {
    console.error(`Error: Evaluation files not found. Ensure '${srcFile}' and '${redFile}' exist.`);
    process.exit(1);
  }

  const report = await calcMetrics(srcFile, redFile);

  console.log('========================================================================');
  console.log('  PII REDACTION TOOL (JS) - EVALUATION REPORT');
  console.log('  Document: KSH International Limited - Red Herring Prospectus');
  console.log('========================================================================\n');
  console.log(`  Precision : ${report.precision}`);
  console.log(`  Recall    : ${report.recall}`);
  console.log(`  F1 Score  : ${report.f1Score}`);
  console.log(`  Accuracy  : ${report.accuracy}`);
  console.log(`  TP: ${report.metrics.truePositives} | FN: ${report.metrics.falseNegatives} | FP: ${report.metrics.falsePositives}\n`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = { calcMetrics };
