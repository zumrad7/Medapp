// Doctor dashboard frontend

async function loadDoctorDashboard() {
  try {
    const [apptsResp, patientsResp] = await Promise.all([
      apiRequest('/api/doctor/appointments'),
      apiRequest('/api/doctor/patients')
    ]);

    // Handle unauthorized (apiRequest returns null when 401 and redirects to login)
    if (!apptsResp || !patientsResp) {
      showError('Необходимо войти в систему как врач.');
      return;
    }

    if (!apptsResp.ok) {
      const text = await safeParseError(apptsResp);
      showError('Ошибка загрузки записей: ' + text);
      return;
    }
    if (!patientsResp.ok) {
      const text = await safeParseError(patientsResp);
      showError('Ошибка загрузки пациентов: ' + text);
      return;
    }

    const appointments = await apptsResp.json();
    const patients = await patientsResp.json();

    document.getElementById('doctorIntro').textContent = `Добро пожаловать, ${getUser()?.fullName || ''}`;

    renderAppointments(appointments);
    renderPatients(patients);
  } catch (err) {
    console.error('Error loading doctor dashboard:', err);
    showMessage('danger', 'Ошибка загрузки панели врача');
  }
}

function renderAppointments(appointments) {
  const container = document.getElementById('doctorAppointments');
  if (!appointments || appointments.length === 0) {
    container.innerHTML = '<p style="color:var(--text-light)">Нет записей для этого врача.</p>';
    return;
  }

  container.innerHTML = appointments.map(a => `
    <div class="appointment-card" style="margin-bottom:12px;padding:12px;border:1px solid var(--border-color);border-radius:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong>${a.patient ? escapeHtml(a.patient.fullName || a.patient._id) : 'Пациент'}</strong>
          <div style="color:var(--text-light);font-size:0.9rem;">${a.patient ? (a.patient.email || '') : ''} ${a.patient && a.patient.phone ? '· ' + a.patient.phone : ''}</div>
        </div>
        <div style="text-align:right">
          <div>${new Date(a.appointmentDate).toLocaleString()}</div>
          <div style="color:var(--text-light)">${a.status}</div>
        </div>
      </div>
      <div style="margin-top:8px;color:var(--text-light)">${escapeHtml(a.reason || '')}</div>
    </div>
  `).join('');
}

function renderPatients(patients) {
  const container = document.getElementById('doctorPatients');
  if (!patients || patients.length === 0) {
    container.innerHTML = '<p style="color:var(--text-light)">Нет пациентов, записанных к этому доктору.</p>';
    return;
  }

  container.innerHTML = `<ul style="margin:0;padding-left:18px">${patients.map(p => `<li style="margin-bottom:6px"><strong>${escapeHtml(p.fullName)}</strong> — ${escapeHtml(p.email)} ${p.phone ? '· ' + escapeHtml(p.phone) : ''}</li>`).join('')}</ul>`;
}

// Ensure the user is doctor
(function init() {
  const user = getUser();
  if (!user) {
    // Not logged in — show message
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('errorMessage').textContent = 'Необходимо войти в систему как врач.';
    return;
  }
  if (user.role !== 'doctor') {
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('errorMessage').textContent = 'Доступ запрещен: только для врачей';
    return;
  }

  loadDoctorDashboard();
})();

// Helpers
function showError(msg) {
  const el = document.getElementById('errorMessage');
  el.style.display = 'block';
  el.textContent = msg;
}

async function safeParseError(resp) {
  try {
    const j = await resp.json();
    return j.message || JSON.stringify(j);
  } catch (e) {
    try { return await resp.text(); } catch (e) { return resp.statusText || 'Error'; }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s]);
}
