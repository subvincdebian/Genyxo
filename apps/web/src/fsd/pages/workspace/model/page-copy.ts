import type { Language } from "@/shared/i18n";

// Page copy stays with its FSD owner; the shared language provider controls locale.
const rows = `
requiredField|Це поле обов’язкове.|Este campo es obligatorio.|Dieses Feld ist erforderlich.|Ce champ est obligatoire.
invalidField|Введіть коректне значення.|Introduce un valor válido.|Gib einen gültigen Wert ein.|Saisissez une valeur valide.
yourWorkspace|Ваш робочий простір|Tu espacio de trabajo|Dein Arbeitsbereich|Votre espace de travail
library|Бібліотека|Biblioteca|Bibliothek|Bibliothèque
plugins|Плагіни|Plugins|Plugins|Plugins
skills|Навички|Habilidades|Fähigkeiten|Compétences
scheduled|Заплановано|Programadas|Geplant|Planifiées
recommended|Рекомендоване|Recomendados|Empfohlen|Recommandés
favorites|Обране|Favoritos|Favoriten|Favoris
folders|Папки|Carpetas|Ordner|Dossiers
images|Зображення|Imágenes|Bilder|Images
all|Усі|Todo|Alle|Tout
allFolders|Усі папки|Todas las carpetas|Alle Ordner|Tous les dossiers
allTypes|Усі типи|Todos los tipos|Alle Typen|Tous les types
byName|Назва|Nombre|Name|Nom
content|Вміст|Contenido|Inhalt|Contenu
create|Створити|Crear|Erstellen|Créer
delete|Видалити|Eliminar|Löschen|Supprimer
document|Документ|Documento|Dokument|Document
documents|Документи|Documentos|Dokumente|Documents
download|Завантажити оригінал|Descargar original|Original herunterladen|Télécharger l’original
edit|Редагувати|Editar|Bearbeiten|Modifier
fileLimit|Оберіть файл розміром до 5 МБ.|Elige un archivo de menos de 5 MB.|Wähle eine Datei unter 5 MB.|Choisissez un fichier de moins de 5 Mo.
fileReadError|Не вдалося прочитати файл|No se pudo leer el archivo|Datei konnte nicht gelesen werden|Impossible de lire ce fichier
folder|Папка|Carpeta|Ordner|Dossier
folderActions|Дії з папкою|Acciones de carpeta|Ordneraktionen|Actions du dossier
gridView|Сітка|Cuadrícula|Rasteransicht|Grille
image|Зображення|Imagen|Bild|Image
itemActions|Дії для|Acciones para|Aktionen für|Actions pour
libraryEmpty|Ваша бібліотека чекає на нові матеріали|Tu biblioteca está lista para algo nuevo|Deine Bibliothek ist bereit für Neues|Votre bibliothèque attend de nouveaux contenus
libraryEmptyHint|Тут з’являться зображення, відео й аудіо, створені в чаті. Також можна зберігати документи.|Aquí aparecerán las imágenes, vídeos y audios que crees en el chat. También puedes guardar documentos.|Bilder, Videos und Audio aus dem Chat erscheinen hier. Du kannst auch Dokumente speichern.|Les images, vidéos et audios créés dans le chat apparaissent ici. Vous pouvez aussi enregistrer des documents.
librarySections|Розділи бібліотеки|Secciones de biblioteca|Bibliotheksbereiche|Sections de la bibliothèque
listView|Список|Lista|Listenansicht|Liste
loadMore|Показати ще|Cargar más|Mehr laden|Afficher plus
mediaUnavailable|Цей медіафайл більше недоступний.|Este contenido ya no está disponible.|Dieses Medium ist nicht mehr verfügbar.|Ce média n’est plus disponible.
moveToFolder|Перемістити в папку|Mover a carpeta|In Ordner verschieben|Déplacer dans un dossier
name|Назва|Nombre|Name|Nom
newDocument|Новий документ|Nuevo documento|Neues Dokument|Nouveau document
newest|Спочатку нові|Más recientes|Neueste zuerst|Plus récents
newFolder|Нова папка|Nueva carpeta|Neuer Ordner|Nouveau dossier
noFolder|Без папки|Sin carpeta|Kein Ordner|Sans dossier
noPreview|Попередній перегляд недоступний|Vista previa no disponible|Keine Vorschau verfügbar|Aucun aperçu disponible
noResults|Нічого не знайдено|No se encontraron resultados|Keine Ergebnisse gefunden|Aucun résultat
open|Відкрити|Abrir|Öffnen|Ouvrir
openFolder|Відкрити папку|Abrir carpeta|Ordner öffnen|Ouvrir le dossier
addFavorite|Додати|Añadir|Hinzufügen|Ajouter
removeFavorite|Прибрати|Quitar|Entfernen|Retirer
fromFavorites|з обраного|de favoritos|aus Favoriten|des favoris
toFavorites|до обраного|a favoritos|zu Favoriten|aux favoris
rename|Перейменувати|Renombrar|Umbenennen|Renommer
searchLibrary|Пошук у бібліотеці|Buscar en la biblioteca|Bibliothek durchsuchen|Rechercher dans la bibliothèque
sort|Сортування|Ordenar|Sortieren|Trier
sourceChat|Відкрити вихідний чат|Abrir chat de origen|Ursprünglichen Chat öffnen|Ouvrir la conversation d’origine
textFormats|Завантажте текст, Markdown, CSV, JSON, зображення, відео або аудіо.|Sube texto, Markdown, CSV, JSON, una imagen, un vídeo o un audio.|Lade Text, Markdown, CSV, JSON, ein Bild, Video oder Audio hoch.|Importez du texte, Markdown, CSV, JSON, une image, une vidéo ou un audio.
trySearch|Спробуйте інший запит або очистіть фільтри.|Prueba otra búsqueda o borra los filtros.|Versuche eine andere Suche oder setze die Filter zurück.|Essayez une autre recherche ou effacez les filtres.
type|Тип|Tipo|Typ|Type
uploadFile|Завантажити файл|Subir archivo|Datei hochladen|Importer un fichier
uploading|Завантаження файлу…|Subiendo archivo…|Datei wird hochgeladen…|Importation du fichier…
video|Відео|Vídeo|Video|Vidéo
videos|Відео|Vídeos|Videos|Vidéos
view|Вигляд|Vista|Ansicht|Affichage
cancel|Скасувати|Cancelar|Abbrechen|Annuler
clearSearch|Очистити пошук|Borrar búsqueda|Suche löschen|Effacer la recherche
deleteConfirm|Видалити цей матеріал? Цю дію не можна скасувати.|¿Eliminar este elemento? No se puede deshacer.|Dieses Element löschen? Das kann nicht rückgängig gemacht werden.|Supprimer cet élément ? Cette action est irréversible.
deleteFolderConfirm|Видалити папку? Матеріали залишаться в бібліотеці.|¿Eliminar la carpeta? Los materiales seguirán en la biblioteca.|Ordner löschen? Die Inhalte bleiben in der Bibliothek.|Supprimer ce dossier ? Les contenus resteront dans la bibliothèque.
empty|Тут поки порожньо|Aún no hay nada|Hier ist noch nichts|Rien pour le moment
emptyHint|Створіть щось, щоб почати.|Crea algo para empezar.|Erstelle etwas, um loszulegen.|Créez quelque chose pour commencer.
loading|Завантаження|Cargando|Wird geladen|Chargement
retry|Спробувати знову|Reintentar|Erneut versuchen|Réessayer
save|Зберегти|Guardar|Speichern|Enregistrer
saved|Збережено|Guardado|Gespeichert|Enregistré
saveError|Не вдалося зберегти зміни|No se pudieron guardar los cambios|Änderungen konnten nicht gespeichert werden|Impossible d’enregistrer les modifications
saving|Збереження…|Guardando…|Wird gespeichert…|Enregistrement…
add|Додати|Añadir|Hinzufügen|Ajouter
allowedActions|Дозволені дії (по одній у рядку)|Acciones permitidas (una por línea)|Erlaubte Aktionen (eine pro Zeile)|Actions autorisées (une par ligne)
apiKey|API-ключ (необов’язково)|Clave API (opcional)|API-Schlüssel (optional)|Clé API (facultative)
apply|Застосувати|Aplicar|Anwenden|Appliquer
applyHint|Оберіть, де застосувати інструкції. Повідомлення не буде надіслано.|Elige dónde aplicar las instrucciones. No se enviará ningún mensaje.|Wähle, wo die Anweisungen gelten sollen. Es wird keine Nachricht gesendet.|Choisissez où appliquer les instructions. Aucun message ne sera envoyé.
applyTo|Застосувати до|Aplicar a|Anwenden auf|Appliquer à
backToCatalog|Назад до каталогу|Volver al catálogo|Zurück zum Katalog|Retour au catalogue
catalogScope|Область каталогу|Ámbito del catálogo|Katalogbereich|Portée du catalogue
catalogType|Тип каталогу|Tipo de catálogo|Katalogtyp|Type de catalogue
configured|Налаштовано|Configurado|Konfiguriert|Configuré
connect|Підключити|Conectar|Verbinden|Connecter
connected|Підключено|Conectado|Verbunden|Connecté
connectionHint|Збереження налаштувань не перевіряє активне підключення.|Guardar la configuración no verifica una conexión activa.|Das Speichern der Konfiguration prüft keine aktive Verbindung.|Enregistrer la configuration ne vérifie pas la connexion.
connectionSettings|Налаштування підключення|Ajustes de conexión|Verbindungseinstellungen|Paramètres de connexion
copySuffix|копія|copia|Kopie|copie
currentChat|Поточний чат|Chat actual|Aktueller Chat|Conversation actuelle
customApi|Власний API / вебхук|API / webhook propio|Eigene API / Webhook|API / webhook personnalisé
description|Опис|Descripción|Beschreibung|Description
disconnect|Відключити|Desconectar|Trennen|Déconnecter
duplicate|Створити копію|Duplicar|Duplizieren|Dupliquer
editSkill|Редагувати навичку|Editar habilidad|Fähigkeit bearbeiten|Modifier la compétence
httpsEndpoint|HTTPS-адреса|Dirección HTTPS|HTTPS-Adresse|Adresse HTTPS
installed|Встановлені|Instalados|Installiert|Installés
instructions|Інструкції|Instrucciones|Anweisungen|Instructions
integrationSettings|Налаштування інтеграцій|Ajustes de integraciones|Integrationseinstellungen|Paramètres des intégrations
newChat|Новий чат|Nuevo chat|Neuer Chat|Nouvelle conversation
newSkill|Нова навичка|Nueva habilidad|Neue Fähigkeit|Nouvelle compétence
noInstalled|Тут з’являться ваші підключені застосунки.|Aquí aparecerán tus aplicaciones conectadas.|Deine verbundenen Apps erscheinen hier.|Vos applications connectées apparaîtront ici.
noPermissions|Дозволи не запитуються|No se solicitan permisos|Keine Berechtigungen angefordert|Aucune autorisation demandée
noSavedSkills|Збережіть навичку, щоб тримати інструкції поруч.|Guarda una habilidad para tener tus instrucciones a mano.|Speichere eine Fähigkeit, um deine Anweisungen griffbereit zu haben.|Enregistrez une compétence pour garder vos instructions à portée de main.
optionalModel|Модель (необов’язково)|Modelo (opcional)|Modell (optional)|Modèle (facultatif)
permissions|Дозволи|Permisos|Berechtigungen|Autorisations
permissionsFor|Дозволи для|Permisos de|Berechtigungen für|Autorisations de
personal|Особисті|Personales|Persönlich|Personnels
personalIntegration|Особиста інтеграція|Integración personal|Persönliche Integration|Intégration personnelle
pluginsAndSkills|Плагіни та навички|Plugins y habilidades|Plugins und Fähigkeiten|Plugins et compétences
pluginsEmptyHint|Додайте доступну інтеграцію або налаштуйте власний API.|Añade una integración disponible o configura tu propia API.|Füge eine verfügbare Integration hinzu oder konfiguriere deine eigene API.|Ajoutez une intégration disponible ou configurez votre API.
popular|Популярні|Populares|Beliebt|Populaires
providerUnavailable|Цей сервіс не налаштовано. Підключення недоступне.|Este proveedor no está configurado. La conexión no está disponible.|Dieser Anbieter ist nicht konfiguriert. Eine Verbindung ist nicht verfügbar.|Ce fournisseur n’est pas configuré. La connexion est indisponible.
public|Публічні|Públicos|Öffentlich|Publics
publicPlugin|Публічний плагін|Plugin público|Öffentliches Plugin|Plugin public
savedSkills|Збережені навички|Habilidades guardadas|Gespeicherte Fähigkeiten|Compétences enregistrées
scrollLeft|Прокрутити ліворуч|Desplazar a la izquierda|Nach links scrollen|Défiler à gauche
scrollRight|Прокрутити праворуч|Desplazar a la derecha|Nach rechts scrollen|Défiler à droite
searchPlugins|Пошук плагінів|Buscar plugins|Plugins durchsuchen|Rechercher des plugins
searchSkills|Пошук навичок|Buscar habilidades|Fähigkeiten durchsuchen|Rechercher des compétences
secretStored|Наявні облікові дані залишаються на сервері. Введіть ключ лише для заміни.|Las credenciales existentes se quedan en el servidor. Introduce una clave solo para reemplazarla.|Vorhandene Zugangsdaten bleiben auf dem Server. Gib nur zum Ersetzen einen Schlüssel ein.|Les identifiants existants restent sur le serveur. Saisissez une clé uniquement pour les remplacer.
settingsFor|Налаштування для|Ajustes de|Einstellungen für|Paramètres de
skillsEmptyHint|Додайте навичку або скопіюйте публічний шаблон у свою колекцію.|Añade una habilidad o copia una plantilla pública a tu colección.|Füge eine Fähigkeit hinzu oder kopiere eine öffentliche Vorlage in deine Sammlung.|Ajoutez une compétence ou copiez un modèle public dans votre collection.
skillVersionHint|Зміни створюють нову версію. Застосуйте її явно, щоб оновити поточну розмову.|Los cambios crean una nueva versión. Aplícala para actualizar una conversación existente.|Änderungen erstellen eine neue Version. Wende sie ausdrücklich auf ein bestehendes Gespräch an.|Les modifications créent une nouvelle version. Appliquez-la explicitement pour mettre à jour une conversation existante.
status|Стан|Estado|Status|État
unavailable|Недоступно|No disponible|Nicht verfügbar|Indisponible
unconfigured|Не підключено|Sin conectar|Nicht verbunden|Non connecté
use|Використати|Usar|Verwenden|Utiliser
version|Версія|Versión|Version|Version
yourCollection|Ваша колекція|Tu colección|Deine Sammlung|Votre collection
checkAvailability|Перевірити доступність|Comprobar disponibilidad|Verfügbarkeit prüfen|Vérifier la disponibilité
createTask|Створити завдання|Crear tarea|Aufgabe erstellen|Créer une tâche
editTask|Редагувати завдання|Editar tarea|Aufgabe bearbeiten|Modifier la tâche
lastRun|Останній запуск|Última ejecución|Letzte Ausführung|Dernière exécution
model|Модель|Modelo|Modell|Modèle
nextRun|Наступний запуск|Próxima ejecución|Nächste Ausführung|Prochaine exécution
noProject|Без проєкту|Sin proyecto|Kein Projekt|Sans projet
noTasks|Запланованих завдань поки немає|Aún no hay tareas programadas|Noch keine geplanten Aufgaben|Aucune tâche planifiée pour le moment
noTasksHint|Створіть завдання із запитом, моделлю та розкладом.|Crea una tarea con un mensaje, modelo y horario.|Erstelle eine Aufgabe mit Prompt, Modell und Zeitplan.|Créez une tâche avec une instruction, un modèle et un calendrier.
notScheduled|Не заплановано|Sin programar|Nicht geplant|Non planifié
pause|Призупинити|Pausar|Pausieren|Suspendre
paused|Призупинено|En pausa|Pausiert|Suspendu
project|Проєкт|Proyecto|Projekt|Projet
prompt|Запит|Instrucción|Prompt|Instruction
resume|Відновити|Reanudar|Fortsetzen|Reprendre
schedule|Розклад|Horario|Zeitplan|Calendrier
scheduledHint|Плануйте регулярну роботу у своєму календарі.|Organiza el trabajo recurrente en tu calendario.|Plane wiederkehrende Arbeit in deinem Kalender.|Organisez votre travail récurrent dans votre calendrier.
scheduleExample|Наприклад: 0 9 * * 1-5|Por ejemplo: 0 9 * * 1-5|Zum Beispiel: 0 9 * * 1-5|Par exemple : 0 9 * * 1-5
schedulerUnconfigured|Виконання за розкладом не налаштовано для цього простору.|La ejecución programada no está configurada en este espacio.|Geplante Ausführungen sind für diesen Arbeitsbereich nicht konfiguriert.|L’exécution planifiée n’est pas configurée pour cet espace.
schedulingUnavailable|Планування недоступне|La programación no está disponible|Planung ist nicht verfügbar|La planification est indisponible
timezone|Часовий пояс|Zona horaria|Zeitzone|Fuseau horaire
audio|Аудіо|Audio|Audio|Audio
videos|Відео|Vídeos|Videos|Vidéos
filter|Фільтр|Filtrar|Filtern|Filtrer
share|Поділитися|Compartir|Teilen|Partager
linkCopied|Посилання скопійовано|Enlace copiado|Link kopiert|Lien copié
textCopied|Текст скопійовано|Texto copiado|Text kopiert|Texte copié
copyPrompt|Копіювати запит|Copiar instrucción|Prompt kopieren|Copier l’invite
zoom|Масштаб|Zoom|Zoom|Zoom
fitToScreen|Вмістити|Ajustar|Einpassen|Ajuster
previousItem|Попередній|Anterior|Vorheriges|Précédent
nextItem|Наступний|Siguiente|Nächstes|Suivant
closeViewer|Закрити|Cerrar|Schließen|Fermer
askAboutFile|Запитайте про цей файл|Pregunta sobre este archivo|Frag zu dieser Datei|Posez une question sur ce fichier
send|Надіслати|Enviar|Senden|Envoyer
editInChat|Редагувати|Editar|Bearbeiten|Modifier
variation|Варіація|Variación|Variante|Variante
animate|Оживити|Animar|Animieren|Animer
favorite|В обране|Favorito|Favorit|Favori
generatedBy|Створено в чаті|Creado en el chat|Im Chat erstellt|Créé dans le chat
mediaLoading|Завантаження…|Cargando…|Wird geladen…|Chargement…
editImageDraft|Відредагуй це зображення: |Edita esta imagen: |Bearbeite dieses Bild: |Modifie cette image : 
variationDraft|Створи варіацію цього зображення|Crea una variación de esta imagen|Erstelle eine Variante dieses Bildes|Crée une variante de cette image
animateDraft|Перетвори це зображення на коротке відео|Convierte esta imagen en un vídeo corto|Mach aus diesem Bild ein kurzes Video|Transforme cette image en courte vidéo
copyFailed|Не вдалося скопіювати.|No se pudo copiar.|Kopieren fehlgeschlagen.|Échec de la copie.
`;

const languages = ["uk", "es", "de", "fr"] as const;
export const pageCopy: Partial<Record<Language, Record<string, string>>> = Object.fromEntries(languages.map((language, index) => [language, Object.fromEntries(rows.trim().split("\n").map((row) => { const parts = row.split("|"); return [parts[0], parts[index + 1]]; }))]));
