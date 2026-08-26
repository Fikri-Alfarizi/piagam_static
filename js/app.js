function showToast(msg) {
    const toast = document.getElementById('toast');
    if(!toast) return;
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 2000);
}

function escapeHTML(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

const qList = document.getElementById('live-queue-list');
const searchInput = document.getElementById('participant_name');
const list = document.getElementById('autocomplete-list');
const form = document.getElementById('fast-input-form');
let activeIndex = -1;
let participants = [];
let queues = [];

const checkFbApp = setInterval(() => {
    if(window.fbDb && window.fbUser) {
        clearInterval(checkFbApp);
        if(qList) {
            const qQuery = window.fbQuery(window.getAppRef('queue'), window.fbOrderByChild('status'), window.fbEqualTo('pending'));
            window.fbOnValue(qQuery, (snapshot) => {
                const data = snapshot.val();
                let count = 0, html = '';
                if(data) {
                    const items = Object.keys(data).map(k => ({id: k, ...data[k]}));
                    items.sort((a,b) => b.timestamp - a.timestamp);
                    count = items.length;
                    html = items.slice(0, 10).map(q => `<li style="padding:10px; border-bottom:1px solid #eee;"><b>${escapeHTML(q.participant_name)}</b><br><small>${escapeHTML(q.category)}</small></li>`).join('');
                } else {
                    html = '<li style="padding:10px; text-align:center; color:#999;">Antrean kosong</li>';
                }
                qList.innerHTML = html;
                const pc = document.getElementById('pending-count');
                if(pc) pc.innerText = count;
            });
        }
        if(searchInput) {
            window.fbOnValue(window.getAppRef('participants'), (snapshot) => {
                const data = snapshot.val();
                participants = data ? Object.keys(data).map(k => ({id: k, ...data[k]})) : [];
                const templateSelect = document.getElementById('template_select');
                if (templateSelect && templateSelect.value !== 'default' && typeof loadTemplateFields === 'function') {
                    loadTemplateFields(templateSelect.value);
                } else if (templateSelect && typeof loadTemplateFields === 'function') {
                    loadTemplateFields('default');
                }
            });
            window.fbOnValue(window.getAppRef('queue'), (snapshot) => {
                const data = snapshot.val();
                queues = data ? Object.keys(data).map(k => ({id: k, ...data[k]})) : [];
            });
        }
    }
}, 50);

if(searchInput) {
    const doSearch = (val) => {
        list.innerHTML = '';
        activeIndex = -1;
        if(!val) { list.style.display = 'none'; return; }
        const valLower = val.toLowerCase();
        let matches = participants.filter(p => p.name.toLowerCase().includes(valLower)).slice(0, 10);
        if(matches.length > 0) {
            matches.forEach((item) => {
                const itemQueues = queues.filter(q => q.participant_name === item.name);
                let status = 'Belum Antre';
                if(itemQueues.some(q => q.status === 'pending')) status = 'Di Antrean';
                else if(itemQueues.some(q => q.status === 'printed')) status = 'Sudah Dicetak';
                const li = document.createElement('li');
                let badgeColor = status === 'Di Antrean' ? '#f39c12' : (status === 'Sudah Dicetak' ? '#27ae60' : '#bdc3c7');
                li.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; width:100%;"><span>${escapeHTML(item.name)}</span><span style="font-size:10px; padding:2px 6px; border-radius:4px; background:${badgeColor}; color:#fff;">${status}</span></div>`;
                li.onclick = () => {
                    searchInput.value = item.name;
                    list.style.display = 'none';
                    if(typeof fillDynamicFromParticipant === 'function') fillDynamicFromParticipant(item.name);
                    
                    // Focus on the first dynamic input if available
                    const firstDyn = document.querySelector('#dynamic-inputs input');
                    if(firstDyn) firstDyn.focus();
                };
                list.appendChild(li);
            });
            list.style.display = 'block';
        } else {
            list.style.display = 'none';
        }
    };
    searchInput.addEventListener('input', function() { doSearch(this.value); });
    searchInput.addEventListener('focus', function() { doSearch(this.value); });
    searchInput.addEventListener('click', function() { doSearch(this.value); });
    searchInput.addEventListener('keydown', function(e) {
        let items = list.getElementsByTagName('li');
        if (e.key === 'ArrowDown') { activeIndex++; if(activeIndex >= items.length) activeIndex = 0; setActive(items); }
        else if (e.key === 'ArrowUp') { activeIndex--; if(activeIndex < 0) activeIndex = items.length - 1; setActive(items); }
        else if (e.key === 'Enter') { if(activeIndex > -1) { e.preventDefault(); items[activeIndex].click(); } }
    });
}

function setActive(items) {
    for(let i=0; i<items.length; i++) items[i].classList.remove('active');
    if(items[activeIndex]) items[activeIndex].classList.add('active');
}

document.addEventListener('click', function(e) {
    if(list && e.target !== searchInput) list.style.display = 'none';
});

if(form) {
    form.addEventListener('keypress', function(e) {
        if(e.key === 'Enter') {
            e.preventDefault();
            if(list && list.style.display === 'block' && activeIndex > -1) return;
            submitQueue();
        }
    });
    document.getElementById('btn-submit').addEventListener('click', submitQueue);
}

let currentTemplateElements = [];

async function submitQueue() {
    if(!searchInput.value) return;
    const name = searchInput.value.trim();
    
    // Collect dynamic data
    const dynamicData = {};
    currentTemplateElements.forEach(el => {
        if(el.id === 'name') return; // Handled separately via participant_name
        const input = document.getElementById(`dyn_${el.id}`);
        if(input) {
            const val = input.value.trim();
            dynamicData[el.id] = val;
            if (val && typeof window.learnFromText === 'function') {
                window.learnFromText(val);
            }
        }
    });
    
    const qRef = window.getAppRef('queue');
    const snapshot = await window.fbGet(qRef);
    const data = snapshot.val() || {};
    
    // Basic existence check (name only, or name + template)
    const templateSelect = document.getElementById('template_select');
    const templateId = templateSelect ? templateSelect.value : 'default';
    const exists = Object.values(data).some(q => q.participant_name === name && q.template_id === templateId && q.status === 'pending');
    if(exists) { alert('Peserta ini sudah ada di antrean untuk template tersebut.'); return; }
    
    await window.fbPush(qRef, {
        participant_name: name,
        template_id: templateId,
        dynamic_data: dynamicData,
        status: 'pending',
        timestamp: Date.now()
    });
    
    showToast('Berhasil masuk antrean!');
    
    // Clear only dynamic inputs and search, keep template
    searchInput.value = '';
    currentTemplateElements.forEach(el => {
        if(el.id === 'name') return;
        const input = document.getElementById(`dyn_${el.id}`);
        if(input) input.value = '';
    });
    searchInput.focus();
}

// Hotkeys
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && form) { form.reset(); searchInput.focus(); if (list) list.style.display = 'none'; }
});
document.addEventListener('keydown', (e) => {
    if(e.ctrlKey && e.key === 'p') { e.preventDefault(); window.open('batch.html', '_blank'); }
});

