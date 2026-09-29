import subprocess

res = subprocess.check_output(['git', 'show', 'HEAD:frontend/src/components/FormsList.jsx'], encoding='utf-8')
lines = res.splitlines()
with open('scratch/head_lines_start.txt', 'w', encoding='utf-8') as f:
    for i, l in enumerate(lines[280:350], start=280):
        f.write(f"{i+1}: {l}\n")

print("Wrote scratch/head_lines_start.txt")
