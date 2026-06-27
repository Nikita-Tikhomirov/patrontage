import { writeFileSync, mkdirSync } from 'fs';
import { buildPaymentPageFragmentHtml, wrapPaymentPageWithSiteChrome } from './payment-page.mjs';

const SITE_URL = 'https://patronage-service.ru/';

async function main() {
    const resp = await fetch(SITE_URL);
    const sourceHtml = await resp.text();

    const headerMatch = sourceHtml.match(/<header\b[\s\S]*?<\/header>/i);
    const headerHtml = headerMatch ? headerMatch[0] : '';

    const footerMatch = sourceHtml.match(/<footer\b[\s\S]*?<\/footer>/i);
    const footerHtml = footerMatch ? footerMatch[0] : '';

    const headMatch = sourceHtml.match(/<head\b[\s\S]*?<\/head>/i);
    const headHtml = headMatch ? headMatch[0] : '';
    const linkRegex = /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi;
    const linkMatches = [...headHtml.matchAll(linkRegex)];
    const headAssetsHtml = linkMatches.map(m => m[0]).join('\n');

    const scriptRegex = /<script\b[^>]*src=["'][^"']+["'][^>]*>\s*<\/script>/gi;
    const scriptMatches = [...sourceHtml.matchAll(scriptRegex)];
    const bodyScriptsHtml = scriptMatches.map(m => m[0]).join('\n');

    const paymentHtml = buildPaymentPageFragmentHtml();

    const fullHtml = wrapPaymentPageWithSiteChrome({
        bodyScriptsHtml,
        footerHtml,
        headAssetsHtml,
        headerHtml,
        paymentHtml,
        title: '\u041e\u043f\u043b\u0430\u0442\u0430',
    });

    mkdirSync('dist', { recursive: true });
    writeFileSync('dist/oplata.html', fullHtml, 'utf8');
    console.log('Full page size:', fullHtml.length);
    console.log('Has header:', fullHtml.includes('<header'));
    console.log('Has footer:', fullHtml.includes('<footer'));
    console.log('Has redirect:', fullHtml.includes('URLSearchParams'));
}

main();