// Tournament Manager + Template List
document.addEventListener('DOMContentLoaded', () => {
    const sidebarBrand = document.querySelector('.sidebar-brand');
    if (!sidebarBrand) return;

    const tContainer = document.createElement('div');
    tContainer.style.cssText = 'padding:10px 20px; background:rgba(0,0,0,0.05); border-bottom:1px solid var(--border);';
    tContainer.innerHTML = `
        <label style="font-size:10px; text-transform:uppercase; font-weight:bold; color:var(--text-muted); display:block; margin-bottom:4px;">Pilih Turnamen</label>
        <select id="tourney-select" style="width:100%; padding:6px; border-radius:4px; margin-bottom:8px; font-size:12px; border:1px solid var(--border);"></select>
        <button id="btn-new-tourney" class="btn btn-secondary btn-sm" style="width:100%; font-size:11px; padding:6px;">+ Turnamen Baru</button>
    `;
    sidebarBrand.insertAdjacentElement('afterend', tContainer);

    const select = document.getElementById('tourney-select');
    const active = localStorage.getItem('active_tournament') || 'default';
    
    const checkFbTourney = setInterval(() => {
        if(window.fbDb && window.fbUser) {
            clearInterval(checkFbTourney);
            window.fbOnValue(window.fbRef(window.fbDb, 'tournaments_meta'), (snap) => {
                const meta = snap.val() || {};
                let opts = '<option value="default">Turnamen Default (Awal)</option>';
                Object.keys(meta).forEach(k => { opts += `<option value="${k}">${escapeHTML(meta[k].name)}</option>`; });
                select.innerHTML = opts;
                select.value = active;
            });
            select.addEventListener('change', (e) => { localStorage.setItem('active_tournament', e.target.value); window.location.reload(); });
            document.getElementById('btn-new-tourney').addEventListener('click', async () => {
                const name = prompt('Masukkan Nama Turnamen Baru:');
                if (!name) return;
                const id = 't_' + Date.now();
                await window.fbSet(window.fbRef(window.fbDb, `tournaments_meta/${id}`), { name: name, created_at: Date.now() });
                localStorage.setItem('active_tournament', id);
                window.location.reload();
            });
            
            // Load template list for Dashboard
            const templateSelect = document.getElementById('template_select');
            if (templateSelect) {
                window.fbOnValue(window.getAppRef('settings/templates_meta'), (snap) => {
                    const meta = snap.val() || {};
                    let opts = '<option value="default">Piagam Default</option>';
                    Object.keys(meta).forEach(k => { opts += `<option value="${k}">${escapeHTML(meta[k].name)}</option>`; });
                    
                    const oldVal = templateSelect.value;
                    templateSelect.innerHTML = opts;
                    if(oldVal && opts.includes(`value="${oldVal}"`)) templateSelect.value = oldVal;
                    
                    // Trigger load settings for current template
                    loadTemplateFields(templateSelect.value);
                });
                
                templateSelect.addEventListener('change', (e) => {
                    loadTemplateFields(e.target.value);
                });
            }
        }
    }, 50);
});

