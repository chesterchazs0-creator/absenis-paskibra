const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzhm3cCxAT1AqP6ICxZ_6CV7XPlOciE82t1gqblM7ZRlfGOCM8Hb4O1IC2Hv8mSiJ8N/exec';

// Variabel global untuk menyimpan data sementara agar bisa difilter saat dicari
let localAttendanceData = [];

document.addEventListener('DOMContentLoaded', () => {
    // Tambahkan potongan kode ini di dalam DOMContentLoaded script.js Anda:
const btnResetTable = document.getElementById('btnResetTable');

btnResetTable.addEventListener('click', () => {
    if (confirm('Apakah Anda ingin mereset tampilan layar dan memulai sesi absensi baru? (Data di Google Sheets tetap tersimpan aman)')) {
        // 1. Kosongkan data array lokal di browser
        localAttendanceData = [];
        
        // 2. Bersihkan tampilan baris tabel
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sesi baru dimulai. Belum ada data absensi.</td></tr>';
        
        // 3. Kembalikan angka dasbor persentase ke 0%
        document.getElementById('percentHadir').textContent = '0%';
        document.getElementById('percentIzin').textContent = '0%';
        document.getElementById('percentSakit').textContent = '0%';
        document.getElementById('countHadir').textContent = '0 Anggota';
        document.getElementById('countIzin').textContent = '0 Anggota';
        document.getElementById('countSakit').textContent = '0 Anggota';
        
        // 4. Reset input pencarian jika sedang mengetik
        document.getElementById('searchName').value = '';
    }
});

    const form = document.getElementById('attendanceForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    const statusMessage = document.getElementById('statusMessage');
    const btnRefresh = document.getElementById('btnRefresh');
    const searchInput = document.getElementById('searchName');
    
    fetchAttendanceData();

    // Fungsi Input Pencarian Nama (Filter Real-Time)
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

        const formData = new FormData(form);
        const data = {
            action: 'add',
            nama: formData.get('nama'),
            kelas: formData.get('kelas'),
            status: formData.get('status'),
            keterangan: formData.get('keterangan')
        };

        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                showStatus('Presensi berhasil dikirim!', 'success');
                form.reset(); 
                fetchAttendanceData();
            } else {
                showStatus('Gagal: ' + result.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error Kirim:', error);
            showStatus('Terjadi kesalahan koneksi internet.', 'error');
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
    try {
        const response = await fetch(`${SCRIPT_URL}?action=get&_t=${new Date().getTime()}`);
        const result = await response.json();
        
        if (result.status === 'success' && result.data) {
            localAttendanceData = result.data;
            // Hitung kalkulasi statistik persentase kehadiran dinamis
            calculateStats(result.data);
            // Susun dan tampilkan data ke dalam baris tabel
            renderTableRows([...result.data].reverse());
        }
    } catch (error) {
        console.error('Gagal memuat data:', error);
        document.getElementById('tableBody').innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="color: var(--paskibra-red);">Gagal sinkron data.</td></tr>';
    }
}

// Fungsi Hitung Matematika Persentase Kehadiran Dinamis
function calculateStats(dataList) {
    const total = dataList.length;
    if (total === 0) return;

    let hadir = 0, izin = 0, sakit = 0;
    dataList.forEach(row => {
        const st = (row.status || '').toLowerCase();
        if (st === 'hadir') hadir++;
        else if (st === 'izin') izin++;
        else if (st === 'sakit') sakit++;
    });

    // Kalkulasi matematika rumus persentase
    document.getElementById('percentHadir').textContent = Math.round((hadir / total) * 100) + '%';
    document.getElementById('percentIzin').textContent = Math.round((izin / total) * 100) + '%';
    document.getElementById('percentSakit').textContent = Math.round((sakit / total) * 100) + '%';

    document.getElementById('countHadir').textContent = `${hadir} Anggota`;
    document.getElementById('countIzin').textContent = `${izin} Anggota`;
    document.getElementById('countSakit').textContent = `${sakit} Anggota`;
}

// Fungsi Menggambar Baris Data ke Dalam Tabel HTML
function renderTableRows(dataToRender) {
    const tableBody = document.getElementById('tableBody');
    if (dataToRender.length > 0) {
        tableBody.innerHTML = '';
        dataToRender.forEach(row => {
            const tr = document.createElement('tr');
            let waktuFormat = '-';
            if (row.timestamp) {
                const t = new Date(row.timestamp);
                if (!isNaN(t)) waktuFormat = t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            }

            const namaAnggota = row.nama || '-';
            const kelasAnggota = row.kelas || '-';
            const statusKehadiran = row.status || 'Hadir';

            tr.innerHTML = `
                <td>${waktuFormat}</td>
                <td><strong>${namaAnggota}</strong></td>
                <td>${kelasAnggota}</td>
                <td><span class="badge ${statusKehadiran.toLowerCase()}">${statusKehadiran}</span></td>
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
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Data nama anggota tidak ditemukan.</td></tr>';
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
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                alert('Data absensi berhasil dihapus!');
                fetchAttendanceData();
            }
        });
    }
}

function showStatus(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('hidden');
}
