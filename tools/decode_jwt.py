import json, base64, time, sys

jwt = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read().strip()

parts = jwt.split('.')
if len(parts) < 2:
    print('Invalid JWT')
    sys.exit(1)

payload = parts[1]
padding = 4 - len(payload) % 4
if padding != 4:
    payload += '=' * padding
decoded = base64.urlsafe_b64decode(payload)
claims = json.loads(decoded)

now = int(time.time())

def ts(t):
    return time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(t)) + ' UTC'

print(f'Current: {ts(now)}')
print(f'iat:     {ts(claims.get("iat", 0))}')
print(f'exp:     {ts(claims.get("exp", 0))}')
print(f'scope:   {claims.get("scope", "?")}')
print(f'aud:     {claims.get("aud", "?")}')
print(f'sub:     {str(claims.get("sub", "?"))[:30]}...')

exp = claims.get('exp', 0)
if now > exp:
    hours = (now - exp) // 3600
    print(f'STATUS: EXPIRED {hours}h ago!')
else:
    rem = exp - now
    print(f'STATUS: VALID for {rem // 3600}h {(rem % 3600) // 60}m')

# Check for required scopes
scopes = claims.get('scope', '')
if isinstance(scopes, list):
    scopes = ' '.join(scopes)
print(f'Has openbanking: {"openbanking" in str(scopes).lower()}')
print(f'Has acquiring:   {"acquiring" in str(scopes).lower()}')
