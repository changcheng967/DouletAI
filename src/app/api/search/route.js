import { NextResponse } from 'next/server';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

function parseDDGResults(html) {
  const results = [];
  // Parse link elements with class result__a
  const linkRegex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null && results.length < 8) {
    const url = match[1].replace(/&amp;/g, '&');
    const title = match[2].replace(/<[^>]+>/g, '').trim();
    // Find the snippet that follows this link
    const afterLink = html.slice(match.index + match[0].length);
    const snippetMatch = afterLink.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
    const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    if (title) results.push({ title, snippet: snippet || title, url });
  }
  return results;
}

function parseLiteResults(html) {
  const results = [];
  // DDG Lite uses table rows with class="result-link" and class="result-snippet"
  const rowRegex = /class="result-link"[^>]*><a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = rowRegex.exec(html)) !== null && results.length < 8) {
    const url = match[1].replace(/&amp;/g, '&');
    const title = match[2].replace(/<[^>]+>/g, '').trim();
    // Find snippet in same row
    const afterLink = html.slice(match.index, match.index + 2000);
    const snippetMatch = afterLink.match(/class="result-snippet"[^>]*>([\s\S]*?)<\/td>/i);
    const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    if (title) results.push({ title, snippet: snippet || title, url });
  }
  return results;
}

export async function POST(req) {
  const { query } = await req.json();
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  const results = [];

  try {
    // Strategy 1: DDG HTML search (POST form)
    const htmlRes = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        ...BROWSER_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://duckduckgo.com/',
        'Origin': 'https://duckduckgo.com',
      },
      body: `q=${encodeURIComponent(query)}&b=Search&kl=wt-wt`,
    });
    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const parsed = parseDDGResults(html);
      results.push(...parsed);
    }
  } catch {}

  // Strategy 2: DDG Lite (simpler HTML, less bot detection)
  if (results.length < 3) {
    try {
      const liteRes = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}&kl=wt-wt`, {
        headers: BROWSER_HEADERS,
      });
      if (liteRes.ok) {
        const liteHtml = await liteRes.text();
        const parsed = parseLiteResults(liteHtml);
        // Add only unique URLs
        const existingUrls = new Set(results.map(r => r.url));
        for (const r of parsed) {
          if (!existingUrls.has(r.url)) {
            results.push(r);
            if (results.length >= 8) break;
          }
        }
      }
    } catch {}
  }

  return NextResponse.json({ results: results.slice(0, 8) });
}
