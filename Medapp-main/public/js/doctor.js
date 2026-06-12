// Логика для работы с врачами

let allDoctors = [];

async function loadDoctors() {
    try {
        const response = await fetch('/api/doctors');
        if (!response.ok) {
            showMessage('danger', 'Ошибка загрузки врачей');
            return;
        }
        
        allDoctors = await response.json();
        displayDoctors(allDoctors);
        
    } catch (error) {
        console.error('Error loading doctors:', error);
        showMessage('danger', 'Ошибка сети');
    }
}

function displayDoctors(doctors) {
    const container = document.getElementById('doctorsList');
    
    if (!doctors || doctors.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-light);">
                <i class="fas fa-user-md fa-3x" style="margin-bottom: 20px;"></i>
                <p>Врачи не найдены</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = doctors.map(doctor => `
        <div class="doctor-card">
            <div class="doctor-image">
                <i class="fas fa-user-md"></i>
            </div>
            <div class="doctor-info">
                <h3>${doctor.fullName}</h3>
                <p class="specialization">${doctor.specialization || 'Врач'}</p>
                <p class="doctor-details">
                    <i class="fas fa-graduation-cap"></i> Высшее медицинское образование
                </p>
                <p class="doctor-details">
                    <i class="fas fa-award"></i> Опыт работы: 10+ лет
                </p>
                <p class="doctor-details">
                    <i class="fas fa-star"></i> Рейтинг: 4.8/5
                </p>
                <div class="doctor-actions">
                    <a href="/book?doctor=${doctor._id}" class="btn btn-primary">
                        <i class="fas fa-calendar-plus"></i> Записаться
                    </a>
                    <button class="btn btn-outline" onclick="viewDoctorDetails('${doctor._id}')">
                        <i class="fas fa-info-circle"></i> Подробнее
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function searchDoctors() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        displayDoctors(allDoctors);
        return;
    }
    
    const filtered = allDoctors.filter(doctor => 
        doctor.fullName.toLowerCase().includes(searchTerm) ||
        (doctor.specialization && doctor.specialization.toLowerCase().includes(searchTerm))
    );
    
    displayDoctors(filtered);
}

function filterBySpecialization(specialization) {
    // Обновляем активную кнопку
    document.querySelectorAll('.specialization-filter .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (specialization === 'all') {
        displayDoctors(allDoctors);
        return;
    }
    
    const filtered = allDoctors.filter(doctor => 
        doctor.specialization === specialization
    );
    
    displayDoctors(filtered);
}

async function viewDoctorDetails(doctorId) {
    try {
        const response = await fetch(`/api/doctors/${doctorId}`);
        if (!response.ok) {
            showMessage('danger', 'Ошибка загрузки информации о враче');
            return;
        }
        
        const doctor = await response.json();
        
        const modalContent = `
            <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                <div style="flex-shrink: 0;">
                    <div style="width: 100px; height: 100px; background: var(--primary-color); 
                          border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-user-md fa-3x" style="color: white;"></i>
                    </div>
                </div>
                <div>
                    <h3 style="margin-top: 0;">${doctor.fullName}</h3>
                    <p><strong>Специализация:</strong> ${doctor.specialization || 'Не указана'}</p>
                    <p><strong>Email:</strong> ${doctor.email}</p>
                    <p><strong>Телефон:</strong> ${formatPhone(doctor.phone)}</p>
                </div>
            </div>
            
            ${doctor.upcomingAppointments && doctor.upcomingAppointments.length > 0 ? `
                <h4>Ближайшие записи:</h4>
                <div style="max-height: 200px; overflow-y: auto;">
                    ${doctor.upcomingAppointments.map(app => `
                        <div style="padding: 10px; border-bottom: 1px solid var(--border-color);">
                            <strong>${app.patientId?.fullName || 'Пациент'}</strong>
                            <div>${formatDate(app.appointmentDate)}</div>
                            <div>${app.reason}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
        
        showModal(doctor.fullName, modalContent, [
            {
                text: '<i class="fas fa-calendar-plus"></i> Записаться',
                class: 'btn-primary',
                onclick: `window.location.href='/book?doctor=${doctorId}'`
            }
        ]);
        
    } catch (error) {
        console.error('Error loading doctor details:', error);
        showMessage('danger', 'Ошибка загрузки информации');
    }
}

// Добавляем стили для врачей
const style = document.createElement('style');
style.textContent = `
    .doctors-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
    }
    
    .doctor-card {
        background: white;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow);
        overflow: hidden;
        transition: transform 0.3s ease;
    }
    
    .doctor-card:hover {
        transform: translateY(-5px);
        box-shadow: var(--shadow-lg);
    }
    
    .doctor-image {
        height: 150px;
        background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .doctor-image i {
        font-size: 4rem;
        color: white;
    }
    
    .doctor-info {
        padding: 20px;
    }
    
    .doctor-info h3 {
        margin: 0 0 5px 0;
    }
    
    .specialization {
        color: var(--primary-color);
        font-weight: 600;
        margin: 0 0 15px 0;
    }
    
    .doctor-details {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 8px 0;
        color: var(--text-light);
        font-size: 0.9rem;
    }
    
    .doctor-details i {
        width: 20px;
        text-align: center;
    }
    
    .doctor-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
    }
    
    .doctor-actions .btn {
        flex: 1;
    }
`;
document.head.appendChild(style);