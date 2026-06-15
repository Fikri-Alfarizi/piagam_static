const fs = require('fs');
const html = fs.readFileSync('setting.html', 'utf-8');
const match = html.match(/<script>([\s\S]*?)<\/script>/g);
const jsCode = match[match.length - 1].replace(/<script>|<\/script>/g, '');

const mockDom = `
const document = {
    getElementById: (id) => ({
        innerHTML: '', appendChild: () => {}, querySelectorAll: () => [],
        addEventListener: () => {}, value: '', style: {}
    }),
    createElement: () => ({ innerHTML: '', appendChild: () => {}, querySelectorAll: () => [], setAttribute: () => {}, style: {}, classList: {add:()=>{}, remove:()=> {}} }),
    head: { appendChild: () => {} },
    addEventListener: () => {},
    querySelectorAll: () => [],
    querySelector: () => ({clientWidth: 800})
};
const window = {
    location: { pathname: '' }, getAppRef: (path) => path, fbDb: true,
    addEventListener: () => {}, getComputedStyle: () => ({left: '0px', top: '0px'})
};
const alert = console.log;
const prompt = () => 'test';
let fbCallbacks = [];
window.fbOnValue = (ref, cb) => { fbCallbacks.push({ref, cb}); };
`;

let codeToRun = mockDom + jsCode + `
try {
    fbCallbacks.forEach(item => {
        if(item.ref.includes('templates_meta')) item.cb({ val: () => ({}) });
        if(item.ref.includes('participant_columns')) item.cb({ val: () => ({0: {id:'a', label:'A'}}) });
        if(item.ref.includes('settings/templates')) item.cb({ val: () => ({_elements: {'0': {id:'test', label:'Test'}}}) });
    });
    console.log('SUCCESS');
} catch(e) {
    console.log('CRASH CAUGHT: ', e.stack);
}
`;

fs.writeFileSync('test_setting.js', codeToRun);
