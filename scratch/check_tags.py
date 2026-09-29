with open("frontend/src/components/FormsList.jsx", "r", encoding="utf-8") as f:
    content = f.read()

start_idx = content.find("return (")
code = content[start_idx + len("return ("):]

# Tokenize code into JSX tags and curly braces
import re

i = 0
n = len(code)
stack = []
line = content[:start_idx].count('\n') + 1

while i < n:
    ch = code[i]
    if ch == '\n':
        line += 1
        i += 1
        continue
    
    # Check for JSX comment {/* ... */}
    if code[i:i+3] == '{/*':
        end_comment = code.find('*/}', i+3)
        if end_comment != -1:
            line += code[i:end_comment+3].count('\n')
            i = end_comment + 3
            continue

    # Check for tag
    if ch == '<':
        # could be </tag> or <tag ... /> or <tag ...> or <> or </>
        # Check if it's comparison operator like `i < n` or JSX tag
        # In JSX, tag starts with </?([A-Za-z0-9_]+|>)?
        tag_match = re.match(r'<\s*(\/)?\s*([A-Za-z0-9_.-]+|>)?', code[i:])
        if tag_match and (tag_match.group(2) or tag_match.group(1)):
            is_closing = tag_match.group(1) == '/'
            tag_name = tag_match.group(2) or ''
            if tag_name == '>': # fragment <>
                tag_name = '<>'
                is_closing = False
                end_tag = i + tag_match.end()
                is_self_closing = False
            elif is_closing and (not tag_match.group(2) or tag_match.group(2) == '>'): # </>
                tag_name = '<>'
                end_tag = i + tag_match.end()
                is_self_closing = False
            else:
                # find closing '>' for this opening/closing tag, taking into account strings inside attributes
                j = i + tag_match.end()
                in_quote = None
                in_brace = 0
                while j < n:
                    if code[j] == '\n':
                        pass
                    if in_quote:
                        if code[j] == in_quote and code[j-1] != '\\':
                            in_quote = None
                    elif in_brace > 0:
                        if code[j] == '{':
                            in_brace += 1
                        elif code[j] == '}':
                            in_brace -= 1
                        elif code[j] in ('"', "'", '`'):
                            in_quote = code[j]
                    else:
                        if code[j] in ('"', "'", '`'):
                            in_quote = code[j]
                        elif code[j] == '{':
                            in_brace += 1
                        elif code[j] == '>':
                            break
                    j += 1
                end_tag = j + 1
                tag_str = code[i:end_tag]
                line += tag_str.count('\n')
                is_self_closing = tag_str.rstrip()[-2:] == '/>'
                
            void_tags = {'input', 'img', 'br', 'hr'}
            if tag_name.lower() not in void_tags and not is_self_closing:
                if is_closing:
                    if not stack:
                        print(f"Line ~{line}: Extra closing tag </{tag_name}>")
                    else:
                        top_tag, top_line = stack.pop()
                        if top_tag != tag_name:
                            print(f"Line ~{line}: Tag mismatch: expected </{top_tag}> (from line ~{top_line}), got </{tag_name}>")
                else:
                    stack.append((tag_name, line))
            i = end_tag
            continue

    i += 1

print("Remaining open tags:")
for t, l in stack:
    print(f"  <{t}> from line ~{l}")
