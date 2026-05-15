// Test ALL 122 NVIDIA NIM models with streaming
// Respects 40 RPM rate limit: ~2.5s between requests
require('dotenv').config();
const BASE = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const KEY = process.env.NVIDIA_API_KEY;

const ALL_MODELS = [
  '01-ai/yi-large','abacusai/dracarys-llama-3.1-70b-instruct','adept/fuyu-8b',
  'ai21labs/jamba-1.5-large-instruct','aisingapore/sea-lion-7b-instruct',
  'baai/bge-m3','bigcode/starcoder2-15b','bytedance/seed-oss-36b-instruct',
  'databricks/dbrx-instruct','deepseek-ai/deepseek-coder-6.7b-instruct',
  'deepseek-ai/deepseek-v4-flash','deepseek-ai/deepseek-v4-pro',
  'google/codegemma-1.1-7b','google/codegemma-7b','google/deplot',
  'google/gemma-2-2b-it','google/gemma-2b','google/gemma-3-12b-it',
  'google/gemma-3-4b-it','google/gemma-3n-e2b-it','google/gemma-3n-e4b-it',
  'google/gemma-4-31b-it','google/recurrentgemma-2b',
  'ibm/granite-3.0-3b-a800m-instruct','ibm/granite-3.0-8b-instruct',
  'ibm/granite-34b-code-instruct','ibm/granite-8b-code-instruct',
  'meta/codellama-70b','meta/llama-3.1-70b-instruct','meta/llama-3.1-8b-instruct',
  'meta/llama-3.2-11b-vision-instruct','meta/llama-3.2-1b-instruct',
  'meta/llama-3.2-3b-instruct','meta/llama-3.2-90b-vision-instruct',
  'meta/llama-3.3-70b-instruct','meta/llama-4-maverick-17b-128e-instruct',
  'meta/llama-guard-4-12b','meta/llama2-70b',
  'microsoft/kosmos-2','microsoft/phi-3-vision-128k-instruct',
  'microsoft/phi-3.5-moe-instruct','microsoft/phi-4-mini-instruct',
  'microsoft/phi-4-multimodal-instruct',
  'minimaxai/minimax-m2.7','mistralai/codestral-22b-instruct-v0.1',
  'mistralai/ministral-14b-instruct-2512','mistralai/mistral-7b-instruct-v0.3',
  'mistralai/mistral-large','mistralai/mistral-large-2-instruct',
  'mistralai/mistral-large-3-675b-instruct-2512','mistralai/mistral-medium-3.5-128b',
  'mistralai/mistral-nemotron','mistralai/mistral-small-4-119b-2603',
  'mistralai/mixtral-8x22b-instruct-v0.1','mistralai/mixtral-8x22b-v0.1',
  'mistralai/mixtral-8x7b-instruct-v0.1','moonshotai/kimi-k2.6',
  'nv-mistralai/mistral-nemo-12b-instruct',
  'nvidia/cosmos-reason2-8b','nvidia/ising-calibration-1-35b-a3b',
  'nvidia/llama-3.1-nemotron-51b-instruct','nvidia/llama-3.1-nemotron-70b-instruct',
  'nvidia/llama-3.1-nemotron-nano-8b-v1','nvidia/llama-3.1-nemotron-nano-vl-8b-v1',
  'nvidia/llama-3.3-nemotron-super-49b-v1','nvidia/llama-3.3-nemotron-super-49b-v1.5',
  'nvidia/llama3-chatqa-1.5-70b','nvidia/mistral-nemo-minitron-8b-8k-instruct',
  'nvidia/nemotron-3-nano-30b-a3b','nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  'nvidia/nemotron-3-super-120b-a12b','nvidia/nemotron-mini-4b-instruct',
  'nvidia/nemotron-nano-12b-v2-vl','nvidia/nemotron-nano-3-30b-a3b',
  'nvidia/nvidia-nemotron-nano-9b-v2',
  'nvidia/llama-3.1-nemotron-ultra-253b-v1','nvidia/nemotron-4-340b-instruct',
  'openai/gpt-oss-120b','openai/gpt-oss-20b',
  'qwen/qwen3-coder-480b-a35b-instruct','qwen/qwen3-next-80b-a3b-instruct',
  'qwen/qwen3-next-80b-a3b-thinking','qwen/qwen3.5-122b-a10b','qwen/qwen3.5-397b-a17b',
  'sarvamai/sarvam-m','stepfun-ai/step-3.5-flash',
  'stockmark/stockmark-2-100b-instruct','upstage/solar-10.7b-instruct',
  'writer/palmyra-creative-122b','writer/palmyra-fin-70b-32k',
  'writer/palmyra-med-70b','writer/palmyra-med-70b-32k',
  'z-ai/glm-5.1','z-ai/glm5','zyphra/zamba2-7b-instruct',
];

async function testModel(modelId) {
  const start = Date.now();
  try {
    const res = await fetch(BASE + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + KEY,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'Say hi' }],
        max_tokens: 20,
        temperature: 0.3,
        stream: true,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      const t = await res.text();
      let detail = '';
      try { detail = JSON.parse(t).detail || ''; } catch {}
      return { id: modelId, status: res.status, time: Date.now()-start, error: detail.slice(0,100) || t.slice(0,80) };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let content = '', thinking = '', usage = null, chunks = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      for (const line of text.split('\n')) {
        const t = line.trim();
        if (!t || t === 'data: [DONE]' || !t.startsWith('data: ')) continue;
        try {
          const j = JSON.parse(t.slice(6));
          const d = j.choices?.[0]?.delta;
          if (d?.content) { content += d.content; chunks++; }
          if (d?.reasoning_content) { thinking += d.reasoning_content; chunks++; }
          if (j.usage) usage = j.usage;
        } catch {}
      }
    }

    return {
      id: modelId,
      status: 200,
      time: Date.now()-start,
      content: content.slice(0,60) || '(empty)',
      thinking: thinking ? 'yes' : 'no',
      tokens: usage ? usage.prompt_tokens + (usage.completion_tokens||0) : '?',
      chunks,
    };
  } catch (e) {
    return { id: modelId, status: 'TIMEOUT', time: Date.now()-start, error: e.message?.slice(0,60) };
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const results = [];
  console.log('Testing ' + ALL_MODELS.length + ' models (2.5s delay = ~5 min total)...\n');

  for (let i = 0; i < ALL_MODELS.length; i++) {
    const r = await testModel(ALL_MODELS[i]);
    results.push(r);
    const tag = r.status === 200 ? 'OK' : r.status === 'TIMEOUT' ? 'SLOW' : 'ERR';
    console.log(`[${String(i+1).padStart(3)}/${ALL_MODELS.length}] ${tag} ${r.id} (${r.time}ms) ${r.content || r.error || ''}`);
    if (i < ALL_MODELS.length - 1) await sleep(2500);
  }

  // Summary
  const ok = results.filter(r => r.status === 200);
  const err = results.filter(r => r.status !== 200 && r.status !== 'TIMEOUT');
  const slow = results.filter(r => r.status === 'TIMEOUT');

  console.log('\n\n========== SUMMARY ==========');
  console.log('WORKING (' + ok.length + '):');
  ok.forEach(r => console.log('  ' + r.id));
  console.log('\nERRORS (' + err.length + '):');
  err.forEach(r => console.log('  ' + r.id + ' [' + r.status + '] ' + (r.error||'').slice(0,60)));
  console.log('\nTIMEOUT/NO RESPONSE (' + slow.length + '):');
  slow.forEach(r => console.log('  ' + r.id + ' (' + r.time + 'ms)'));
})();
