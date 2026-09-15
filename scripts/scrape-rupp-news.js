const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.rupp.edu.kh';
const LIST_URL = `${BASE_URL}/scholarship-and-news`;

const OUT_JSON = path.join(__dirname, 'rupp-news-output.json');
const OUT_JS = path.join(__dirname, '..', 'frontend', 'src', 'data', 'newsData.js');
const IMG_DIR = path.join(__dirname, '..', 'frontend', 'src', 'assets', 'images', 'rupp');

const HEADLESS_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const FALLBACK_IMAGE = {
  Scholarship: 'https://commons.wikimedia.org/wiki/Special:FilePath/Graduation.jpg',
  Event: 'https://commons.wikimedia.org/wiki/Special:FilePath/Conference.jpg',
  Announcement: 'https://commons.wikimedia.org/wiki/Special:FilePath/Notice_Board.jpg',
  News: 'https://commons.wikimedia.org/wiki/Special:FilePath/University.jpg',
};

function log(...args) {
  console.log(`[scrape-rupp]`, ...args);
}

function postTypeFromUrl(url) {
  const m = String(url).match(/\/(news|scholarship)\/(\d+)$/);
  return m ? m[1] : '';
}

function mapCategory(url, badge, title = '', excerpt = '') {
  const type = postTypeFromUrl(url);
  if (type === 'scholarship') return 'Scholarship';
  const b = String(badge || '').trim().toLowerCase();
  if (b === 'announcement' || b === 'announcements' || /announcement/i.test(`${title} ${excerpt}`)) return 'Announcement';
  if (/exchange/i.test(`${title} ${excerpt}`)) return 'Exchange Program';
  if (/\b(training|workshop|seminar|workshop)\b/i.test(`${title} ${excerpt}`)) return 'Training';
  if (/\b(conference|competition|sports?|tournament|event|meeting|forum|webinar)\b/i.test(`${title} ${excerpt}`)) return 'Activity';
  return 'News';
}

function formatDate(raw) {
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return String(raw || '').trim();
}

function parseDateKey(raw) {
  const d = new Date(raw);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function estimateReadTime(sections) {
  const words = sections.reduce((acc, s) => acc + s.paragraphs.join(' ').split(/\s+/).filter(Boolean).length, 0);
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function buildTags(category, badge, dept, title, excerpt) {
  const set = new Set();
  if (badge) set.add(String(badge).trim().toUpperCase());
  if (category) set.add(category);
  if (dept) set.add(dept);
  const keywordMap = [
    ['mo[uv]', 'MOU'],
    ['internship', 'Internship'],
    ['exchange', 'Exchange'],
    ['scholarship', 'Scholarship'],
    ['program', 'Program'],
    ['training', 'Training'],
    ['workshop', 'Workshop'],
    ['conference', 'Conference'],
    ['seminar', 'Seminar'],
    ['career', 'Career'],
    ['sport', 'Sports'],
    ['tournament', 'Tournament'],
    ['donation', 'Donation'],
    ['charity', 'Charity'],
    ['application', 'Application'],
    ['deadline', 'Deadline'],
    ['competition', 'Competition'],
    ['grad', 'Graduation'],
  ];
  const text = `${title} ${excerpt}`.toLowerCase();
  for (const [re, label] of keywordMap) {
    if (new RegExp(re).test(text)) set.add(label);
  }
  return [...set].slice(0, 5);
}

async function scrollToLoadAll(page) {
  await page.goto(LIST_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  let prevCount = -1;
  let stableRounds = 0;
  for (let i = 0; i < 60; i++) {
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(700);
    const count = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .filter((a) => /\/news\/\d+$|\/scholarship\/\d+$/.test(a.getAttribute('href') || ''))
        .length
    );
    if (count === prevCount) stableRounds++;
    else stableRounds = 0;
    prevCount = count;
    if (stableRounds >= 6 && i > 4) break;
  }
  await page.waitForTimeout(1500);

  const clickedLoadMore = await clickLoadMoreIfPresent(page);
  return clickedLoadMore;
}

async function clickLoadMoreIfPresent(page) {
  const btn = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('button, a[role="button"]'));
    const found = candidates.find((el) => {
      const t = (el.innerText || '').trim().toLowerCase();
      return /load more|show more|see more|view more|next page|loadmore/.test(t) && t !== 'show filters';
    });
    return found ? { text: (found.innerText || '').trim().slice(0, 40) } : null;
  });
  if (btn) {
    log('Found "load more" control:', btn.text, '— clicking and scrolling again.');
    const textToClick = btn.text;
    await page.getByText(textToClick, { exact: false }).first().click().catch(() => page.mouse.wheel(0, 9000));
    await page.waitForTimeout(2500);
    await scrollToLoadAll(page);
    return true;
  }
  return false;
}

