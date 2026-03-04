function openTab(evt, tabName) {
  // Предотвращаем стандартное поведение (если вызвано из ссылки)
  if (evt) evt.preventDefault();

  // Получаем все элементы с классом "tab-content" и прячем их
  let tabContents = document.getElementsByClassName("tab-content");
  for (let i = 0; i < tabContents.length; i++) {
    tabContents[i].classList.remove("active");
  }

  // Получаем все элементы с классом "tab-link" и удаляем класс "active"
  let tabLinks = document.getElementsByClassName("tab-link");
  for (let i = 0; i < tabLinks.length; i++) {
    tabLinks[i].classList.remove("active");
  }

  // Показываем текущую вкладку и добавляем "active" к кнопке, которая открыла вкладку
  document.getElementById(tabName).classList.add("active");
  
  // Если событие было передано, делаем элемент активным
  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add("active");
  } else {
    // Если функция вызвана без клика по вкладке (например, из ссылки "Read more")
    // Ищем нужную вкладку в панели навигации и делаем её активной
    let targetLink = document.querySelector(`.tab-link[onclick*="${tabName}"]`);
    if (targetLink) targetLink.classList.add("active");
  }
}

// Mobile Menu
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
    
    // Блокируем скролл страницы, когда меню открыто
    if (sidebar.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

// Функция для закрытия меню при клике на ссылку (на мобилках)
function closeSidebarOnMobile() {
    if (window.innerWidth <= 900) {
        toggleSidebar();
    }
}

// Дополнительно: подсветка активного пункта при скролле
window.addEventListener('scroll', () => {
    let sections = document.querySelectorAll('section');
    let navLinks = document.querySelectorAll('.privacy-sidebar a');
    
    sections.forEach(sec => {
        let top = window.scrollY;
        let offset = sec.offsetTop - 150;
        let height = sec.offsetHeight;
        let id = sec.getAttribute('id');
        
        if(top >= offset && top < offset + height) {
            navLinks.forEach(links => {
                links.classList.remove('active');
                document.querySelector('.privacy-sidebar a[href*=' + id + ']').classList.add('active');
            });
        }
    });
});