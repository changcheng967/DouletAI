import { NextResponse } from 'next/server';

export async function POST(req) {
  const { query } = await req.json();
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DouletAI/1.0' },
    });
    const data = await res.json();

    const results = [];
    if (data.AbstractText) {
      results.push({ title: data.AbstractSource || 'DuckDuckGo', snippet: data.AbstractText, url: data.AbstractURL || '' });
    }
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text && topic.FirstURL) {
          results.push({ title: topic.Text.slice(0, 60), snippet: topic.Text, url: topic.FirstURL });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}
