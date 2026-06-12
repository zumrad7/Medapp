// Логика для работы с записями

let allAppointments = [];

async function loadAppointments() {
    try {
        const response = await apiRequest('/api/appointments');
        if (!response) return;
        
        allAppointments = await response.json();
        displayAppointments(allAppointments);
        
    } catch (error) {
        console.error('Error loading appointments:', error);
        showMessage('danger', `Ошибка загрузки записей: ${error.message}`);
    }
}

function displayAppointments(appointments) {
    const container = document.getElementById('appointmentsList');
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-light);">
                <i class="fas fa-calendar-times fa-3x" style="margin-bottom: 20px;"></i>
                <h3>Записей нет</h3>
                <p>У вас пока нет записей на прием</p>
                <a href="/book" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Записаться на прием
                </a>
            </div>
        `;
        return;
    }
    
    // Сортируем по дате (новые сверху)
    const sortedAppointments = [...appointments].sort((a, b) => 
        new Date(b.appointmentDate) - new Date(a.appointmentDate)
    );
    
    container.innerHTML = sortedAppointments.map(appointment => `
        <div class="appointment-card">
            <div class="appointment-header">
                <div>
                    <h3>${appointment.doctorId?.fullName || 'Врач'}</h3>
                    <p class="appointment-specialization">
                        ${appointment.doctorId?.specialization || 'Специалист'}
                    </p>
                </div>
                ${getStatusBadge(appointment.status)}
            </div>
            
            <div class="appointment-body">
                <div class="appointment-details">
                    <div class="detail">
                        <i class="fas fa-calendar"></i>
                        <div>
                            <strong>Дата и время</strong>
                            <p>${formatDate(appointment.appointmentDate)}</p>
                        </div>
                    </div>
                    <div class="detail">
                        <i class="fas fa-clock"></i>
                        <div>
                            <strong>Длительность</strong>
                            <p>${appointment.duration || 30} минут</p>
                        </div>
                    </div>
                    <div class="detail">
                        <i class="fas fa-stethoscope"></i>
                        <div>
                            <strong>Причина визита</strong>
                            <p>${appointment.reason}</p>
                        </div>
                    </div>
                </div>
                
                ${appointment.symptoms && appointment.symptoms.length > 0 ? `
                    <div class="appointment-symptoms">
                        <strong>Симптомы:</strong>
                        ${appointment.symptoms.map(symptom => 
                            `<span class="badge badge-primary">${symptom}</span>`
                        ).join('')}
                    </div>
                ` : ''}
                
                ${appointment.diagnosis ? `
                    <div class="appointment-diagnosis">
                        <strong>Диагноз:</strong>
                        <p>${appointment.diagnosis}</p>
                    </div>
                ` : ''}
                
                ${appointment.prescription ? `
                    <div class="appointment-prescription">
                        <strong>Назначения:</strong>
                        <p>${appointment.prescription}</p>
                    </div>
                ` : ''}
                
                ${appointment.notes ? `
                    <div class="appointment-notes">
                        <strong>Заметки врача:</strong>
                        <p>${appointment.notes}</p>
                    </div>
                ` : ''}
            </div>
            
            <div class="appointment-actions">
                ${new Date(appointment.appointmentDate) > new Date() && appointment.status !== 'cancelled' ? `
                    <button class="btn btn-danger" onclick="cancelAppointment('${appointment._id}')">
                        <i class="fas fa-times"></i> Отменить запись
                    </button>
                ` : ''}
                
                <button class="btn btn-outline" onclick="editAppointment('${appointment._id}')">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
            </div>
        </div>
    `).join('');
}

function filterAppointments(filter) {
    let filtered = [...allAppointments];
    const now = new Date();
    
    switch(filter) {
        case 'upcoming':
            filtered = filtered.filter(a => 
                new Date(a.appointmentDate) > now && a.status !== 'cancelled'
            );
            break;
        case 'past':
            filtered = filtered.filter(a => 
                new Date(a.appointmentDate) < now && a.status !== 'cancelled'
            );
            break;
        case 'cancelled':
            filtered = filtered.filter(a => a.status === 'cancelled');
            break;
        // 'all' - все записи
    }
    
    displayAppointments(filtered);
    
    // Обновляем активные кнопки
    document.querySelectorAll('.appointments-filter .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

async function cancelAppointment(appointmentId) {
    if (!confirm('Вы уверены, что хотите отменить эту запись?')) {
        return;
    }
    
    try {
        const response = await apiRequest(`/api/appointments/${appointmentId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'cancelled' })
        });
        
        if (response && response.ok) {
            showMessage('success', 'Запись отменена');
            loadAppointments();
        } else {
            const error = await response.json();
            showMessage('danger', error.message || 'Ошибка при отмене записи');
        }
    } catch (error) {
        console.error('Cancel appointment error:', error);
        showMessage('danger', `Ошибка сети: ${error.message}`);
    }
}