// Load Dynamic Fields Based on Template
function loadTemplateFields(templateId) {
    const dynContainer = document.getElementById('dynamic-inputs');
    if(!dynContainer) return;
    
    // 1. Fetch Background for Mini Preview
    const bPath = templateId === 'default' ? 'settings/background' : `settings/templates/${templateId}/background`;
    window.fbGet(window.getAppRef(bPath)).then(snap => {
        const bgUrl = snap.val();
        const pContainer = document.getElementById('template_preview_container');
        const pImg = document.getElementById('template_preview_img');
        if(pContainer && pImg) {
            if(bgUrl) {
                pImg.src = bgUrl;
                pContainer.style.display = 'block';
            } else {
                pImg.src = '';
                pContainer.style.display = 'none';
            }
        }
    });

    // 2. Fetch Elements
    const sPath = templateId === 'default' ? 'settings/print' : `settings/templates/${templateId}/print`;
    window.fbGet(window.getAppRef(sPath)).then(snap => {
        const data = snap.val();
        let els = [];
        if (data && data._elements) {
            els = data._elements;
        } else if (data) {
            Object.keys(data).forEach(k => {
                if(!k.startsWith('_')) els.push({ id: k, label: k==='name'?'Nama Peserta':(k==='category'?'Juara / Kategori':k) });
            });
        } else {
            // Fallback default if not yet saved to Firebase
            els = [
                { id: 'name', label: 'Nama Peserta' },
                { id: 'category', label: 'Juara / Kategori' }
            ];
        }
        
        currentTemplateElements = els;
        let html = '';
        let autocompleteSetupList = [];

        els.forEach(el => {
            if(el.id === 'name') return; // skip name as it is static at top
            const labelStr = escapeHTML(el.label || el.id);
            const mapCol = el.mapping || el.id;

            html += `
                <div class="form-group autocomplete-container">
                    <label>${labelStr}</label>
                    <input type="text" id="dyn_${el.id}" name="${el.id}" placeholder="Masukkan atau pilih ${labelStr}..." autocomplete="off">
                    <div id="ai_bar_${el.id}" class="ai-suggestion-bar" style="display:none;"></div>
                    <ul id="dyn_list_${el.id}" class="autocomplete-list" style="display:none;"></ul>
                </div>
            `;
            autocompleteSetupList.push({ id: el.id, mapCol: mapCol });
        });
        
        dynContainer.innerHTML = html;

        // Setup Autocomplete & AI Suggestion Handlers
        autocompleteSetupList.forEach(item => {
            const input = document.getElementById(`dyn_${item.id}`);
            const list = document.getElementById(`dyn_list_${item.id}`);
            const barId = `ai_bar_${item.id}`;
            if(!input) return;

            let activeIdx = -1;

            const doDynSearch = (val) => {
                if(list) list.innerHTML = '';
                activeIdx = -1;
                
                // Get fresh unique values from participants for this column
                let uniqueValues = [];
                if (typeof participants !== 'undefined' && participants && participants.length > 0) {
                    uniqueValues = [...new Set(participants.map(p => p[item.mapCol]).filter(v => v !== null && v !== undefined && v !== ''))];
                }

                const valLower = (val || '').toLowerCase();
                let matches = uniqueValues.filter(v => v.toString().toLowerCase().includes(valLower)).slice(0, 20);
                
                if(list && matches.length > 0) {
                    matches.forEach((v) => {
                        const li = document.createElement('li');
                        li.innerHTML = `<span>${escapeHTML(v)}</span>`;
                        li.onclick = (e) => {
                            e.stopPropagation();
                            input.value = v;
                            list.style.display = 'none';
                            updateAiSuggestionBar(`dyn_${item.id}`, barId);
                        };
                        list.appendChild(li);
                    });
                    list.style.display = 'block';
                } else if(list) {
                    list.style.display = 'none';
                }

                // Update AI Suggestion Bar
                updateAiSuggestionBar(`dyn_${item.id}`, barId);
            };

            input.addEventListener('input', function() { doDynSearch(this.value); });
            input.addEventListener('focus', function() { doDynSearch(this.value); });
            input.addEventListener('click', function(e) { e.stopPropagation(); doDynSearch(this.value); });
            input.addEventListener('keydown', function(e) {
                let items = list ? list.getElementsByTagName('li') : [];
                if (e.key === 'ArrowDown' && list && list.style.display === 'block') { 
                    activeIdx++; if(activeIdx >= items.length) activeIdx = 0; 
                    for(let i=0; i<items.length; i++) items[i].classList.remove('active');
                    if(items[activeIdx]) items[activeIdx].classList.add('active');
                }
                else if (e.key === 'ArrowUp' && list && list.style.display === 'block') { 
                    activeIdx--; if(activeIdx < 0) activeIdx = items.length - 1; 
                    for(let i=0; i<items.length; i++) items[i].classList.remove('active');
                    if(items[activeIdx]) items[activeIdx].classList.add('active');
                }
                else if (e.key === 'Tab' && (!list || list.style.display !== 'block')) {
                    // Tab key completes top AI suggestion if available
                    const predictions = predictNextWords(this.value);
                    if (predictions && predictions.length > 0) {
                        e.preventDefault();
                        applyAiSuggestion(`dyn_${item.id}`, barId, predictions[0]);
                    }
                }
                else if (e.key === 'Enter') { 
                    if(activeIdx > -1 && list && list.style.display === 'block') { 
                        e.preventDefault(); 
                        items[activeIdx].click(); 
                    } 
                }
            });

            document.addEventListener('click', function(e) {
                if(e.target !== input) {
                    if (list) list.style.display = 'none';
                    const bar = document.getElementById(barId);
                    if (bar) bar.style.display = 'none';
                }
            });
        });
        
        // Handle auto-fill if participant is already selected or typed
        fillDynamicFromParticipant(searchInput ? searchInput.value : '');
    });
}

