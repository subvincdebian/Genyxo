// Behavior migrated from notifications-inline1; resources are owned by the React mount.
import { API_BASE_URL as API_ORIGIN, SOCKET_URL as SOCKET_ORIGIN } from '@/shared/config';
export default function initialize(scope, context) {
// Ждем полной загрузки документа
scope.document.addEventListener('DOMContentLoaded', function () {
  const faqWindow = scope.document.getElementById('faqWindow');
  const faqMenu = scope.document.getElementById('faqMenu');
  const faqBackBtn = scope.document.getElementById('faqBackBtn');
  const faqCloseBtn = scope.document.getElementById('faqCloseBtn');
  const faqTitle = scope.document.querySelector('.faq-title');

  // Функция открытия страницы FAQ
  scope.window.openFaqPage = function (pageId) {
    // 1. Скрываем меню
    faqMenu.style.display = 'none';

    // 2. Скрываем все страницы контента
    scope.document.querySelectorAll('.faq-content-page').forEach(el => el.classList.remove('active'));

    // 3. Показываем нужную страницу
    const targetPage = scope.document.getElementById(pageId);
    if (targetPage) {
      targetPage.classList.add('active');
      // Обновляем заголовок (опционально можно брать из h4)
      // faqTitle.innerText = "Info"; 
    }

    // 4. Показываем кнопку "Назад"
    faqBackBtn.style.visibility = 'visible';

    // 5. Скроллим наверх
    scope.document.querySelector('.faq-body').scrollTop = 0;
  };

  // Функция возврата назад
  scope.listen(faqBackBtn, 'click', function () {
    // 1. Скрываем все страницы
    scope.document.querySelectorAll('.faq-content-page').forEach(el => el.classList.remove('active'));

    // 2. Показываем меню
    faqMenu.style.display = 'block'; // или 'block', если не flex

    // 3. Скрываем кнопку "Назад"
    faqBackBtn.style.visibility = 'hidden';

    // 4. Сбрасываем заголовок
    // faqTitle.setAttribute('data-i18n', 'faq.title'); // Если используешь i18n
  });

  // Логика открытия FAQ окна
  const openFaqBtns = scope.document.querySelectorAll('#openFaqBtn');
  openFaqBtns.forEach(btn => {
    scope.listen(btn, 'click', function (e) {
      e.stopPropagation();
      faqWindow.classList.add('active');
      // Сбрасываем в главное меню
      scope.document.querySelectorAll('.faq-content-page').forEach(el => el.classList.remove('active'));
      faqMenu.style.display = 'block';
      faqBackBtn.style.visibility = 'hidden';
    });
  });

  // Логика закрытия на крестик
  scope.listen(faqCloseBtn, 'click', function () {
    faqWindow.classList.remove('active');
    // Сброс к главному меню при следующем открытии (через 300мс чтобы не мигало)
    scope.setTimeout(() => {
      faqBackBtn.click();
    }, 300);
  });
});



}
