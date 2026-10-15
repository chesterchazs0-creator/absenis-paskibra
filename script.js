// GANTI DENGAN URL WEB APP ABSENSI ANDA YANG BERAKHIRAN /exec
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzhm3cCxAT1AqP6ICxZ_6CV7XPlOciE82t1gqblM7ZRlfGOCM8Hb4O1IC2Hv8mSiJ8N/exec';

let localAttendanceData = [];

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('attendanceForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    const statusMessage = document.getElementById('statusMessage');
    const btnRefresh = document.getElementById('btnRefresh');
    const searchInput = document.getElementById('searchName');
    
    const today = new Date().toISOString().split('T');
    const dateInput = document.getElementById('tanggal');
    if (dateInput) dateInput.value = today;

    fetchAttendanceData();

    // BARU: Fungsi Penyaringan Kotak Pencarian Nama Anggota
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase();
        const filteredData = localAttendanceData.filter(row => 
            (row.nama || '').toLowerCase().includes(keyword)
        );
        renderTableRows(filteredData);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        btnSubmit.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        statusMessage.classList.add('hidden');

        const payloadData = {
            action: 'add',
            tanggal: document.getElementById('tanggal').value,
            nama: document.getElementById('nama').value,
            kelas: document.getElementById('kelas').value,
            status: document.getElementById('status').value,
            keterangan: document.getElementById('keterangan').value || "-"
        };

        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payloadData)
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                showStatus('Presensi berhasil dikirim ke Google Sheets!', 'success');
                form.reset(); 
                if (dateInput) dateInput.value = today;
                fetchAttendanceData(); 
            } else {
                showStatus('Gagal: ' + result.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error Kirim:', error);
            showStatus('Terjadi kesalahan koneksi internet atau sistem.', 'error');
        })
        .finally(() => {
            btnSubmit.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        });
    });

    btnRefresh.addEventListener('click', () => {
        btnRefresh.classList.add('rotating');
        fetchAttendanceData().finally(() => {
            setTimeout(() => { btnRefresh.classList.remove('rotating'); }, 400);
        });
    });
});

async function fetchAttendanceData() {
    const tableBody = document.getElementById('tableBody');
    try {
        const response = await fetch(`${SCRIPT_URL}?action=get&_t=${new Date().getTime()}`);
        const result = await response.json();
        
        if (result.status === 'success' && result.data) {
            localAttendanceData = result.data;
            // BARU: Menghitung persentase kehadiran dinamis
            calculateStats(result.data);
            renderTableRows([...result.data].reverse());
        }
    } catch (error) {
        console.error('Gagal memuat data:', error);
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="color: var(--paskibra-red);">Gagal menyinkronkan data riwayat.</td></tr>';
    }
}

// BARU: Fungsi Matematika Rumus Persentase Kehadiran
function calculateStats(dataList) {
    const total = dataList.length;
    const pHadir = document.getElementById('percentHadir');
    const pIzin = document.getElementById('percentIzin');
    const pSakit = document.getElementById('percentSakit');

    if (total === 0) {
        if(pHadir) pHadir.textContent = '0%';
        if(pIzin) pIzin.textContent = '0%';
        if(pSakit) pSakit.textContent = '0%';
        return;
    }

    let hadir = 0, izin = 0, sakit = 0;
    dataList.forEach(row => {
        const st = (row.status || '').toLowerCase();
        if (st === 'hadir') hadir++;
        else if (st === 'izin') izin++;
        else if (st === 'sakit') sakit++;
    });

    if(pHadir) pHadir.textContent = Math.round((hadir / total) * 100) + '%';
    if(pIzin) pIzin.textContent = Math.round((izin / total) * 100) + '%';
    if(pSakit) pSakit.textContent = Math.round((sakit / total) * 100) + '%';

    const cHadir = document.getElementById('countHadir');
    const cIzin = document.getElementById('countIzin');
    const cSakit = document.getElementById('countSakit');

    if(cHadir) cHadir.textContent = `${hadir} Anggota`;
    if(cIzin) cIzin.textContent = `${izin} Anggota`;
    if(cSakit) cSakit.textContent = `${sakit} Anggota`;
}

function renderTableRows(dataToRender) {
    const tableBody = document.getElementById('tableBody');
    if (dataToRender.length > 0) {
        tableBody.innerHTML = '';
        dataToRender.forEach(row => {
            const tr = document.createElement('tr');
            
            let tanggalFormat = '-';
            if (row.tanggal) {
                const t = new Date(row.tanggal);
                if (!isNaN(t)) {
                    tanggalFormat = t.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                }
            }

            const namaAnggota = row.nama || '-';
            const kelasAnggota = row.kelas || '-';
            const statusKehadiran = row.status || 'Hadir';

            tr.innerHTML = `
                <td>
                    <span style="font-weight:700;">${namaAnggota}</span>
                    <br><small style="color:var(--text-gray); font-size:11px;">${row.keterangan || '-'} • Kelas ${kelasAnggota}</small>
                </td>
                <td style="text-align: center; vertical-align: middle;">
                    <span class="badge ${statusKehadiran.toLowerCase()}">${statusKehadiran}</span><br>
                    <small style="color:var(--text-gray); font-size:10px;">${tanggalFormat}</small>
                </td>
                <td style="text-align: center; vertical-align: middle;">
                    <button type="button" class="btn-delete-row" onclick="deleteAttendance('${namaAnggota.replace(/'/g, "\\'")}')" title="Hapus Data">
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
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Data nama anggota tidak ditemukan.</td></tr>';
    }
}

function deleteAttendance(nama) {
    if (confirm(`Apakah Anda yakin ingin menghapus data absensi atas nama "${nama}"?`)) {
        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'delete', nama: nama })
        })
        .then(() => fetchAttendanceData());
    }
}

function showStatus(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    if(statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.classList.remove('hidden');
    }
}