function fillDynamicFromParticipant(name) {
    if(!name || !participants) return;
    const valLower = name.toLowerCase();
    const pMatched = participants.find(p => p.name && p.name.toLowerCase() === valLower);
    if(pMatched) {
        currentTemplateElements.forEach(el => {
            if(el.id === 'name') return;
            const input = document.getElementById(`dyn_${el.id}`);
            if(input) {
                // Read from explicit mapping if exists, otherwise fallback to matching el.id
                const mapCol = el.mapping || el.id;
                if(pMatched[mapCol] !== undefined && pMatched[mapCol] !== null) {
                    input.value = pMatched[mapCol];
                } else if (el.id === 'sekolah' && pMatched.asal_sekolah) {
                    // Legacy fallback
                    input.value = pMatched.asal_sekolah;
                } else {
                    input.value = ''; // clear if not found
                }
            }
        });
    }
}

// ==========================================
// AI ADAPTIVE LEARNING & WORD PREDICTION ENGINE
// ==========================================
const DEFAULT_AI_VOCAB = [
    "JUARA 1", "JUARA 2", "JUARA 3", "JUARA HARAPAN 1", "JUARA HARAPAN 2",
    "PRACADET A", "PRACADET B", "CADET A", "CADET B", "JUNIOR", "SENIOR",
    "PUTRA", "PUTRI", "INDIVIDU", "BEREGU", "PEMULA", "PRESTASI",
    "U45", "U51", "U55", "U60", "FEATHER", "BANTAM", "FLY", "HEAVY"
];

let aiDict = {
    words: {},
    bigrams: {}
};

// Initialize AI Dictionary with default vocabulary
DEFAULT_AI_VOCAB.forEach(v => {
    aiDict.words[v] = 5;
});

