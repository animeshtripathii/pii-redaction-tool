// express server aur swagger ui integration ka script

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const { redactBuffer } = require('./redact');
const { calcMetrics } = require('./evaluate');

const app = express();
const port = process.env.PORT || 3000;

// use in-memory storage for uploaded files (zero disk I/O, works everywhere: Render, Vercel, AWS)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// enable CORS for cross-origin Swagger UI requests on cloud platforms
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

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
                    detectedMappings: { type: 'object' },
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
                    recall: { type: 'string', example: '76.8%' },
                    f1Score: { type: 'string', example: '86.9%' },
                    accuracy: { type: 'string', example: '76.8%' },
                    metrics: {
                      type: 'object',
                      properties: {
                        truePositives: { type: 'number' },
                        falseNegatives: { type: 'number' },
                        falsePositives: { type: 'number' },
                        totalGroundTruth: { type: 'number' },
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

// 1. API routes FIRST — before swagger middleware
app.post('/api/redact', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a .docx file.' });
    }

    const { outBuf } = await redactBuffer(req.file.buffer);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="Redacted_Output.docx"');
    res.end(outBuf, 'binary');
  } catch (err) {
    console.error('[redact] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// verbose inspection endpoint — same redactBuffer, returns JSON mappings
app.post('/api/inspect', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a .docx file.' });
    }

    const { stats, mappings } = await redactBuffer(req.file.buffer);

    res.json({
      fileName: req.file.originalname,
      summary: stats,
      detectedMappings: mappings
    });
  } catch (err) {
    console.error('[inspect] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// dynamic evaluation endpoint — runs calcMetrics on real DOCX files
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
    console.error('[evaluate] Error:', err.message);
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