async function collectCards(page) {
  return page.evaluate(() => {
    const seen = new Set();
    const cards = [];
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      if (!/\/news\/\d+$|\/scholarship\/\d+$/.test(href)) continue;
      const full = new URL(href, location.origin).href;
      const id = (full.match(/\/(news|scholarship)\/(\d+)$/) || [])[2];
      if (seen.has(id)) continue;
      seen.add(id);
      const img = a.querySelector('img');
      const badgeEl = a.querySelector('span[class*="bg-green-700"], span[class*="bg-green-600"]');
      const deptEl = a.querySelector('span[class*="bg-green-50"]');
      const timeEl = a.querySelector('time');
      const titleEl = a.querySelector('h3');
      const excerptEl = a.querySelector('p');
      cards.push({
        url: full,
        id,
        badge: badgeEl ? badgeEl.innerText.trim() : '',
        department: deptEl ? deptEl.innerText.trim() : '',
        date: timeEl ? timeEl.innerText.trim() : '',
        title: titleEl ? titleEl.innerText.replace(/\s+/g, ' ').trim() : '',
        excerpt: excerptEl ? excerptEl.innerText.replace(/\s+/g, ' ').trim() : '',
        image: img ? img.getAttribute('src') : '',
      });
    }
    return cards;
  });
}

async function scrapeDetail(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try {
    await page.waitForSelector('.ck-content', { timeout: 25000 });
  } catch {
    log('WARN: no .ck-content for', url, '— trying a short wait then reading page text.');
    await page.waitForTimeout(2000);
  }

  const detail = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const h1s = Array.from(main.querySelectorAll('h1'));
    const title = h1s.length ? h1s[h1s.length - 1].innerText.replace(/\s+/g, ' ').trim() : '';

    const dateSpan = Array.from(main.querySelectorAll('span, time'))
      .map((el) => el.innerText.replace(/\s+/g, ' ').trim())
      .find((t) => /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},\s+\d{4}$/i.test(t))
      || '';

    const sections = [];
    const root = document.querySelector('.ck-content.ckeditor-content');
    if (root) {
      let cur = null;
      const pushText = (text) => {
        const clean = String(text || '').replace(/\s+/g, ' ').trim();
        if (!clean) return;
        if (!cur) {
          cur = { heading: 'Overview', paragraphs: [] };
          sections.push(cur);
        }
        cur.paragraphs.push(clean);
      };
      for (const el of root.children) {
        const tag = el.tagName.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4', 'h5'].includes(tag)) {
          const heading = el.innerText.replace(/\s+/g, ' ').trim();
          if (heading.length > 150) {
            pushText(heading);
          } else {
            cur = { heading: heading || 'Overview', paragraphs: [] };
            sections.push(cur);
          }
        } else if (tag === 'p' || tag === 'blockquote') {
          pushText(el.innerText);
        } else if (tag === 'ul' || tag === 'ol') {
          el.querySelectorAll(':scope > li').forEach((li) => pushText(li.innerText));
        } else if (tag === 'table') {
          pushText(el.innerText);
        } else if (tag === 'div' && el.classList.contains('raw-html-embed')) {
          const clone = el.cloneNode(true);
          clone.querySelectorAll('img, svg, script, style, meta, title, link, noscript').forEach((n) => n.remove());
          pushText(clone.innerText);
        } else if (tag === 'figure') {
          const cap = el.querySelector('figcaption');
          if (cap) pushText(cap.innerText);
        } else {
          const clone = el.cloneNode(true);
          clone.querySelectorAll('img, svg, script').forEach((n) => n.remove());
          pushText(clone.innerText);
        }
      }
    }

    return { title, date: dateSpan, sections };
  });

  return detail;
}

