// GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT ANDA YANG BARU
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzhm3cCxAT1AqP6ICxZ_6CV7XPlOciE82t1gqblM7ZRlfGOCM8Hb4O1IC2Hv8mSiJ8N/exec';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('attendanceForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');
    const statusMessage = document.getElementById('statusMessage');
    const btnRefresh = document.getElementById('btnRefresh');
    
    fetchAttendanceData();

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
    const tableBody = document.getElementById('tableBody');
    try {
        const response = await fetch(`${SCRIPT_URL}?action=get&_t=${new Date().getTime()}`);
        const result = await response.json();
        
        if (result.status === 'success' && result.data && result.data.length > 0) {
            tableBody.innerHTML = ''; 
            
            result.data.reverse().forEach(row => {
                const tr = document.createElement('tr');
                
                let waktuFormat = '-';
                if (row.timestamp) {
                    const t = new Date(row.timestamp);
                    if (!isNaN(t)) {
                        waktuFormat = t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    }
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
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Belum ada data absensi hari ini.</td></tr>';
        }
    } catch (error) {
        console.error('Gagal memuat data tabel:', error);
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="color: var(--paskibra-red);">Gagal menyinkronkan data riwayat.</td></tr>';
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
            } else {
                alert('Gagal menghapus: ' + result.message);
            }
        })
        .catch(error => {
            console.error('Error Hapus:', error);
            alert('Gagal terhubung ke server.');
        });
    }
}

function showStatus(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('hidden');
}
