import re

with open('app/(tabs)/links.tsx') as f:
    line = f.readlines()[59]

# Does `) appear?
idx = line.find('`')
print('First backtick at:', idx)
idx2 = line.find('`', idx+1)
print('Second backtick at:', idx2)
if idx2 >= 0:
    print('Chars after second backtick:', repr(line[idx2:idx2+5]))
    print('Is ) after backtick?', line[idx2+1] == ')')
