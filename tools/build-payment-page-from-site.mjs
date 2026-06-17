import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildPaymentPageFragmentHtml,
  wrapPaymentPageWithSiteChrome,
} from './payment-page.mjs';

const SITE_URL = 'https://patronage-service.ru/';

function unique(tags) {
  return [...new Set(tags.filter(Boolean))];
}

function stripLineEndWhitespace(html) {
  return html.replace(/[ \t]+$/gm, '');
}

function extractFirstBlock(html, tagName) {
  const openMatch = new RegExp(`<${tagName}\\b`, 'i').exec(html);

  if (!openMatch) {
    throw new Error(`Cannot find <${tagName}> in source HTML.`);
  }

  const start = openMatch.index;
  const closeMatch = new RegExp(`</${tagName}>`, 'i').exec(html.slice(start));

  if (!closeMatch) {
    throw new Error(`Cannot find </${tagName}> in source HTML.`);
  }

  return {
    end: start + closeMatch.index + closeMatch[0].length,
    html: html.slice(start, start + closeMatch.index + closeMatch[0].length),
    start,
  };
}

function extractHeader(html) {
  const header = extractFirstBlock(html, 'header');
  const afterHeader = html.slice(header.end);
  const trailingScript = /^\s*(<script\b[\s\S]*?<\/script>)/i.exec(afterHeader)?.[1] ?? '';

  if (trailingScript.includes('header__burger')) {
    return `${header.html}\n${trailingScript}`;
  }

  return header.html;
}

function extractFooter(html) {
  const footer = extractFirstBlock(html, 'footer');
  const beforeFooter = html.slice(0, footer.start);
  const styleStart = beforeFooter.lastIndexOf('<style');
  const styleEnd = beforeFooter.lastIndexOf('</style>');
  const styleHtml = styleStart >= 0 && styleEnd > styleStart
    ? beforeFooter.slice(styleStart, styleEnd + '</style>'.length)
    : '';

  if (styleHtml.includes('.footer')) {
    return `${styleHtml}\n${footer.html}`;
  }

  return footer.html;
}

function extractHeadAssets(html) {
  const head = extractFirstBlock(html, 'head').html;
  const linkTags = [...head.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => {
      const normalized = tag.toLowerCase();
      return normalized.includes('rel="stylesheet"')
        || normalized.includes("rel='stylesheet'")
        || normalized.includes('rel="icon"')
        || normalized.includes("rel='icon'")
        || normalized.includes('rel="apple-touch-icon"')
        || normalized.includes("rel='apple-touch-icon'");
    });

  return unique(linkTags).join('\n');
}

function extractBodyScripts(html) {
  const scriptPriority = (tag) => {
    if (/jquery/i.test(tag)) return 0;
    if (/ajaxform\/js\/default\.js/i.test(tag)) return 1;
    if (/modxminify\/cache\/scripts/i.test(tag)) return 2;
    if (/seoLinks\.js/i.test(tag)) return 3;
    return 4;
  };
  const scriptTags = [...html.matchAll(/<script\b[^>]*src=["'][^"']+["'][^>]*>\s*<\/script>/gi)]
    .map((match) => match[0])
    .filter((tag) => /jquery|ajaxform\/js\/default\.js|modxminify\/cache\/scripts|seoLinks\.js/i.test(tag));

  return unique(scriptTags).sort((left, right) => scriptPriority(left) - scriptPriority(right)).join('\n');
}

export function extractSiteChrome(sourceHtml) {
  return {
    bodyScriptsHtml: extractBodyScripts(sourceHtml),
    footerHtml: extractFooter(sourceHtml),
    headAssetsHtml: extractHeadAssets(sourceHtml),
    headerHtml: extractHeader(sourceHtml),
  };
}

async function main() {
  const response = await fetch(SITE_URL);

  if (!response.ok) {
    throw new Error(`Cannot fetch ${SITE_URL}: HTTP ${response.status}`);
  }

  const sourceHtml = await response.text();
  const chrome = extractSiteChrome(sourceHtml);
  const paymentHtml = buildPaymentPageFragmentHtml();
  const fullHtml = stripLineEndWhitespace(wrapPaymentPageWithSiteChrome({ ...chrome, paymentHtml }));

  const outputPath = resolve('dist/oplata.html');
  const fragmentPath = resolve('dist/oplata.fragment.html');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, fullHtml, 'utf8');
  writeFileSync(fragmentPath, stripLineEndWhitespace(paymentHtml), 'utf8');

  console.log(outputPath);
  console.log(fragmentPath);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
