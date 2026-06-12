// Глобальные переменные
let currentUser = null;
let token = localStorage.getItem('token');

// Проверка авторизации при загрузке
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // Добавляем обработчики для динамических элементов
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="logout"]')) {
            logout();
        }
        if (e.target.matches('[data-action="book-doctor"]')) {
            const doctorId = e.target.dataset.doctorId;
            const doctorName = e.target.dataset.doctorName;
            openBookingModal(doctorId, doctorName);
        }
    });
});

// ==================== АУТЕНТИФИКАЦИЯ ====================

async function checkAuth() {
    if (token) {
        try {
            const response = await fetch('/api/users/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                currentUser = userData;
                updateAuthUI(true, userData.name || userData.fullName);
            } else {
                logout();
            }
        } catch (error) {
            console.error('Ошибка проверки авторизации:', error);
            logout();
        }
    }
}

function updateAuthUI(isLoggedIn, userName = '') {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const authSection = document.getElementById('authSection');
    const userSection = document.getElementById('userSection');
    const userNameSpan = document.getElementById('userName');
    
    if (isLoggedIn) {
        if (authSection) authSection.classList.add('hidden');
        if (userSection) userSection.classList.remove('hidden');
        if (userNameSpan) userNameSpan.textContent = userName;
    } else {
        if (authSection) authSection.classList.remove('hidden');
        if (userSection) userSection.classList.add('hidden');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    token = null;
    currentUser = null;
    updateAuthUI(false);
    window.location.href = '/';
    showMessage('Вы вышли из системы', 'success');
}

// ==================== СООБЩЕНИЯ ====================

function showMessage(text, type = 'info') {
    // Создаем элемент сообщения
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type}`;
    messageDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <p>${text}</p>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background:none; border:none; cursor:pointer; font-size:1.25rem; color:inherit">
                ×
            </button>
        </div>
    `;
    
    // Вставляем сообщение в начало страницы
    const content = document.getElementById('content') || document.body;
    content.insertBefore(messageDiv, content.firstChild);
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, 5000);
}

// ==================== ЗАПИСЬ К ВРАЧУ ====================

function openBookingModal(doctorId, doctorName) {
    if (!currentUser) {
        showMessage('Для записи необходимо войти в систему', 'info');
        window.location.href = '/login';
        return;
    }
    
    // Создаем модальное окно, если его нет
    let modal = document.getElementById('bookingModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'bookingModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">Запись к врачу</h2>
                    <button class="close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="bookingForm">
                        <div class="form-group">
                            <label class="form-label">Врач</label>
                            <input type="text" id="bookingDoctor" class="form-control" readonly>
                            <input type="hidden" id="bookingDoctorId">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Дата</label>
                            <input type="date" id="bookingDate" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Время</label>
                            <input type="time" id="bookingTime" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Симптомы/жалобы</label>
                            <textarea id="bookingSymptoms" class="form-control" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Причина обращения</label>
                            <input type="text" id="bookingReason" class="form-control" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Записаться</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Добавляем обработчик формы
        document.getElementById('bookingForm').addEventListener('submit', submitBooking);
    }
    
    // Заполняем данные
    document.getElementById('bookingDoctorId').value = doctorId;
    document.getElementById('bookingDoctor').value = doctorName;
    
    // Устанавливаем завтрашнюю дату по умолчанию
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('bookingDate').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('bookingDate').min = tomorrow.toISOString().split('T')[0];
    
    // Устанавливаем время по умолчанию
    document.getElementById('bookingTime').value = '10:00';
    
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function submitBooking(event) {
    event.preventDefault();
    
    const appointmentData = {
        doctor_id: document.getElementById('bookingDoctorId').value,
        patient_id: currentUser?.id || 'demo-patient-id',
        date: `${document.getElementById('bookingDate').value}T${document.getElementById('bookingTime').value}:00`,
        symptoms: document.getElementById('bookingSymptoms').value,
        reason: document.getElementById('bookingReason').value
    };
    
    try {
        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(appointmentData)
        });
        
        if (response.ok) {
            const data = await response.json();
            showMessage('Запись успешно создана!', 'success');
            closeModal();
            // Если мы на странице записей, обновляем ее
            if (window.location.pathname === '/appointments') {
                window.location.reload();
            }
        } else {
            const error = await response.json();
            showMessage(error.message || 'Ошибка создания записи', 'error');
        }
    } catch (error) {
        showMessage('Ошибка подключения к серверу', 'error');
    }
}

// ==================== УТИЛИТЫ ====================

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Ожидает',
        'confirmed': 'Подтверждена',
        'completed': 'Завершена',
        'cancelled': 'Отменена'
    };
    return statusMap[status] || status;
}

// Закрытие модального окна при клике вне его
document.addEventListener('click', function(event) {
    const modal = document.getElementById('bookingModal');
    if (modal && event.target === modal) {
        closeModal();
    }
});

// Экспортируем функции для использования в других файлах
window.logout = logout;
window.showMessage = showMessage;
window.openBookingModal = openBookingModal;
window.closeModal = closeModal;