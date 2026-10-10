const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby4CPW_3-VGaB6vRfGMN7gLoWGnFJxo9UeY9ou_CEnFnHCBKx4kT0408hTTNLv9IW3y/exec';
let localCashData = [];

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cashForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    const btnRefresh = document.getElementById('btnRefresh');
    const searchInput = document.getElementById('searchName');
    
    fetchCashData();

    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase();
        const filtered = localCashData.filter(row => 
            (row.nama || '').toLowerCase().includes(keyword) || 
            (row.keterangan || '').toLowerCase().includes(keyword)
        );
        renderTableRows(filtered);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        btnSubmit.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');

        const payload = {
            action: 'add',
            nama: document.getElementById('nama').value,
            kelas: document.getElementById('kelas').value,
            jenis: document.getElementById('jenis').value,
            jumlah: document.getElementById('jumlah').value,
            keterangan: document.getElementById('keterangan').value
        };

        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(result => {
            if (result.status === 'success') {
                showStatus('Transaksi finansial berhasil dicatat!', 'success');
                form.reset();
                fetchCashData();
            }
        })
        .catch(() => showStatus('Gagal terhubung ke server Google Sheets.', 'error'))
        .finally(() => {
            btnSubmit.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        });
    });

    btnRefresh.addEventListener('click', () => {
        btnRefresh.classList.add('rotating');
        fetchCashData().finally(() => setTimeout(() => btnRefresh.classList.remove('rotating'), 500));
    });
});

async function fetchCashData() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=get&_t=${new Date().getTime()}`);
        const result = await response.json();
        if (result.status === 'success' && result.data) {
            localCashData = result.data;
            calculateFinance(result.data);
            renderTableRows([...result.data].reverse());
        }
    } catch {
        document.getElementById('tableBody').innerHTML = '<tr><td colspan="4" class="text-center-muted" style="color:var(--red-neon);">Gagal sinkron data masuk.</td></tr>';
    }
}

function calculateFinance(dataList) {
    let masuk = 0, keluar = 0;
    dataList.forEach(row => {
        const value = Number(row.jumlah) || 0;
        if ((row.jenis || '').toLowerCase() === 'pemasukan') masuk += value;
        else keluar += value;
    });
    document.getElementById('totalMasuk').textContent = 'Rp ' + masuk.toLocaleString('id-ID');
    document.getElementById('totalKeluar').textContent = 'Rp ' + keluar.toLocaleString('id-ID');
    
    const totalSaldo = masuk - keluar;
    const saldoElement = document.getElementById('totalSaldo');
    saldoElement.textContent = 'Rp ' + totalSaldo.toLocaleString('id-ID');
    saldoElement.style.color = totalSaldo >= 0 ? 'var(--gold-premium)' : 'var(--red-neon)';
}

function renderTableRows(dataToRender) {
    const tableBody = document.getElementById('tableBody');
    if (dataToRender.length > 0) {
        tableBody.innerHTML = '';
        dataToRender.forEach(row => {
            const tr = document.createElement('tr');
            const jml = Number(row.jumlah) || 0;
            const isMasuk = (row.jenis || '').toLowerCase() === 'pemasukan';
            const badgeClass = isMasuk ? 'masuk' : 'keluar';
            const tandaNominal = isMasuk ? '+ Rp ' : '- Rp ';
            const warnaNominal = isMasuk ? 'var(--green-neon)' : 'var(--text-white)';

            tr.innerHTML = `
                <td>
                    <span style="font-weight:700; letter-spacing:0.3px;">${row.nama}</span>
                    <br><small style="color:var(--text-gray); font-size:11px;">${row.keterangan || '-'} • Kelas ${row.kelas || '-'}</small>
                </td>
                <td style="text-align: center; vertical-align: middle;">
                    <span class="badge-premium ${badgeClass}">${row.jenis}</span>
                </td>
                <td style="text-align: right; font-weight: 700; color: ${warnaNominal}; vertical-align: middle;">
                    ${tandaNominal}${jml.toLocaleString('id-ID')}
                </td>
                <td style="text-align: center; vertical-align: middle;">
                    <button type="button" class="btn-delete-row" onclick="deleteCash('${row.nama.replace(/'/g, "\\'")}')" title="Hapus Log">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/>
                            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3h11V2h-11v1Z"/>
                        </svg>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center-muted">Tidak ditemukan riwayat transaksi keuangan.</td></tr>';
    }
}

function deleteCash(nama) {
    if (confirm(`Apakah Anda yakin ingin menghapus catatan jurnal atas nama/detail "${nama}"?`)) {
        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'delete', nama: nama })
        }).then(() => fetchCashData());
    }
}

function showStatus(msg, type) {
    const el = document.getElementById('statusMessage');
    el.textContent = msg; el.className = `status-message ${type}`; el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}
