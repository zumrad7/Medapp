// Логика для панели управления

async function loadDashboard() {
    const user = getUser();
    if (!user) {
        window.location.href = '/login';
        return;
    }
    
    // Приветствие
    document.getElementById('welcomeMessage').textContent = 
        `Добро пожаловать, ${user.fullName}!`;
    
    // Загрузка записей
    await loadAppointments();
    
    // Загрузка врачей
    await loadRecommendedDoctors();
    
    // Загрузка статистики
    await loadStats();
}

async function loadAppointments() {
    try {
        const response = await apiRequest('/api/appointments');
        if (!response) return;
        
        const appointments = await response.json();
        
        // Статистика
        const upcoming = appointments.filter(a => 
            new Date(a.appointmentDate) > new Date() && 
            a.status !== 'cancelled'
        ).length;
        
        const completed = appointments.filter(a => 
            a.status === 'completed'
        ).length;
        
        document.getElementById('upcomingCount').textContent = upcoming;
        document.getElementById('completedCount').textContent = completed;
        
        // Ближайшие записи (следующие 3)
        const upcomingAppointments = appointments
            .filter(a => new Date(a.appointmentDate) > new Date())
            .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
            .slice(0, 3);
        
        const container = document.getElementById('upcomingAppointments');
        if (upcomingAppointments.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-light);">Нет предстоящих записей</p>';
        } else {
            container.innerHTML = upcomingAppointments.map(appointment => `
                <div class="appointment-item" style="padding: 10px; border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${appointment.doctorId?.fullName || 'Врач'}</strong>
                            <div style="font-size: 0.9rem; color: var(--text-light);">
                                ${formatDate(appointment.appointmentDate)}
                            </div>
                        </div>
                        ${getStatusBadge(appointment.status)}
                    </div>
                    <div style="margin-top: 5px; font-size: 0.9rem;">
                        ${appointment.reason}
                    </div>
                </div>
            `).join('');
        }
        
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

async function loadRecommendedDoctors() {
    try {
        const response = await fetch('/api/doctors');
        if (!response.ok) return;
        
        const doctors = await response.json();
        document.getElementById('doctorsCount').textContent = doctors.length;
        
        // Рекомендуем первых 3 врачей
        const recommendedDoctors = doctors.slice(0, 3);
        const container = document.getElementById('recommendedDoctors');
        
        if (recommendedDoctors.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-light);">Нет врачей</p>';
        } else {
            container.innerHTML = recommendedDoctors.map(doctor => `
                <div class="doctor-item" style="padding: 10px; border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 40px; height: 40px; background: var(--primary-color); 
                              border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                            <i class="fas fa-user-md"></i>
                        </div>
                        <div>
                            <strong>${doctor.fullName}</strong>
                            <div style="font-size: 0.9rem; color: var(--text-light);">
                                ${doctor.specialization || 'Специалист'}
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 10px;">
                        <a href="/book?doctor=${doctor._id}" class="btn btn-outline btn-sm">
                            Записаться
                        </a>
                    </div>
                </div>
            `).join('');
        }
        
    } catch (error) {
        console.error('Error loading doctors:', error);
    }
}

async function loadStats() {
    try {
        const response = await fetch('/api/health');
        if (!response.ok) return;
        
        const data = await response.json();
        
        // Уведомления (симулируем)
        const notifications = 1; // Добро пожаловать
        document.getElementById('notificationsCount').textContent = notifications;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Быстрая запись
function quickBook(doctorId) {
    const dateInput = prompt('Введите дату и время приема (формат: ГГГГ-ММ-ДД ЧЧ:ММ):');
    if (!dateInput) return;
    
    const reason = prompt('Причина визита:');
    if (!reason) return;
    
    bookAppointment({
        doctorId,
        appointmentDate: dateInput,
        reason,
        duration: 30
    });
}

async function bookAppointment(data) {
    try {
        const response = await apiRequest('/api/appointments', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response && response.ok) {
            const result = await response.json();
            showMessage('success', 'Запись успешно создана!');
            setTimeout(() => loadDashboard(), 1000);
            return result;
        } else {
            const error = await response.json();
            showMessage('danger', error.message || 'Ошибка при создании записи');
            return null;
        }
    } catch (error) {
        showMessage('danger', 'Ошибка сети');
        return null;
    }
}

// Обновить статус записи
async function updateAppointmentStatus(id, status) {
    try {
        const response = await apiRequest(`/api/appointments/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        
        if (response && response.ok) {
            showMessage('success', 'Статус обновлен');
            loadDashboard();
            return true;
        } else {
            const error = await response.json();
            showMessage('danger', error.message);
            return false;
        }
    } catch (error) {
        showMessage('danger', 'Ошибка сети');
        return false;
    }
}