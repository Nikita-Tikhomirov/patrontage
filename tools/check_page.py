import re

with open('tools/oplata_live.html', encoding='utf-8') as f:
    html = f.read()

for kw in ['payment=success', 'payment=fail', 'redirectUrl', 'спасибо', 'успешно', 'payment-status', 'result-message']:
    if kw.lower() in html.lower():
        idx = html.lower().find(kw.lower())
        snippet = html[max(0,idx-40):idx+len(kw)+40].replace('\n','\\n')
        print(f'Found "{kw}": ...{snippet}...')
    else:
        print(f'"{kw}" NOT found')

print(f'\nTotal length: {len(html)} chars')
print(f'Has <form>: {("<form" in html)}')
print(f'<script> count: {html.count("<script")}')

# Check URL params handling
if 'URLSearchParams' in html or 'window.location.search' in html:
    print('Has URL params handling: YES')
else:
    print('URL params handling: NONE')
