import re

# Exact line from file (with escaped quotes)
line = "            style={tw(`rounded-full border px-4 py-2 ${filter === item ? 'border-accent bg-accent' : 'border-surface-300 bg-surface-50')}`)}\n"

# Check: find tw(`
idx = line.find('tw(`')
print('tw(` at', idx)

# Find closing pattern: `)
idx2 = line.find('`)}', idx)
print('`)} at', idx2)

# Test regex
TW_RE = re.compile(r'tw\(`([^`]+)`\)')
m = TW_RE.search(line)
print('Match:', m)
if m:
    print('Group 1:', repr(m.group(1)))
