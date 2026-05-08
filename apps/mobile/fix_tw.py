import re

files = [
    "app/(auth)/register.tsx",
    "app/(tabs)/_layout.tsx", 
    "app/(tabs)/settings.tsx",
    "app/(tabs)/links.tsx",
    "app/link/[id]/edit.tsx",
    "app/link/[id]/analytics.tsx",
    "app/billing/index.tsx",
]

for fp in files:
    with open(fp, 'r') as f:
        content = f.read()
    
    original = content
    
    def replacer(m):
        inner = m.group(1)
        idx = inner.find('${')
        if idx < 0:
            return m.group(0)
        prefix = inner[:idx]
        rest = inner[idx+2:]
        end = rest.find('}')
        if end < 0:
            return m.group(0)
        expr = rest[:end]
        suffix = rest[end+1:]
        return f'tw({repr(prefix)} + ({expr}) + {repr(suffix)})'
    
    content = re.sub(r'tw\(`([^`]+)`\)', replacer, content)
    
    if content != original:
        with open(fp, 'w') as f:
            f.write(content)
        print(f'FIXED: {fp}')
    else:
        print(f'CLEAN: {fp}')