async function downloadImage(ctx, src, dest) {
  try {
    const resp = await ctx.request.get(src, { timeout: 60000 });
    if (!resp.ok()) return false;
    const body = await resp.body();
    if (body.length < 1024) return false;
    fs.writeFileSync(dest, body);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: HEADLESS_UA, locale: 'en-US' });
  const page = await context.newPage();

  try {
    log('Loading listing page and scrolling to collect all posts...');
    await scrollToLoadAll(page);
    const all = await collectCards(page);
    log(`Collected ${all.length} unique posts from listing page.`);
    for (let i = 0; i < all.length; i++) {
      const card = all[i];
      const detail = await scrapeDetail(page, card.url);
      card.title = detail.title || card.title;
      card.date = detail.date || card.date;
      card.body = detail.sections;
      card.image = card.image.replace(/&amp;/g, '&');
      if (i % 10 === 0) log(`Fetched detail ${i + 1}/${all.length}: ${card.title.slice(0, 50)}`);
    }

    // Build article objects
    fs.mkdirSync(IMG_DIR, { recursive: true });
    const sectionsFor = (card) =>
      (card.body && card.body.length ? card.body : [{ heading: 'Overview', paragraphs: [card.excerpt || card.title] }]);

    const merged = all.map((card) => ({
      card,
      category: mapCategory(card.url, card.badge, card.title, card.excerpt),
      title: card.title || card.excerpt || `RUPP Post ${card.id}`,
      date: formatDate(card.date),
      excerpt: card.excerpt,
      body: sectionsFor(card),
      author: card.department || 'Royal University of Phnom Penh',
      _sortKey: parseDateKey(card.date),
    }));

    merged.sort((a, b) => b._sortKey - a._sortKey);

    const articles = [];
    const imports = [];
    for (let i = 0; i < merged.length; i++) {
      const finalId = i + 1;
      const m = merged[i];
      const imgSrc = m.card.image && m.card.image.startsWith('http') ? m.card.image.replace(/&amp;/g, '&') : '';
      let image = '';
      let imageImport = '';

      if (imgSrc) {
        const dest = path.join(IMG_DIR, `rupp-${finalId}.jpg`);
        const ok = await downloadImage(context, imgSrc, dest);
        if (ok) {
          imageImport = `imgRupp${finalId}`;
          imports.push(`import ${imageImport} from '../assets/images/rupp/rupp-${finalId}.jpg';`);
        }
      }

      if (!imageImport) {
        image = FALLBACK_IMAGE[m.category] || FALLBACK_IMAGE.News;
      }

      articles.push({
        id: finalId,
        imageImport,
        image,
        category: m.category,
        title: m.title,
        date: m.date,
        excerpt: m.excerpt || (m.body[0]?.paragraphs?.[0] || '').slice(0, 180),
        badge: 'RUPP',
        author: m.author,
        readTime: estimateReadTime(m.body),
        tags: buildTags(m.category, m.card.badge, m.card.department, m.card.title, m.card.excerpt),
        body: m.body,
      });
    }

    const cleanForJson = articles.map(({ imageImport, ...rest }) => rest);
    fs.writeFileSync(OUT_JSON, JSON.stringify(cleanForJson, null, 2));
    log(`Wrote raw data -> ${OUT_JSON}`);

    const module = `// Auto-generated by scripts/scrape-rupp-news.js (npm run scrape:rupp)\n// Do not edit by hand — re-run the scraper to refresh.\n\n${imports.join('\n')}\n\nconst newsData = [\n${articles.map((a) => {
      const lines = [];
      lines.push(`  {`);
      lines.push(`    id: ${a.id},`);
      lines.push(`    image: ${a.imageImport || JSON.stringify(a.image)},`);
      lines.push(`    category: ${JSON.stringify(a.category)},`);
      lines.push(`    title: ${JSON.stringify(a.title)},`);
      lines.push(`    date: ${JSON.stringify(a.date)},`);
      lines.push(`    excerpt: ${JSON.stringify(a.excerpt)},`);
      lines.push(`    badge: ${JSON.stringify(a.badge)},`);
      lines.push(`    author: ${JSON.stringify(a.author)},`);
      lines.push(`    readTime: ${JSON.stringify(a.readTime)},`);
      lines.push(`    tags: ${JSON.stringify(a.tags)},`);
      lines.push(`    body: [`);
      for (const s of a.body) {
        lines.push(`      { heading: ${JSON.stringify(s.heading)}, paragraphs: ${JSON.stringify(s.paragraphs)} },`);
      }
      lines.push(`    ]`);
      lines.push(`  },`);
      return lines.join('\n');
    }).join('\n')}\n];\n\nexport default newsData;\n`;

    fs.writeFileSync(OUT_JS, module);
    log(`Generated newsData.js with ${articles.length} articles -> ${OUT_JS}`);
  } catch (err) {
    log('Fatal:', err.message);
    await page.screenshot({ path: path.join(__dirname, 'rupp-error-screenshot.png'), fullPage: false }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();