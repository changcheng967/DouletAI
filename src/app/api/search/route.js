import { NextResponse } from 'next/server';

export async function POST(req) {
  const { query } = await req.json();
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  try {
    const results = [];

    // DuckDuckGo instant answer API
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'DouletAI/1.0' },
    });
    if (ddgRes.ok) {
      const data = await ddgRes.json();
      if (data.AbstractText) {
        results.push({ title: data.AbstractSource || 'DuckDuckGo', snippet: data.AbstractText, url: data.AbstractURL || '' });
      }
      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics.slice(0, 8)) {
          if (topic.Text && topic.FirstURL && results.length < 8) {
            results.push({ title: topic.Text.slice(0, 80), snippet: topic.Text, url: topic.FirstURL });
          }
          // Some topics have sub-topics
          if (topic.Topics) {
            for (const sub of topic.Topics.slice(0, 3)) {
              if (sub.Text && sub.FirstURL && results.length < 8) {
                results.push({ title: sub.Text.slice(0, 80), snippet: sub.Text, url: sub.FirstURL });
              }
            }
          }
        }
      }
      if (data.Results) {
        for (const r of data.Results.slice(0, 3)) {
          if (r.Text && r.FirstURL && results.length < 8) {
            results.push({ title: r.Text.slice(0, 80), snippet: r.Text, url: r.FirstURL });
          }
        }
      }
    }

    // Also try Wikipedia API for factual queries
    try {
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
      const wikiRes = await fetch(wikiUrl, { headers: { 'User-Agent': 'DouletAI/1.0' } });
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        if (wikiData.extract && results.length < 8) {
          results.push({
            title: wikiData.title || 'Wikipedia',
            snippet: wikiData.extract,
            url: wikiData.content_urls?.desktop?.page || '',
          });
        }
      }
    } catch {}

    return NextResponse.json({ results });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ results: [] });
  }
}
