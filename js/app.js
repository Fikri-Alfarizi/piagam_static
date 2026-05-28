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

// 1. Wait for Firebase to load
const qList = document.getElementById('live-queue-list');
const searchInput = document.getElementById('participant_name');
const list = document.getElementById('autocomplete-list');
const form = document.getElementById('fast-input-form');
let activeIndex = -1;
let participants = [];
let queues = [];

const checkFbApp = setInterval(() => {
    if(window.fbDb) {
        clearInterval(checkFbApp);
        
        // 1. Live Queue Observer
        if(qList) {
            const qQuery = window.fbQuery(window.fbRef(window.fbDb, 'queue'), window.fbOrderByChild('status'), window.fbEqualTo('pending'));
            window.fbOnValue(qQuery, (snapshot) => {
                const data = snapshot.val();
                let count = 0;
                let html = '';
                if(data) {
                    const items = Object.keys(data).map(k => ({id: k, ...data[k]}));
                    items.sort((a,b) => b.timestamp - a.timestamp);
                    count = items.length;
                    const latest10 = items.slice(0, 10);
                    html = latest10.map(q => `<li style="padding:10px; border-bottom:1px solid #eee;"><b>${escapeHTML(q.participant_name)}</b> <br><small>${escapeHTML(q.category)}</small></li>`).join('');
                } else {
                    html = '<li style="padding:10px; text-align:center; color:#999;">Antrean kosong</li>';
                }
                qList.innerHTML = html;
                const pc = document.getElementById('pending-count');
                if(pc) pc.innerText = count;
            });
        }

        // 2. Autocomplete Search Load Data
        if(searchInput) {
            window.fbOnValue(window.fbRef(window.fbDb, 'participants'), (snapshot) => {
                const data = snapshot.val();
                participants = data ? Object.keys(data).map(k => ({id: k, ...data[k]})) : [];
            });
            window.fbOnValue(window.fbRef(window.fbDb, 'queue'), (snapshot) => {
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
        if(!val) {
            list.style.display = 'none';
            return;
        }
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
                li.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <span>${escapeHTML(item.name)}</span>
                        <span style="font-size:10px; padding:2px 6px; border-radius:4px; background:${badgeColor}; color:#fff;">${status}</span>
                    </div>
                `;
                li.onclick = () => {
                    searchInput.value = item.name;
                    list.style.display = 'none';
                    
                    const inputNomor = document.getElementById('nomor');
                    if(inputNomor) inputNomor.value = item.nomor || '';
                    
                    const inputSekolah = document.getElementById('asal_sekolah');
                    if(inputSekolah) inputSekolah.value = item.asal_sekolah || '';
                    
                    document.getElementById('category').focus();
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
        if (e.key === 'ArrowDown') {
            activeIndex++;
            if(activeIndex >= items.length) activeIndex = 0;
            setActive(items);
        } else if (e.key === 'ArrowUp') {
            activeIndex--;
            if(activeIndex < 0) activeIndex = items.length - 1;
            setActive(items);
        } else if (e.key === 'Enter') {
            if(activeIndex > -1) {
                e.preventDefault();
                items[activeIndex].click();
            }
        }
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

async function submitQueue() {
    if(!searchInput.value) return;
    const name = searchInput.value.trim();
    const cat = document.getElementById('category').value.trim();
    const nomor = document.getElementById('nomor') ? document.getElementById('nomor').value.trim() : '';
    
    const qRef = window.fbRef(window.fbDb, 'queue');
    const snapshot = await window.fbGet(qRef);
    const data = snapshot.val() || {};
    const exists = Object.values(data).some(q => q.participant_name === name && q.category === cat && q.status === 'pending');
    
    if(exists) {
        alert('Peserta dengan juara ini sudah ada di antrean.');
        return;
    }
    
    const isGov = document.getElementById('is_gov') ? document.getElementById('is_gov').checked : false;
    
    const pMatched = participants ? participants.find(p => p.name.toLowerCase() === name.toLowerCase()) : null;
    const inputSekolah = document.getElementById('asal_sekolah');
    const asalSekolah = inputSekolah && isGov ? inputSekolah.value.trim() : (pMatched ? (pMatched.asal_sekolah || '') : '');
    
    await window.fbPush(qRef, {
        participant_name: name,
        category: cat,
        nomor: nomor,
        asal_sekolah: asalSekolah,
        is_gov: isGov,
        status: 'pending',
        timestamp: Date.now()
    });
    
    showToast('Berhasil masuk antrean!');
    form.reset();
    searchInput.focus();
}

// Hotkeys
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && form) {
        form.reset();
        searchInput.focus();
        if (list) list.style.display = 'none';
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.open('batch.html', '_blank');
    }
});
