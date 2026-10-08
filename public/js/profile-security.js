document.addEventListener('DOMContentLoaded', () => {
    // 1. Элементы
    const modal = document.getElementById('changePasswordModal');
    const openBtn = document.getElementById('openChangePassword');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelPassword');
    
    const inputCurrent = document.getElementById('currentPassword');
    const inputNew = document.getElementById('newPassword');
    const inputConfirm = document.getElementById('confirmPassword');
    const btnSave = document.getElementById('savePassword');
    const errorsBox = document.getElementById('errors');

    // 2. Функция Toast (внутри, чтобы была доступна)
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            toast.addEventListener('animationend', () => toast.remove());
        }, 4000);
    }

    // 3. Плавное открытие/закрытие
    const openModal = () => {
        modal.style.display = 'flex';
        void modal.offsetWidth;
        modal.classList.add('active');
        modal.classList.remove('closing');
    };

    const closeModal = () => {
        modal.classList.add('closing');
        modal.classList.remove('active');
        
        setTimeout(() => {
            if (!modal.classList.contains('active')) {
                modal.style.display = 'none';

                [inputCurrent, inputNew, inputConfirm].forEach(i => i.value = '');
                errorsBox.innerHTML = '';
                btnSave.disabled = true;
                btnSave.textContent = 'Save';
            }
        }, 300);
    };

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') closeModal();
    });

    // 4. Логика "Глазика"
    document.querySelectorAll('.eye-btn').forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const svg = this.querySelector('svg');

            if (input.type === 'password') {
                input.type = 'text';
                svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
            } else {
                input.type = 'password';
                svg.innerHTML = '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"></path><circle cx="12" cy="12" r="3"></circle>';
            }
        };
    });

    // 5. Валидация
    function validate() {
        const cur = inputCurrent.value.trim();
        const neu = inputNew.value.trim();
        const conf = inputConfirm.value.trim();
        const errors = [];

        if (cur && neu && conf) {
            if (neu.length < 6) errors.push('Min 6 characters');
            if (cur === neu) errors.push('New must be different');
            if (neu !== conf) errors.push('Passwords do not match');

            errorsBox.innerHTML = '';
            if (errors.length > 0) {
                errors.forEach(msg => {
                    const div = document.createElement('div');
                    div.className = 'error-item';
                    div.textContent = msg;
                    errorsBox.appendChild(div);
                });
                btnSave.disabled = true;
            } else {
                btnSave.disabled = false;
            }
        } else {
            btnSave.disabled = true;
            errorsBox.innerHTML = '';
        }
    }

    [inputCurrent, inputNew, inputConfirm].forEach(inp => {
        inp.addEventListener('input', validate);
    });

    // 6. Сохранение
    btnSave.addEventListener('click', async () => {
        if (btnSave.disabled) return;
        
        btnSave.disabled = true;
        const originalText = btnSave.textContent;
        btnSave.textContent = 'Saving...';

        try {
            await new Promise(r => setTimeout(r, 1200)); // Имитация сети
            showToast('Password successfully updated!', 'success');
            closeModal();
        } catch (e) {
            showToast('Error changing password', 'error');
            btnSave.disabled = false;
        } finally {
            btnSave.textContent = originalText;
        }
    });
});