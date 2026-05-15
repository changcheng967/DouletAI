require('dotenv').config();
const express = require('express');
const cors = require('cors');
const modelsRouter = require('./routes/models');
const chatRouter = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/models', modelsRouter);
app.use('/api/chat', chatRouter);

app.get('/api/health', (req, res) => {
  const providers = [];
  if (process.env.NVIDIA_API_KEY) providers.push('nvidia');
  if (process.env.ZEN_API_KEY) providers.push('zen');
  if (process.env.ARLIAI_API_KEY) providers.push('arliai');
  if (process.env.FREETHEAI_API_KEY) providers.push('freetheai');
  if (process.env.MODAL_API_KEY) providers.push('modal');
  if (process.env.GROQ_API_KEY) providers.push('groq');
  if (process.env.SAMBANOVA_API_KEY) providers.push('sambanova');
  if (process.env.CEREBRAS_API_KEY) providers.push('cerebras');
  if (process.env.GOOGLE_API_KEY) providers.push('google');
  if (process.env.OPENROUTER_API_KEY) providers.push('openrouter');
  if (process.env.GITHUB_TOKEN) providers.push('github');
  res.json({ status: 'ok', providers });
});

app.listen(PORT, () => {
  console.log(`DouletAI server running on http://localhost:${PORT}`);
  const keys = [
    ['NVIDIA', process.env.NVIDIA_API_KEY],
    ['OpenCode Zen', process.env.ZEN_API_KEY],
    ['Arli AI', process.env.ARLIAI_API_KEY],
    ['FreeTheAi', process.env.FREETHEAI_API_KEY],
    ['Modal', process.env.MODAL_API_KEY],
    ['Groq', process.env.GROQ_API_KEY],
    ['SambaNova', process.env.SAMBANOVA_API_KEY],
    ['Cerebras', process.env.CEREBRAS_API_KEY],
    ['Google Gemini', process.env.GOOGLE_API_KEY],
    ['OpenRouter', process.env.OPENROUTER_API_KEY],
    ['GitHub Models', process.env.GITHUB_TOKEN],
  ];
  for (const [name, key] of keys) {
    if (key) console.log(`  ${name}: configured`);
    else console.log(`  ${name}: not set`);
  }
});
