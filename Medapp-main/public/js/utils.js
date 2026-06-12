// Утилиты для работы с localStorage и API

// Сохранение и получение токена
function setToken(token) {
    localStorage.setItem('token', token);
}

function getToken() {
    return localStorage.getItem('token');
}

function removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Получение пользователя
function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Проверка авторизации
function checkAuth() {
    return getToken() !== null;
}

// API запросы с авторизацией
async function apiRequest(url, options = {}) {
    const token = getToken();
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        // Неавторизован
        removeToken();
        window.location.href = '/login';
        return null;
    }
    
    return response;
}

// Показать сообщение
function showMessage(type, text) {
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.className = `alert alert-${type}`;
        messageEl.textContent = text;
        messageEl.style.display = 'block';
        
        // Автоматическое скрытие
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    } else {
        alert(text);
    }
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Форматирование номера телефона
function formatPhone(phone) {
    return phone.replace(/(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/, '+$1 ($2) $3-$4-$5');
}

// Статус записи
function getStatusBadge(status) {
    const statuses = {
        'scheduled': { text: 'Запланирована', class: 'badge-primary' },
        'confirmed': { text: 'Подтверждена', class: 'badge-success' },
        'completed': { text: 'Завершена', class: 'badge-success' },
        'cancelled': { text: 'Отменена', class: 'badge-danger' }
    };
    
    const statusInfo = statuses[status] || { text: status, class: 'badge-primary' };
    return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
}

// Выход из системы
function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        removeToken();
        window.location.href = '/login';
    }
}

// Модальное окно
function showModal(title, content, buttons = []) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">${content}</div>
            <div class="modal-footer">
                ${buttons.map(btn => `
                    <button class="btn ${btn.class}" onclick="${btn.onclick}">
                        ${btn.text}
                    </button>
                `).join('')}
                <button class="btn btn-outline" onclick="this.closest('.modal').remove()">
                    Отмена
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

// Валидация email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Валидация телефона
function validatePhone(phone) {
    const re = /^[\+]?[1-9][\d]{0,15}$/;
    return re.test(phone.replace(/\D/g, ''));
}

// Загрузка данных с индикатором
async function loadData(url, containerId, templateFn, emptyMessage = 'Нет данных') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="spinner"></div>';
    
    try {
        const response = await apiRequest(url);
        if (!response) return;
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length === 0) {
            container.innerHTML = `<p style="text-align: center; color: var(--text-light);">${emptyMessage}</p>`;
        } else if (Array.isArray(data)) {
            container.innerHTML = data.map(templateFn).join('');
        } else if (templateFn) {
            container.innerHTML = templateFn(data);
        }
    } catch (error) {
        console.error('Error loading data:', error);
        container.innerHTML = `<p class="alert alert-danger">Ошибка загрузки данных</p>`;
    }
}