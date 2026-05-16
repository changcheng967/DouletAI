import { NextResponse } from 'next/server';

export async function POST(req) {
  const { query } = await req.json();
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  try {
    // Use DuckDuckGo HTML lite for actual search results
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await res.text();

    const results = [];
    // Parse result blocks from DuckDuckGo HTML
    const resultRegex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>(.*?)<\/a>/gi;
    let match;
    while ((match = resultRegex.exec(html)) !== null && results.length < 6) {
      const resultUrl = match[1].replace(/&amp;/g, '&');
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      const snippet = match[3].replace(/<[^>]+>/g, '').trim();
      if (title && snippet) {
        results.push({ title, snippet, url: resultUrl });
      }
    }

    // Fallback: also try the instant answer API
    if (results.length === 0) {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const ddgRes = await fetch(ddgUrl, { headers: { 'User-Agent': 'DouletAI/1.0' } });
      const data = await ddgRes.json();

      if (data.AbstractText) {
        results.push({ title: data.AbstractSource || 'DuckDuckGo', snippet: data.AbstractText, url: data.AbstractURL || '' });
      }
      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics.slice(0, 5)) {
          if (topic.Text && topic.FirstURL && results.length < 6) {
            results.push({ title: topic.Text.slice(0, 80), snippet: topic.Text, url: topic.FirstURL });
          }
        }
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}