// Sync AI Dictionary with Firebase in Realtime
const checkFbAi = setInterval(() => {
    if(window.fbDb && window.fbUser) {
        clearInterval(checkFbAi);
        window.fbOnValue(window.fbRef(window.fbDb, 'settings/learned_dictionary'), (snap) => {
            const data = snap.val();
            if (data) {
                if (data.words) aiDict.words = { ...aiDict.words, ...data.words };
                if (data.bigrams) aiDict.bigrams = { ...aiDict.bigrams, ...data.bigrams };
            }
        });
    }
}, 50);

window.learnFromText = async function(text) {
    if (!text || typeof text !== 'string') return;
    const str = text.trim();
    if (!str) return;

    const tokens = str.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return;

    let updated = false;

    // Learn whole phrase if short
    if (tokens.length > 1 && tokens.length <= 4) {
        const phrase = str.toUpperCase();
        aiDict.words[phrase] = (aiDict.words[phrase] || 0) + 2;
        updated = true;
    }

    // Learn individual words & bigrams
    for (let i = 0; i < tokens.length; i++) {
        const w = tokens[i].toUpperCase();
        aiDict.words[w] = (aiDict.words[w] || 0) + 1;

        if (i < tokens.length - 1) {
            const nextW = tokens[i + 1].toUpperCase();
            if (!aiDict.bigrams[w]) aiDict.bigrams[w] = {};
            aiDict.bigrams[w][nextW] = (aiDict.bigrams[w][nextW] || 0) + 1;
        }
        updated = true;
    }

    if (updated && window.fbDb) {
        try {
            await window.fbSet(window.fbRef(window.fbDb, 'settings/learned_dictionary'), aiDict);
        } catch (e) {
            console.warn("AI Learn save failed:", e);
        }
    }
};

window.predictNextWords = function(currentInputVal) {
    const text = (currentInputVal || '').trimStart();
    
    // Case 1: Input is empty -> return top starting words/phrases
    if (!text) {
        return Object.keys(aiDict.words)
            .sort((a, b) => (aiDict.words[b] || 0) - (aiDict.words[a] || 0))
            .slice(0, 5);
    }

    const tokens = text.split(/\s+/);
    const hasTrailingSpace = currentInputVal.endsWith(' ');
    
    if (hasTrailingSpace) {
        // User just finished typing a word
        const lastWord = tokens[tokens.length - 1].toUpperCase();
        
        if (aiDict.bigrams[lastWord]) {
            const nextMap = aiDict.bigrams[lastWord];
            const sortedBigrams = Object.keys(nextMap).sort((a, b) => nextMap[b] - nextMap[a]);
            if (sortedBigrams.length > 0) {
                return sortedBigrams.slice(0, 5);
            }
        }
        
        return Object.keys(aiDict.words)
            .filter(w => w !== lastWord)
            .sort((a, b) => (aiDict.words[b] || 0) - (aiDict.words[a] || 0))
            .slice(0, 5);
    } else {
        // User is currently typing a partial word
        const partial = tokens[tokens.length - 1].toUpperCase();
        return Object.keys(aiDict.words)
            .filter(w => w.startsWith(partial) && w !== partial)
            .sort((a, b) => (aiDict.words[b] || 0) - (aiDict.words[a] || 0))
            .slice(0, 5);
    }
};

window.updateAiSuggestionBar = function(inputId, barId) {
    const input = document.getElementById(inputId);
    const bar = document.getElementById(barId);
    if (!input || !bar) return;

    const predictions = predictNextWords(input.value);
    if (!predictions || predictions.length === 0) {
        bar.style.display = 'none';
        return;
    }

    let chipsHtml = `<span class="ai-suggestion-label">💡 AI:</span>`;
    predictions.forEach(word => {
        chipsHtml += `<span class="ai-chip" onclick="applyAiSuggestion('${inputId}', '${barId}', '${escapeHTML(word)}')">+ ${escapeHTML(word)}</span>`;
    });
    bar.innerHTML = chipsHtml;
    bar.style.display = 'flex';
};

window.applyAiSuggestion = function(inputId, barId, suggestedWord) {
    const input = document.getElementById(inputId);
    if (!input) return;

    let val = input.value;
    const hasTrailingSpace = val.endsWith(' ');
    
    if (!val.trim()) {
        input.value = suggestedWord + ' ';
    } else if (hasTrailingSpace) {
        input.value = val + suggestedWord + ' ';
    } else {
        const lastSpaceIdx = val.lastIndexOf(' ');
        if (lastSpaceIdx === -1) {
            input.value = suggestedWord + ' ';
        } else {
            input.value = val.substring(0, lastSpaceIdx + 1) + suggestedWord + ' ';
        }
    }

    input.focus();
    updateAiSuggestionBar(inputId, barId);
};

