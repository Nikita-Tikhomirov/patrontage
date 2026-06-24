import os
from ftplib import FTP
import io, re

host = os.environ.get('FTP_HOST', 'sidelkrm.beget.tech')
user = os.environ.get('FTP_USER', 'sidelkrm_tochka')
pwd = os.environ.get('FTP_PASS', '')
if not pwd:
    print('FTP_PASS env var not set')
    exit(1)

ftp = FTP(host, timeout=15)
ftp.login(user, pwd)

print('=== core/config/config.inc.php ===')
try:
    data = io.BytesIO()
    ftp.retrbinary('RETR /core/config/config.inc.php', data.write)
    content = data.getvalue().decode('utf-8')
    content = re.sub(r"'password' => '([^']+)'", r"'password' => '***'", content)
    content = re.sub(r'password=([^\s&]+)', r'password=***', content)
    print(content)
except Exception as e:
    print(f'Error: {e}')

ftp.quit()
