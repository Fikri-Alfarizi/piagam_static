
const fonts = [
    'Arial', 'Times New Roman', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Inter', 'Noto Sans',
    'Ubuntu', 'Mukta', 'PT Sans', 'Nunito', 'Rubik', 'Work Sans', 'Fira Sans', 'Quicksand',
    'Merriweather', 'Playfair Display', 'Lora', 'PT Serif', 'Noto Serif', 'Libre Baskerville',
    'EB Garamond', 'Cormorant Garamond', 'Crimson Text', 'Bebas Neue', 'Oswald', 'Anton',
    'Pacifico', 'Dancing Script', 'Caveat', 'Satisfy', 'Great Vibes', 'Lobster',
    'Shadows Into Light', 'Cinzel'
];
const googleFonts = fonts.filter(f => f !== 'Arial' && f !== 'Times New Roman').map(f => 'family=' + f.replace(/ /g, '+')).join('&');
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?' + googleFonts + '&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

function fontOptionsHtml() {
    return fonts.map(f => {
        const fb = f === 'Times New Roman' ? 'serif' : 'sans-serif';
        return `<option value="${f}" style="font-family:'${f}',${fb}">${f}</option>`;
    }).join('');
}
function escapeH(s) { return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

let elements = [];
let activeElementId = null;
let currentScale = 1;
const defaultElements = [
    { id: 'name', label: 'Nama Peserta', preview_text: 'Budi Santoso (Contoh)', x: 0, y: 0, size: 24, align: 'center', font: 'Arial', color: '#000000', bold: false },
    { id: 'category', label: 'Juara / Kategori', preview_text: 'Juara 1 Kumite Bebas', x: 0, y: 60, size: 24, align: 'center', font: 'Arial', color: '#000000', bold: false },
];

let participantColumns = [];
window.fbOnValue(window.getAppRef('participant_columns'), (snap) => {
    const data = snap.val();
    if(data) {
        participantColumns = data;
        renderElementsList();
    }
});

function getMappingOptionsHtml() {
    let html = '<option value="">-- Tidak ada (Input Manual) --</option>';
    const cols = Array.isArray(participantColumns) ? participantColumns : Object.values(participantColumns);
    cols.forEach(c => {
        if(!c) return;
        html += `<option value="${c.id}">Kolom: ${escapeH(c.label)}</option>`;
    });
    return html;
}

function renderElementsList() {
    const container = document.getElementById('elements-list');
    container.innerHTML = '';
    elements.forEach(el => {
        const card = document.createElement('div');
        card.className = 'element-card' + (activeElementId === el.id ? ' active' : '');
        card.innerHTML = `
            <div class="element-card-header" onclick="selectElement('${el.id}')" style="flex-direction: column; align-items: stretch; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="el-name" style="font-size: 14px; font-weight: 800; color: #1e293b;">📝 ${escapeH(el.label)}</span>
                    <span class="el-actions">
                        <button onclick="event.stopPropagation(); renameElement('${el.id}')" title="Rename" style="background:#e0e7ff; color:#4338ca; border:none; padding:4px 8px; border-radius:4px;">✏️ Nama</button>
                        <button onclick="event.stopPropagation(); deleteElement('${el.id}')" title="Hapus" style="background:#fee2e2; color:#b91c1c; border:none; padding:4px 8px; border-radius:4px;">🗑️ Hapus</button>
                    </span>
                </div>
                
                <div style="background: #f1f5f9; padding: 8px; border-radius: 6px; display: flex; align-items: center; gap: 8px;" onclick="event.stopPropagation();">
                    <label style="font-size: 11px; font-weight: 700; color: #475569; white-space: nowrap;">🔗 Hubungkan Ke:</label>
                    <select onchange="updateEl('${el.id}','mapping',this.value)" data-set-mapping="${el.mapping || ''}" style="flex:1; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px; font-size: 12px; font-weight: 600; color: #0f172a; cursor: pointer; background: #fff;">
                        ${getMappingOptionsHtml()}
                    </select>
                </div>
            </div>
            <div class="element-card-body">
                <div style="font-size: 11px; color: #64748b; margin-bottom: 12px; font-weight: 600; text-transform: uppercase;">Pengaturan Visual Element:</div>
                <div class="prop-row">
                    <div class="prop-group"><label>Teks Preview</label><input type="text" value="${escapeH(el.preview_text)}" oninput="updateEl('${el.id}','preview_text',this.value)"></div>
                </div>
                <div class="prop-row">
                    <div class="prop-group"><label>X (px)</label><input type="number" value="${el.x}" oninput="updateEl('${el.id}','x',+this.value)"></div>
                    <div class="prop-group"><label>Y (px)</label><input type="number" value="${el.y}" oninput="updateEl('${el.id}','y',+this.value)"></div>
                    <div class="prop-group"><label>Size (px)</label><input type="number" value="${el.size}" oninput="updateEl('${el.id}','size',+this.value)"></div>
                </div>
                <div class="prop-row">
                    <div class="prop-group"><label>Font</label><select onchange="updateEl('${el.id}','font',this.value)" data-set-font="${el.font}">${fontOptionsHtml()}</select></div>
                </div>
                <div class="prop-row">
                    <div class="prop-group"><label>Align</label><select onchange="updateEl('${el.id}','align',this.value)" data-set-align="${el.align}"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
                    <div class="prop-group"><label>Warna</label><input type="color" value="${el.color}" onchange="updateEl('${el.id}','color',this.value)"></div>
                    <div class="prop-group checkbox-group"><input type="checkbox" id="bold_${el.id}" ${el.bold?'checked':''} onchange="updateEl('${el.id}','bold',this.checked)"><label for="bold_${el.id}">Bold</label></div>
                </div>
            </div>
        `;
        container.appendChild(card);
        // Set select values
        card.querySelectorAll('select[data-set-font]').forEach(s => s.value = s.dataset.setFont);
        card.querySelectorAll('select[data-set-align]').forEach(s => s.value = s.dataset.setAlign);
        card.querySelectorAll('select[data-set-mapping]').forEach(s => s.value = s.dataset.setMapping);
    });
}

function renderPreview() {
    const area = document.getElementById('print-preview-area');
    area.querySelectorAll('.draggable').forEach(d => d.remove());
    elements.forEach(el => {
        const div = document.createElement('div');
        div.className = 'draggable' + (activeElementId === el.id ? ' selected' : '');
        div.setAttribute('data-id', el.id);
        div.style.cssText = `left:${el.x}px; top:${el.y}px; font-size:${el.size}px; text-align:${el.align}; font-weight:${el.bold?'bold':'normal'}; color:${el.color}; font-family:'${el.font}',${el.font==='Times New Roman'?'serif':'sans-serif'};`;
        div.textContent = el.preview_text;
        area.appendChild(div);
    });
    attachDragListeners();
}

function selectElement(id) {
    activeElementId = activeElementId === id ? null : id;
    renderElementsList();
    renderPreview();
}
function updateEl(id, prop, val) {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    el[prop] = val;
    renderPreview();
}
function addElement() {
    const name = prompt('Masukkan nama elemen baru (misalnya: nomor, tempat, tanggal):');
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '_' + Date.now();
    elements.push({ id, label: name, preview_text: name, x: 0, y: elements.length * 40, size: 24, align: 'center', font: 'Arial', color: '#000000', bold: false });
    activeElementId = id;
    renderElementsList();
    renderPreview();
}
function renameElement(id) {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    const n = prompt('Nama baru:', el.label);
    if (!n) return;
    el.label = n;
    renderElementsList();
}
function deleteElement(id) {
    if (!confirm('Hapus elemen ini?')) return;
    elements = elements.filter(e => e.id !== id);
    if (activeElementId === id) activeElementId = null;
    renderElementsList();
    renderPreview();
}
document.getElementById('btn-add-element').addEventListener('click', addElement);

// Drag
let isDragging = false, dragEl = null, startX, startY, initLeft, initTop;
function attachDragListeners() {
    document.querySelectorAll('#print-preview-area .draggable').forEach(div => {
        div.addEventListener('mousedown', function(e) {
            isDragging = true;
            dragEl = this;
            dragEl.classList.add('dragging');
            startX = e.clientX; startY = e.clientY;
            initLeft = parseInt(window.getComputedStyle(this).left) || 0;
            initTop = parseInt(window.getComputedStyle(this).top) || 0;
            const elId = this.getAttribute('data-id');
            if (activeElementId !== elId) { activeElementId = elId; renderElementsList(); }
            e.preventDefault();
        });
    });
}
document.addEventListener('mousemove', function(e) {
    if (!isDragging || !dragEl) return;
    const dx = (e.clientX - startX) / currentScale;
    const dy = (e.clientY - startY) / currentScale;
    const newLeft = Math.round(initLeft + dx);
    const newTop = Math.round(initTop + dy);
    dragEl.style.left = newLeft + 'px';
    dragEl.style.top = newTop + 'px';
    const elId = dragEl.getAttribute('data-id');
    const el = elements.find(e => e.id === elId);
    if (el) { el.x = newLeft; el.y = newTop; renderElementsList(); }
});
document.addEventListener('mouseup', function() {
    if (isDragging && dragEl) { dragEl.classList.remove('dragging'); isDragging = false; dragEl = null; }
});

// Scale
function fitPreviewToScreen() {
    const wrapper = document.getElementById('preview-wrapper');
    const preview = document.getElementById('print-preview-area');
    const viewport = document.querySelector('.canvas-viewport');
    const availableWidth = viewport.clientWidth - 32;
    currentScale = Math.min(1, availableWidth / 1123);
    preview.style.transform = `scale(${currentScale})`;
    wrapper.style.width = (1123 * currentScale) + 'px';
    wrapper.style.height = (794 * currentScale) + 'px';
}
fitPreviewToScreen();
window.addEventListener('resize', fitPreviewToScreen);

// Template Management
let currentTemplateId = 'default';
let unsubPrint = null;
let unsubBg = null;

function getSettingsPath() {
    return currentTemplateId === 'default' ? 'settings/print' : `settings/templates/${currentTemplateId}/print`;
}
function getBgPath() {
    return currentTemplateId === 'default' ? 'settings/background' : `settings/templates/${currentTemplateId}/background`;
}

function loadTemplate(templateId) {
    currentTemplateId = templateId;
    // Show/hide delete button
    document.getElementById('btn-del-template').style.display = templateId === 'default' ? 'none' : 'inline-block';
    
    // Unsubscribe old listeners (reload page approach is simpler)
    // We just reload the data
    if (window.fbDb) {
        window.fbOnValue(window.getAppRef(getSettingsPath()), (snapshot) => {
            const data = snapshot.val();
            if (data && data._elements) {
                elements = data._elements.map(e => ({ id: e.id||e.label, label: e.label||e.id, preview_text: e.preview_text||e.label||'', x: parseInt(e.x_pos)||0, y: parseInt(e.y_pos)||0, size: parseInt(e.font_size)||24, align: e.align||'center', font: e.font_family||'Arial', color: e.color||'#000000', bold: e.is_bold?true:false }));
            } else if (data) {
                elements = [];
                Object.keys(data).forEach(key => {
                    if (key.startsWith('_')) return;
                    const d = data[key];
                    elements.push({ id: key, label: key==='name'?'Nama Peserta':(key==='category'?'Juara / Kategori':key), preview_text: key==='name'?'Budi Santoso (Contoh)':(key==='category'?'Juara 1 Kumite Bebas':key), x: parseInt(d.x_pos)||0, y: parseInt(d.y_pos)||0, size: parseInt(d.font_size)||24, align: d.align||'center', font: d.font_family||'Arial', color: d.color||'#000000', bold: d.is_bold?true:false });
                });
            } else {
                elements = JSON.parse(JSON.stringify(defaultElements));
            }
            renderElementsList();
            renderPreview();
        });
        window.fbOnValue(window.getAppRef(getBgPath()), (snapshot) => {
            const bg = snapshot.val();
            const area = document.getElementById('print-preview-area');
            area.style.backgroundImage = bg ? `url('${bg}')` : 'none';
        });
    }
}

// Firebase Init
const checkFb = setInterval(() => {
    if (window.fbDb) {
        clearInterval(checkFb);
        
        // Load templates list
        const tplSelect = document.getElementById('template-selector');
        window.fbOnValue(window.getAppRef('settings/templates_meta'), (snap) => {
            const meta = snap.val() || {};
            let opts = '<option value="default">Piagam Default</option>';
            Object.keys(meta).forEach(k => {
                opts += `<option value="${k}">${meta[k].name}</option>`;
            });
            tplSelect.innerHTML = opts;
            tplSelect.value = currentTemplateId;
        });

        tplSelect.addEventListener('change', (e) => {
            loadTemplate(e.target.value);
        });

        document.getElementById('btn-add-template').addEventListener('click', async () => {
            const name = prompt('Nama template piagam baru:');
            if (!name) return;
            const id = 'tpl_' + Date.now();
            await window.fbSet(window.getAppRef(`settings/templates_meta/${id}`), { name: name, created_at: Date.now() });
            currentTemplateId = id;
            tplSelect.value = id;
            loadTemplate(id);
        });

        document.getElementById('btn-del-template').addEventListener('click', async () => {
            if (currentTemplateId === 'default') return;
            if (!confirm('Hapus template piagam ini beserta semua settingnya?')) return;
            await window.fbRemove(window.getAppRef(`settings/templates_meta/${currentTemplateId}`));
            await window.fbRemove(window.getAppRef(`settings/templates/${currentTemplateId}`));
            currentTemplateId = 'default';
            tplSelect.value = 'default';
            loadTemplate('default');
        });

        // Load default template
        loadTemplate('default');
    }
}, 50);

// Firebase Save
async function saveSettings() {
    const data = {};
    elements.forEach(el => {
        data[el.id] = { x_pos: String(el.x), y_pos: String(el.y), font_size: String(el.size), align: el.align, font_family: el.font, color: el.color, is_bold: el.bold ? 1 : 0, mapping: el.mapping || '' };
    });
    data._elements = elements.map(el => ({ id: el.id, label: el.label, preview_text: el.preview_text, x_pos: String(el.x), y_pos: String(el.y), font_size: String(el.size), align: el.align, font_family: el.font, color: el.color, is_bold: el.bold ? 1 : 0, mapping: el.mapping || '' }));
    await window.fbSet(window.getAppRef(getSettingsPath()), data);
    document.getElementById('save-status').innerText = '✅ Tersimpan ke Firebase!';
    setTimeout(() => document.getElementById('save-status').innerText = '', 2500);
}

// Upload BG
async function uploadBg() {
    const file = document.getElementById('bg-upload').files[0];
    if (!file) return alert('Pilih file gambar dulu');
    const btn = document.getElementById('btn-bg');
    btn.innerHTML = '⏳ Uploading...'; btn.disabled = true;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try { await window.fbSet(window.getAppRef(getBgPath()), e.target.result); alert('Background berhasil diunggah!'); }
        catch(err) { alert('Gagal: Ukuran gambar terlalu besar (Maks ~1MB).'); }
        btn.innerHTML = 'Set Background'; btn.disabled = false;
    };
    reader.readAsDataURL(file);
}
