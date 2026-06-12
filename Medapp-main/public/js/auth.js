// Функции для работы с аутентификацией

// Проверка доступности email/username
async function checkAvailability(field, value) {
    try {
        const response = await fetch(`/api/auth/check?${field}=${encodeURIComponent(value)}`);
        const data = await response.json();
        return data.available;
    } catch (error) {
        console.error('Availability check error:', error);
        return false;
    }
}

// Обновление профиля
async function updateProfile(data) {
    try {
        const response = await apiRequest('/api/users/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        if (response && response.ok) {
            const result = await response.json();
            localStorage.setItem('user', JSON.stringify(result.user));
            return { success: true, user: result.user };
        } else {
            const error = await response.json();
            return { success: false, message: error.message };
        }
    } catch (error) {
        return { success: false, message: 'Ошибка сети' };
    }
}

// Проверка пароля
async function verifyPassword(password) {
    const user = getUser();
    if (!user) return false;
    
    try {
        const response = await apiRequest('/api/auth/verify-password', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
        
        return response && response.ok;
    } catch (error) {
        return false;
    }
}

// Смена пароля
async function changePassword(currentPassword, newPassword) {
    try {
        const response = await apiRequest('/api/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        if (response && response.ok) {
            return { success: true };
        } else {
            const error = await response.json();
            return { success: false, message: error.message };
        }
    } catch (error) {
        return { success: false, message: 'Ошибка сети' };
    }
}

// Получение профиля
async function getProfile() {
    try {
        const response = await apiRequest('/api/users/profile');
        if (response && response.ok) {
            const user = await response.json();
            localStorage.setItem('user', JSON.stringify(user));
            return user;
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Редирект на основе роли
function redirectByRole(role) {
    switch(role) {
        case 'admin':
            window.location.href = '/admin';
            break;
        case 'doctor':
            window.location.href = '/doctor/dashboard';
            break;
        default:
            window.location.href = '/dashboard';
    }
}

// Проверка сессии
async function checkSession() {
    const token = getToken();
    if (!token) return false;
    
    try {
        const response = await apiRequest('/api/users/profile');
        return response && response.ok;
    } catch (error) {
        return false;
    }
}

// Обновление токена
async function refreshToken() {
    try {
        const response = await apiRequest('/api/auth/refresh');
        if (response && response.ok) {
            const data = await response.json();
            setToken(data.token);
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}