function editAppointment(appointmentId) {
    const appointment = allAppointments.find(a => a._id === appointmentId);
    if (!appointment) return;
    
    const modalContent = `
        <form id="editAppointmentForm">
            <div class="form-group">
                <label>Дата и время</label>
                <input type="datetime-local" class="form-control" 
                       value="${appointment.appointmentDate.split('.')[0]}" 
                       id="editAppointmentDate" required>
            </div>
            
            <div class="form-group">
                <label>Причина визита</label>
                <textarea class="form-control" id="editReason" rows="3" required>${appointment.reason}</textarea>
            </div>
            
            <div class="form-group">
                <label>Симптомы (через запятую)</label>
                <input type="text" class="form-control" id="editSymptoms" 
                       value="${appointment.symptoms?.join(', ') || ''}">
            </div>
            
            <div class="form-group">
                <label>Длительность (минут)</label>
                <input type="number" class="form-control" id="editDuration" 
                       value="${appointment.duration || 30}" min="15" max="120">
            </div>
        </form>
    `;
    
    showModal('Редактирование записи', modalContent, [
        {
            text: '<i class="fas fa-save"></i> Сохранить',
            class: 'btn-primary',
            onclick: `saveAppointmentChanges('${appointmentId}')`
        }
    ]);
}

async function saveAppointmentChanges(appointmentId) {
    const formData = {
        appointmentDate: document.getElementById('editAppointmentDate').value,
        reason: document.getElementById('editReason').value,
        symptoms: document.getElementById('editSymptoms').value.split(',').map(s => s.trim()),
        duration: parseInt(document.getElementById('editDuration').value)
    };
    
    try {
        const response = await apiRequest(`/api/appointments/${appointmentId}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        if (response && response.ok) {
            showMessage('success', 'Запись обновлена');
            loadAppointments();
            document.querySelector('.modal-close').click();
        } else {
            const error = await response.json();
            console.error('Save appointment response error:', error);
            showMessage('danger', error.message || `Ошибка при обновлении записи`);
        }
    } catch (error) {
        console.error('Save appointment error:', error);
        showMessage('danger', `Ошибка при обновлении записи: ${error.message}`);
    }
}

// Добавляем стили для записей
const style = document.createElement('style');
style.textContent = `
    .appointment-card {
        background: white;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow);
        margin-bottom: 20px;
        overflow: hidden;
    }
    
    .appointment-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        background-color: var(--background-light);
        border-bottom: 1px solid var(--border-color);
    }
    
    .appointment-header h3 {
        margin: 0;
    }
    
    .appointment-specialization {
        color: var(--primary-color);
        font-weight: 500;
        margin: 5px 0 0 0;
    }
    
    .appointment-body {
        padding: 20px;
    }
    
    .appointment-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
    }
    
    .detail {
        display: flex;
        gap: 10px;
        align-items: flex-start;
    }
    
    .detail i {
        color: var(--primary-color);
        font-size: 1.2rem;
        margin-top: 3px;
    }
    
    .appointment-symptoms,
    .appointment-diagnosis,
    .appointment-prescription,
    .appointment-notes {
        margin: 15px 0;
        padding: 15px;
        background-color: var(--background-light);
        border-radius: var(--radius);
    }
    
    .appointment-symptoms .badge {
        margin-right: 5px;
        margin-bottom: 5px;
    }
    
    .appointment-actions {
        padding: 20px;
        border-top: 1px solid var(--border-color);
        display: flex;
        gap: 10px;
    }
`;
document.head.appendChild(style);