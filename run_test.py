import re
with open('setting.html', 'r', encoding='utf-8') as f: html = f.read()
js = re.findall(r'<script>([\s\S]*?)</script>', html)[-1]
test_code = f"""
const jsdom = require('jsdom');
const {{ JSDOM }} = jsdom;
const dom = new JSDOM('<html><body><div id="elements-list"></div><div id="print-preview-area"></div><select id="template-selector"></select><button id="btn-add-template"></button></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.alert = console.log;

window.fbDb = true;
window.getAppRef = (path) => path;
window.fbOnValue = (ref, cb) => {{
    if (ref.includes('settings/templates_meta')) {{ cb({{ val: () => ({{}}) }}); return; }}
    if (ref.includes('settings/templates')) {{
        cb({{ val: () => ({{ _elements: [{{ id: 'test', label: 'Test Label', mapping: 'name' }}] }}) }});
        return;
    }}
    if (ref.includes('participant_columns')) {{
        cb({{ val: () => ({{ 0: {{id: 'name', label: 'Nama'}}, 1: {{id: 'asal', label: 'Asal'}} }}) }});
        return;
    }}
}};

try {{
    {js}
    console.log('Eval success');
    console.log('List HTML length:', document.getElementById('elements-list').innerHTML.length);
}} catch(e) {{
    console.error('CRASH:', e.stack);
}}
"""
with open('test_exec.js', 'w', encoding='utf-8') as f: f.write(test_code)
