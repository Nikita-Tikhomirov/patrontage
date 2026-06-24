import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    import os
    host = os.environ.get('SSH_HOST', 'sidelkrm.beget.tech')
    user = os.environ.get('SSH_USER', 'sidelkrm_tochka')
    pwd = os.environ.get('SSH_PASS', '')
    if not pwd:
        print('SSH_PASS env var not set')
        sys.exit(1)
    ssh.connect(host, username=user, password=pwd, timeout=15)

    cmds = [
        ('pwd', 'Current dir'),
        ('ls -la', 'Home listing'),
        ('find . -maxdepth 4 -name "*.php" -o -name ".env" -o -name "*.local*" 2>/dev/null | head -30', 'Project files'),
        ('php -v 2>&1 | head -1', 'PHP version'),
        ('env | grep -i tochka 2>/dev/null; env | grep -i jwt 2>/dev/null', 'Env vars'),
        ('cat ~/.bashrc 2>/dev/null | head -5', 'Bashrc'),
        ('netstat -tlnp 2>/dev/null | head -10 || ss -tlnp | head -10', 'Ports'),
    ]

    for cmd, desc in cmds:
        print(f'\n=== {desc} ===')
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out.strip():
            print(out.strip())
        if err.strip():
            print('STDERR:', err.strip()[:500])

    ssh.close()
except Exception as e:
    print(f'Error: {e}')
    sys.exit(1)
