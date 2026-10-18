// ===== СОХРАНЕНИЕ ВИДЖЕТОВ =====
let widgetsCount = JSON.parse(localStorage.getItem('widgetsCount')) || {
    notes: 1,
    draw: 1,
    tracker: 1,
    created: []
};

// Если created пустой, добавляем HTML-виджеты
if (widgetsCount.created.length === 0) {
    widgetsCount.created = [
        { type: 'notes', id: 'notes-1', title: 'Заметка №1' },
        { type: 'draw', id: 'draw-1', title: 'Рисунок №1' },
        { type: 'tracker', id: 'tracker-1', title: 'Трекер привычек' }
    ];
} else {
    // Проверяем, есть ли трекер в created
    const hasTracker = widgetsCount.created.some(w => w.id === 'tracker-1');
    if (!hasTracker) {
        widgetsCount.created.push({ type: 'tracker', id: 'tracker-1', title: 'Трекер привычек' });
    }
}

// Обновляем счетчики
widgetsCount.notes = widgetsCount.created.filter(w => w.type === 'notes').length;
widgetsCount.draw = widgetsCount.created.filter(w => w.type === 'draw').length;
widgetsCount.tracker = widgetsCount.created.filter(w => w.type === 'tracker').length;
localStorage.setItem('widgetsCount', JSON.stringify(widgetsCount));

// ===== ХРАНЕНИЕ ДАННЫХ ВИДЖЕТОВ =====
function getWidgetData(widgetId) {
    if (!widgetId) return null;
    try {
        const data = localStorage.getItem(`widgetData_${widgetId}`);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.warn('Ошибка чтения данных', e);
        return null;
    }
}

function saveWidgetData(widgetId, data) {
    if (!widgetId) return;
    try {
        localStorage.setItem(`widgetData_${widgetId}`, JSON.stringify(data));
    } catch (e) {
        console.error('Ошибка сохранения данных', e);
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ ВИДЖЕТА ЗАМЕТОК С ЗАГРУЗКОЙ ДАННЫХ =====
function initNotesWidgetWithData(widget) {
    const widgetId = widget.dataset.widgetId;
    if (!widgetId) return;

    let widgetData = getWidgetData(widgetId);
    if (!widgetData) {
        const titleInput = widget.querySelector('.notes-title-input');
        const title = titleInput ? titleInput.value : 'Заметка';
        widgetData = { notes: [], title: title };
        saveWidgetData(widgetId, widgetData);
    }

    const titleInput = widget.querySelector('.notes-title-input');
    const notesList = widget.querySelector('.notes-list');
    const noteInput = widget.querySelector('.note-input');
    const addBtn = widget.querySelector('.add-note-btn');

    if (titleInput) titleInput.value = widgetData.title;

    function saveNotes() {
        saveWidgetData(widgetId, widgetData);
    }

    function renderNotes() {
        if (!notesList) return;
        if (!widgetData.notes || widgetData.notes.length === 0) {
            notesList.innerHTML = '<div style="color: #5f748d; text-align: center; padding: 10px;">Нет заметок</div>';
            return;
        }
        notesList.innerHTML = widgetData.notes.map((note, index) => `
            <div class="note-item ${note.completed ? 'completed' : ''}" data-index="${index}">
                <input type="checkbox" class="note-checkbox" ${note.completed ? 'checked' : ''}>
                <span class="note-text ${note.completed ? 'completed' : ''}">${escapeHtml(note.text)}</span>
                <button class="delete-note">×</button>
            </div>
        `).join('');

        notesList.querySelectorAll('.note-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const index = this.closest('.note-item').dataset.index;
                widgetData.notes[index].completed = this.checked;
                this.closest('.note-item').querySelector('.note-text').classList.toggle('completed', this.checked);
                saveNotes();
            });
        });

        notesList.querySelectorAll('.delete-note').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = this.closest('.note-item').dataset.index;
                widgetData.notes.splice(index, 1);
                saveNotes();
                renderNotes();
            });
        });
    }

    renderNotes();

    if (addBtn && noteInput) {
        addBtn.onclick = () => {
            const text = noteInput.value.trim();
            if (text) {
                widgetData.notes.push({ text, completed: false });
                saveNotes();
                noteInput.value = '';
                renderNotes();
            }
        };
        noteInput.onkeypress = (e) => {
            if (e.key === 'Enter') addBtn.click();
        };
    }

    if (titleInput) {
        titleInput.onblur = () => {
            widgetData.title = titleInput.value;
            saveNotes();
        };
    }
}

// ===== ВРЕМЯ =====
function updateTime() {
    const now = new Date();
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('currentTime').textContent = `${hours}:${minutes}:${seconds}`;
    
    const options = { day: 'numeric', month: 'long' };
    const dateStr = now.toLocaleDateString('ru-RU', options);
    document.getElementById('currentDate').textContent = dateStr;
}

setInterval(updateTime, 1000);
updateTime();

// ===== ПОГОДА (работает для любого города) =====
async function getWeather() {
    // Получите бесплатный ключ на https://openweathermap.org/api
    const API_KEY = 'ваш_ключ_сюда'; // ВСТАВЬТЕ СВОЙ КЛЮЧ
    
    try {
        // Показываем загрузку
        document.getElementById('weatherCity').textContent = 'определяем...';
        document.getElementById('weatherTemp').textContent = '--°';
        
        // 1. Сначала получаем IP и определяем город
        const ipResponse = await fetch('https://ipapi.co/json/');
        const ipData = await ipResponse.json();
        
        let city = ipData.city || 'Moscow'; // Если город не определился, ставим Москву
        let countryCode = ipData.country_code || 'RU';
        
        // 2. Получаем погоду для этого города
        const weatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city},${countryCode}&units=metric&lang=ru&appid=${API_KEY}`
        );
        
        if (!weatherResponse.ok) {
            // Если не получилось с городом, пробуем по координатам
            const lat = ipData.latitude || 55.7558;
            const lon = ipData.longitude || 37.6173;
            
            const weatherByCoords = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${API_KEY}`
            );
            const weatherData = await weatherByCoords.json();
            
            if (weatherData.main) {
                const temp = Math.round(weatherData.main.temp);
                document.getElementById('weatherTemp').textContent = temp > 0 ? `+${temp}°` : `${temp}°`;
                document.getElementById('weatherCity').textContent = weatherData.name || city;
            }
        } else {
            const weatherData = await weatherResponse.json();
            const temp = Math.round(weatherData.main.temp);
            document.getElementById('weatherTemp').textContent = temp > 0 ? `+${temp}°` : `${temp}°`;
            document.getElementById('weatherCity').textContent = weatherData.name || city;
        }
        
    } catch (error) {
        console.log('Ошибка погоды:', error);
        document.getElementById('weatherCity').textContent = 'определяем...';
        document.getElementById('weatherTemp').textContent = '--°';
    }
}

// Запускаем
getWeather();

// ===== СЕКУНДОМЕР =====
let stopwatchInterval = null;
let hours = 0;
let minutes = 0;
let seconds = 0;
let isRunning = false;

const stopwatchDisplay = document.getElementById('stopwatch');
const startBtn = document.getElementById('startStopwatch');
const resetBtn = document.getElementById('resetStopwatch');

function updateStopwatchDisplay() {
    const hrs = String(hours).padStart(2, '0');
    const mins = String(minutes).padStart(2, '0');
    const secs = String(seconds).padStart(2, '0');
    stopwatchDisplay.textContent = `${hrs}:${mins}:${secs}`;
}

if (startBtn) {
    startBtn.addEventListener('click', () => {
        if (isRunning) {
            clearInterval(stopwatchInterval);
            isRunning = false;
            startBtn.textContent = 'старт';
        } else {
            isRunning = true;
            startBtn.textContent = 'пауза';
            stopwatchInterval = setInterval(() => {
                seconds++;
                if (seconds === 60) {
                    seconds = 0;
                    minutes++;
                    if (minutes === 60) {
                        minutes = 0;
                        hours++;
                    }
                }
                updateStopwatchDisplay();
            }, 1000);
        }
    });
}

if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        clearInterval(stopwatchInterval);
        isRunning = false;
        hours = 0;
        minutes = 0;
        seconds = 0;
        updateStopwatchDisplay();
        startBtn.textContent = 'старт';
    });
}

// ===== ЗАМЕТКИ (для первого виджета, оставлено для совместимости) =====
let notes = JSON.parse(localStorage.getItem('notes')) || [];

function renderNotes(container, notesArray) {
    if (notesArray.length === 0) {
        container.innerHTML = '<div style="color: #5f748d; text-align: center; padding: 10px;">Нет заметок</div>';
        return;
    }
    
    container.innerHTML = notesArray.map((note, index) => `
        <div class="note-item ${note.completed ? 'completed' : ''}" data-index="${index}">
            <input type="checkbox" class="note-checkbox" ${note.completed ? 'checked' : ''}>
            <span class="note-text ${note.completed ? 'completed' : ''}">${escapeHtml(note.text)}</span>
            <button class="delete-note">×</button>
        </div>
    `).join('');
    
    // Обработчики для чекбоксов
    container.querySelectorAll('.note-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const noteItem = this.closest('.note-item');
            const index = noteItem.dataset.index;
            const noteText = noteItem.querySelector('.note-text');
            
            notesArray[index].completed = this.checked;
            
            if (this.checked) {
                noteText.classList.add('completed');
                noteItem.classList.add('completed');
            } else {
                noteText.classList.remove('completed');
                noteItem.classList.remove('completed');
            }
            
            localStorage.setItem('notes', JSON.stringify(notesArray));
        });
    });
    
    // Обработчики для крестиков
    container.querySelectorAll('.delete-note').forEach(btn => {
        btn.addEventListener('click', function() {
            const noteItem = this.closest('.note-item');
            const index = noteItem.dataset.index;
            
            noteItem.style.opacity = '0';
            noteItem.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                notesArray.splice(index, 1);
                localStorage.setItem('notes', JSON.stringify(notesArray));
                renderNotes(container, notesArray);
            }, 200);
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Для первого виджета
const firstNotesList = document.getElementById('notesList');
const firstNoteInput = document.getElementById('noteInput');
const firstAddBtn = document.getElementById('addNoteBtn');
const firstNotesTitle = document.getElementById('notesTitle');

// Сохранение заголовка
firstNotesTitle.addEventListener('blur', () => {
    localStorage.setItem('notesTitle', firstNotesTitle.value);
});

// Загрузка заголовка
const savedTitle = localStorage.getItem('notesTitle');
if (savedTitle) {
    firstNotesTitle.value = savedTitle;
}

// Добавление заметки в первый виджет
firstAddBtn.addEventListener('click', () => addNote(firstNotesList, firstNoteInput));
firstNoteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addNote(firstNotesList, firstNoteInput);
});

function addNote(container, input) {
    const text = input.value.trim();
    if (text) {
        if (notes.length >= 10) {
            alert('Максимум 10 заметок');
            return;
        }
        notes.push({ text, completed: false });
        localStorage.setItem('notes', JSON.stringify(notes));
        input.value = '';
        renderNotes(container, notes);
        
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }
}

// Инициализация первого виджета
renderNotes(firstNotesList, notes);

// ===== УНИВЕРСАЛЬНАЯ РИСОВАЛКА =====
function initDrawingWidget(widget) {
    const canvas = widget.querySelector('canvas');
    if (!canvas) return;

    // Убедимся, что canvas имеет размеры
    const container = canvas.parentElement;
    if (container.clientWidth === 0 || container.clientHeight === 0) {
        // Если размеры нулевые – пробуем позже (защита)
        setTimeout(() => initDrawingWidget(widget), 50);
        return;
    }
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';

    let paint = false;

    // История для undo/redo
    let history = [];
    let historyIndex = -1;

    function saveState() {
        if (canvas.width === 0 || canvas.height === 0) return;
        if (historyIndex < history.length - 1) {
            history = history.slice(0, historyIndex + 1);
        }
        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            history.push(imageData);
            historyIndex++;
        } catch (e) {
            console.warn('Ошибка сохранения', e);
        }
    }

    function restoreState() {
        if (historyIndex >= 0 && historyIndex < history.length) {
            ctx.putImageData(history[historyIndex], 0, 0);
        }
    }

    // Цвета
    const toolBtns = widget.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            ctx.strokeStyle = btn.dataset.color;
        });
    });

    // Рисование
    canvas.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        paint = true;
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    canvas.onmousemove = (e) => {
        if (!paint) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    canvas.onmouseup = () => {
        if (paint) {
            paint = false;
            saveState();
        }
    };
    canvas.onmouseout = () => {
        if (paint) {
            paint = false;
            saveState();
        }
    };
    canvas.oncontextmenu = (e) => e.preventDefault();

    // Очистка
    const clearBtn = widget.querySelector('.draw-btn');
    if (clearBtn && clearBtn.textContent.includes('очистить')) {
        clearBtn.onclick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            saveState();
        };
    }

    // Undo / Redo
    const undoBtn = widget.querySelector('#undoBtn, .undo-btn');
    const redoBtn = widget.querySelector('#redoBtn, .redo-btn');

    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            if (historyIndex > 0) {
                historyIndex--;
                restoreState();
            }
        });
    }

    if (redoBtn) {
        redoBtn.addEventListener('click', () => {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                restoreState();
            }
        });
    }

    // Начальное состояние
    saveState();
}

// Инициализация всех рисовалок
document.querySelectorAll('.draw-widget').forEach(widget => {
    initDrawingWidget(widget);
});

// ===== КАЛЬКУЛЯТОР =====
const calcDisplay = document.getElementById('calcDisplay');
const expressionDiv = calcDisplay.querySelector('.calc-expression');
const resultDiv = calcDisplay.querySelector('.calc-result');

let expression = '';
let result = '';

// Обновление дисплея
function updateDisplay() {
    expressionDiv.textContent = expression || '0';
    resultDiv.textContent = result || '';
}

// Добавление символа в выражение
function addToExpression(value) {
    expression += value;
    result = '';
    updateDisplay();
}

// Очистка всего
function clearAll() {
    expression = '';
    result = '';
    updateDisplay();
}

// Удаление последнего символа
function backspace() {
    expression = expression.slice(0, -1);
    result = '';
    updateDisplay();
}

// Обработка специальных функций
function handleFunction(func) {
    switch(func) {
        case 'sqrt':
            expression += 'sqrt(';
            break;
        case 'square':
            expression += '^2';
            break;
        case 'cube':
            expression += '^3';
            break;
        case 'pow':
            expression += '^';
            break;
        case 'sin':
            expression += 'sin(';
            break;
        case 'cos':
            expression += 'cos(';
            break;
        case 'tan':
            expression += 'tan(';
            break;
        case 'log':
            expression += 'log10(';
            break;
        case 'ln':
            expression += 'ln(';
            break;
        case 'exp':
            expression += 'e^(';
            break;
        case 'percent':
            expression += '%';
            break;
        case 'pi':
            expression += 'π';
            break;
    }
    result = '';
    updateDisplay();
}

// Конвертация градусов в радианы
function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Вычисление результата
function calculateResult() {
    if (!expression) {
        result = '';
        updateDisplay();
        return;
    }
    
    try {
        let calcExpression = expression
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/−/g, '-')
            .replace(/\^/g, '**')
            .replace(/π/g, 'Math.PI')
            .replace(/e\^\(/g, 'Math.exp(')
            .replace(/sqrt\(/g, 'Math.sqrt(')
            .replace(/log10\(/g, 'Math.log10(')
            .replace(/ln\(/g, 'Math.log(');
        
        // Обработка процентов
        calcExpression = calcExpression.replace(/(\d+\.?\d*)\s*\+\s*(\d+\.?\d*)%/g, '($1 + ($1 * $2/100))');
        calcExpression = calcExpression.replace(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)%/g, '($1 - ($1 * $2/100))');
        calcExpression = calcExpression.replace(/(\d+\.?\d*)\s*\*\s*(\d+\.?\d*)%/g, '($1 * ($2/100))');
        calcExpression = calcExpression.replace(/(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)%/g, '($1 / ($2/100))');
        calcExpression = calcExpression.replace(/(\d+\.?\d*)%/g, '($1/100)');
        
        // Обработка тригонометрических функций (перевод градусов в радианы)
        calcExpression = calcExpression.replace(/sin\(([^)]+)\)/g, (match, p1) => {
            return `Math.sin(${p1} * Math.PI / 180)`;
        });
        
        calcExpression = calcExpression.replace(/cos\(([^)]+)\)/g, (match, p1) => {
            return `Math.cos(${p1} * Math.PI / 180)`;
        });
        
        calcExpression = calcExpression.replace(/tan\(([^)]+)\)/g, (match, p1) => {
            return `Math.tan(${p1} * Math.PI / 180)`;
        });
        
        // Используем Function для безопасности
        const calculate = new Function('return ' + calcExpression);
        const calculatedResult = calculate();
        
        // Округляем до 10 знаков
        result = Number(calculatedResult.toFixed(10)).toString();
        updateDisplay();
    } catch (error) {
        result = 'ошибка';
        updateDisplay();
    }
}

// Обработчики для кнопок
document.querySelectorAll('.calc-btn[data-value]').forEach(btn => {
    btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        
        if (value === 'C') {
            clearAll();
        } else if (value === '=') {
            calculateResult();
        } else if (value === '←') {
            backspace();
        } else if (btn.classList.contains('function')) {
            handleFunction(value);
        } else {
            addToExpression(value);
        }
    });
});

// Инициализация
updateDisplay();

// ===== ПРИЛОЖЕНИЯ =====
let apps = JSON.parse(localStorage.getItem('apps')) || [
    { name: 'Яндекс Музыка', url: 'https://music.yandex.ru', emoji: '🎧' },
    { name: 'ChatGPT', url: 'https://chat.openai.com', emoji: '🤖' },
    { name: 'Telegram', url: 'https://t.me', emoji: '✈️' }
];

let selectedEmoji = '🎧'; // По умолчанию

// Сохраняем
function saveApps() {
    localStorage.setItem('apps', JSON.stringify(apps));
}

// Отрисовываем приложения
function renderApps() {
    const container = document.getElementById('appsCategories');
    if (!container) return;
    
    let html = '';
    
    apps.forEach((app, index) => {
        html += `
            <a href="${app.url}" target="_blank" class="app-card" data-name="${app.name.toLowerCase()}" data-index="${index}">
                <span class="app-icon">${app.emoji || '🔗'}</span>
                <span class="app-name">${app.name}</span>
                <button class="delete-app" onclick="deleteApp(event, ${index})">✕</button>
            </a>
        `;
    });
    
    html += `
        <div class="add-app-card" onclick="showAddAppModal()">
            <span class="add-icon">+</span>
            <span class="add-text">Добавить приложение</span>
        </div>
    `;
    
    container.innerHTML = html;
}

// Инициализация выбора смайликов
function initEmojiSelection() {
    const emojiBtns = document.querySelectorAll('.emoji-btn');
    emojiBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            emojiBtns.forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedEmoji = this.dataset.emoji;
        });
    });
}

// Показать модальное окно
window.showAddAppModal = function() {
    document.getElementById('appNameInput').value = '';
    document.getElementById('appUrlInput').value = '';
    document.getElementById('appModal').style.display = 'flex';
    
    // Сбрасываем выбор смайлика на первый
    setTimeout(() => {
        const emojiBtns = document.querySelectorAll('.emoji-btn');
        emojiBtns.forEach(b => b.classList.remove('selected'));
        if (emojiBtns[0]) {
            emojiBtns[0].classList.add('selected');
            selectedEmoji = emojiBtns[0].dataset.emoji;
        }
    }, 100);
};

// Закрыть модальное окно
window.closeAppModal = function() {
    document.getElementById('appModal').style.display = 'none';
};

// Добавить новое приложение
window.addNewApp = function() {
    let name = document.getElementById('appNameInput').value.trim();
    let url = document.getElementById('appUrlInput').value.trim();
    
    if (!name || !url) {
        alert('Заполните все поля');
        return;
    }
    
    // Добавляем https:// если нет
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    apps.push({ name, url, emoji: selectedEmoji });
    saveApps();
    renderApps();
    closeAppModal();
};

// Удалить приложение
window.deleteApp = function(event, index) {
    event.preventDefault();
    event.stopPropagation();
    
    apps.splice(index, 1);
    saveApps();
    renderApps();
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    renderApps();
    initEmojiSelection();
    
    // Закрытие модального окна при клике вне его
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('appModal');
        if (e.target === modal) {
            closeAppModal();
        }
    });
});

// ===== КОНВЕРТЕР =====
// Переключение вкладок
document.querySelectorAll('.converter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.converter-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.converter-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-converter`).classList.add('active');
    });
});

// Конвертер длины
const lengthInput = document.getElementById('length-input');
const lengthFrom = document.getElementById('length-from');
const lengthTo = document.getElementById('length-to');
const lengthOutput = document.getElementById('length-output');

function convertLength() {
    const value = parseFloat(lengthInput.value) || 0;
    const fromFactor = parseFloat(lengthFrom.value);
    const toFactor = parseFloat(lengthTo.value);
    
    // Переводим в метры, потом в нужную единицу
    const meters = value / fromFactor;
    lengthOutput.value = (meters * toFactor).toFixed(4);
}

lengthInput.addEventListener('input', convertLength);
lengthFrom.addEventListener('change', convertLength);
lengthTo.addEventListener('change', convertLength);

// Конвертер валют
const currencyInput = document.getElementById('currency-input');
const currencyFrom = document.getElementById('currency-from');
const currencyTo = document.getElementById('currency-to');
const currencyOutput = document.getElementById('currency-output');

function convertCurrency() {
    const value = parseFloat(currencyInput.value) || 0;
    const fromRate = parseFloat(currencyFrom.value);
    const toRate = parseFloat(currencyTo.value);
    
    // Переводим в рубли, потом в нужную валюту
    const rub = value / fromRate;
    currencyOutput.value = (rub * toRate).toFixed(2);
}

currencyInput.addEventListener('input', convertCurrency);
currencyFrom.addEventListener('change', convertCurrency);
currencyTo.addEventListener('change', convertCurrency);

// Конвертер веса
const weightInput = document.getElementById('weight-input');
const weightFrom = document.getElementById('weight-from');
const weightTo = document.getElementById('weight-to');
const weightOutput = document.getElementById('weight-output');

function convertWeight() {
    const value = parseFloat(weightInput.value) || 0;
    const fromFactor = parseFloat(weightFrom.value);
    const toFactor = parseFloat(weightTo.value);
    
    // Переводим в кг, потом в нужную единицу
    const kg = value / fromFactor;
    weightOutput.value = (kg * toFactor).toFixed(2);
}

weightInput.addEventListener('input', convertWeight);
weightFrom.addEventListener('change', convertWeight);
weightTo.addEventListener('change', convertWeight);

// Инициализация
convertLength();
convertCurrency();
convertWeight();

// ===== ПЛАНЫ =====
const plans = {
    day: JSON.parse(localStorage.getItem('dayTasks')) || [],
    week: JSON.parse(localStorage.getItem('weekTasks')) || [],
    month: JSON.parse(localStorage.getItem('monthTasks')) || [],
    year: JSON.parse(localStorage.getItem('yearTasks')) || []
};

// Переключение вкладок
document.querySelectorAll('.plans-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.plans-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.plan-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.plan}-plan`).classList.add('active');
    });
});

// Функция добавления задачи
window.addTask = function(period) {
    const input = document.getElementById(`${period}-input`);
    const text = input.value.trim();
    
    if (text) {
        plans[period].push({ text, completed: false });
        localStorage.setItem(`${period}Tasks`, JSON.stringify(plans[period]));
        input.value = '';
        renderTasks(period);
    }
};

// Функция переключения выполнения
window.toggleTask = function(period, index) {
    plans[period][index].completed = !plans[period][index].completed;
    localStorage.setItem(`${period}Tasks`, JSON.stringify(plans[period]));
    renderTasks(period);
};

// Функция удаления задачи
window.deleteTask = function(period, index) {
    plans[period].splice(index, 1);
    localStorage.setItem(`${period}Tasks`, JSON.stringify(plans[period]));
    renderTasks(period);
};

// Функция отрисовки
function renderTasks(period) {
    const list = document.getElementById(`${period}-tasks`);
    const progressBar = document.getElementById(`${period}Progress`);
    
    if (plans[period].length === 0) {
        list.innerHTML = '<div style="color: #5f748d; text-align: center; padding: 10px;">нет задач</div>';
        progressBar.style.width = '0%';
        return;
    }
    
    list.innerHTML = plans[period].map((task, index) => `
        <div class="plan-item">
            <input type="checkbox" class="plan-checkbox" ${task.completed ? 'checked' : ''} 
                   onchange="toggleTask('${period}', ${index})">
            <span class="plan-text ${task.completed ? 'completed' : ''}">${task.text}</span>
            <button class="plan-delete" onclick="deleteTask('${period}', ${index})">✕</button>
        </div>
    `).join('');
    
    // Считаем прогресс
    const completed = plans[period].filter(t => t.completed).length;
    const percent = (completed / plans[period].length) * 100;
    progressBar.style.width = `${percent}%`;
}

// Инициализация
renderTasks('day');
renderTasks('week');
renderTasks('month');
renderTasks('year');

// ===== ПЕРЕТАСКИВАНИЕ ВИДЖЕТОВ =====
const centerColumn = document.querySelector('.center-block .block-content');
let draggedWidget = null;
let indicator = null;

// Создаем индикатор
function createIndicator() {
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'drag-indicator';
        indicator.style.display = 'none';
        centerColumn.appendChild(indicator);
    }
    return indicator;
}

// Загружаем сохраненный порядок
function loadWidgetOrder() {
    if (!centerColumn) return;
    
    const order = JSON.parse(localStorage.getItem('widgetOrder'));
    if (!order || order.length === 0) return;
    
    const widgets = [...centerColumn.querySelectorAll('.notes-widget, .draw-widget, .calendar-widget, .tracker-widget')];
    
    const widgetMap = new Map();
    widgets.forEach(widget => {
        if (widget.classList.contains('notes-widget') || widget.classList.contains('draw-widget') || widget.classList.contains('tracker-widget')) {
            widgetMap.set(widget.dataset.widgetId, widget);
        } else {
            widgetMap.set(widget.classList[0], widget);
        }
    });
    
    order.forEach(id => {
        const widget = widgetMap.get(id);
        if (widget) {
            centerColumn.appendChild(widget);
        }
    });
    
    console.log('📊 Порядок загружен');
}

// Сохраняем порядок
function saveWidgetOrder() {
    if (!centerColumn) return;
    
    const widgets = [...centerColumn.querySelectorAll('.notes-widget, .draw-widget, .calendar-widget, .tracker-widget')];
    
    const order = widgets.map(w => {
        if (w.classList.contains('notes-widget') || w.classList.contains('draw-widget') || w.classList.contains('tracker-widget')) {
            return w.dataset.widgetId;
        }
        return w.classList[0];
    });
    
    localStorage.setItem('widgetOrder', JSON.stringify(order));
    console.log('💾 Порядок сохранен:', order);
}

// Делаем виджеты перетаскиваемыми
document.querySelectorAll('.notes-widget, .draw-widget, .plans-widget, .calendar-widget, .tracker-widget').forEach(widget => {
    widget.setAttribute('draggable', 'true');
    
    widget.addEventListener('dragstart', (e) => {
        draggedWidget = widget;
        widget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
        createIndicator();
    });
    
    widget.addEventListener('dragend', () => {
        widget.classList.remove('dragging');
        draggedWidget = null;
        if (indicator) indicator.style.display = 'none';
    });
});

// Разрешаем сброс в колонке
centerColumn.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedWidget || !indicator) return;
    
    const widgets = [...centerColumn.querySelectorAll('.notes-widget, .draw-widget, .plans-widget, .calendar-widget:not(.dragging)')];
    let insertBefore = null;
    
    for (let widget of widgets) {
        const rect = widget.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
            insertBefore = widget;
            break;
        }
    }
    
    indicator.style.display = 'block';
    
    if (insertBefore) {
        centerColumn.insertBefore(indicator, insertBefore);
    } else {
        centerColumn.appendChild(indicator);
    }
});

centerColumn.addEventListener('drop', (e) => {
    e.preventDefault();
    
    if (!draggedWidget || !indicator) return;
    
    centerColumn.insertBefore(draggedWidget, indicator);
    indicator.style.display = 'none';
    
    saveWidgetOrder();
});

// Загружаем порядок при старте
loadWidgetOrder();

// ===== КАЛЕНДАРЬ =====
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedColor = '#7aa2f7';

// Загружаем сохраненные заметки
let calendarNotes = JSON.parse(localStorage.getItem('calendarNotes')) || {};

// Элементы
const calendarGrid = document.getElementById('calendarGrid');
const monthYearDisplay = document.getElementById('currentMonthYear');

// Переключение месяцев
document.querySelector('.month-prev').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
});

document.querySelector('.month-next').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
});

// Выбор цвета
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedColor = btn.dataset.color === 'transparent' ? '' : btn.dataset.color;
    });
});

// Отрисовка календаря
function renderCalendar() {
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    
    monthYearDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Корректировка для понедельника (0 - воскресенье, 1 - понедельник)
    let startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    let html = '';
    
    // Пустые ячейки перед первым днем
    for (let i = 0; i < startOffset; i++) {
        html += '<div class="calendar-cell" style="visibility: hidden;"></div>';
    }
    
    // Ячейки с днями
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${currentYear}-${currentMonth + 1}-${day}`;
        const note = calendarNotes[dateKey] || '';
        const color = calendarNotes[`${dateKey}_color`] || '';
        
        html += `
            <div class="calendar-cell" data-date="${dateKey}" data-color="${color}" ondblclick="editNote('${dateKey}')">
                <div class="cell-date">${day}</div>
                <div class="cell-note">${note}</div>
            </div>
        `;
    }
    
    calendarGrid.innerHTML = html;
    
    // Добавляем обработчики для выбора даты
    document.querySelectorAll('.calendar-cell[data-date]').forEach(cell => {
        cell.addEventListener('click', () => {
            document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            
            const dateKey = cell.dataset.date;
            
            // Применяем цвет или убираем его
            if (selectedColor === '') {
                // Убираем цвет
                delete calendarNotes[`${dateKey}_color`];
                cell.removeAttribute('data-color');
            } else {
                // Устанавливаем цвет
                calendarNotes[`${dateKey}_color`] = selectedColor;
                cell.setAttribute('data-color', selectedColor);
            }
            
            localStorage.setItem('calendarNotes', JSON.stringify(calendarNotes));
        });
    });
}

// Функция редактирования заметки
window.editNote = function(dateKey) {
    const note = prompt('Заметка на этот день:', calendarNotes[dateKey] || '');
    if (note !== null) {
        calendarNotes[dateKey] = note;
        localStorage.setItem('calendarNotes', JSON.stringify(calendarNotes));
        renderCalendar();
    }
};

// Инициализация
renderCalendar();

// Активируем первый цвет по умолчанию
document.querySelector('.color-btn[data-color="#7aa2f7"]').classList.add('active');

// ======================== СМЕНА ТЕМЫ ==============================
document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Убираем active у всех
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        // Добавляем active текущей
        btn.classList.add('active');
        
        const theme = btn.dataset.theme;
        document.body.className = `theme-${theme}`;
        localStorage.setItem('theme', theme);
    });
});

// Загрузка сохраненной темы
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.body.className = `theme-${savedTheme}`;
    document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`)?.classList.add('active');
} else {
    document.querySelector('.theme-btn[data-theme="blue"]')?.classList.add('active');
}

// ===== ДОБАВЛЕНИЕ ВИДЖЕТОВ =====

// Функция для настройки drag-and-drop на виджете
function makeWidgetDraggable(widget) {
    widget.setAttribute('draggable', 'true');
    
    widget.addEventListener('dragstart', (e) => {
        draggedWidget = widget;
        widget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
        createIndicator();
    });
    
    widget.addEventListener('dragend', () => {
        widget.classList.remove('dragging');
        draggedWidget = null;
        if (indicator) indicator.style.display = 'none';
    });
}

const settingsBtn = document.getElementById('settingsBtn');
const widgetModal = document.getElementById('widgetModal');
const closeModal = document.getElementById('closeModal');
const centerBlock = document.querySelector('.center-block .block-content');

// Открыть модальное окно
settingsBtn.addEventListener('click', () => {
    widgetModal.classList.add('show');
});

// Закрыть модальное окно
closeModal.addEventListener('click', () => {
    widgetModal.classList.remove('show');
});

// Закрыть при клике вне окна
widgetModal.addEventListener('click', (e) => {
    if (e.target === widgetModal) {
        widgetModal.classList.remove('show');
    }
});

// ===== СОЗДАНИЕ НОВОГО ВИДЖЕТА ЗАМЕТКИ =====
function createNotesWidget() {
    const originalNotes = document.querySelector('.notes-widget');
    const newNotes = originalNotes.cloneNode(true);

    // Генерируем уникальный ID
    const widgetId = 'notes_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    newNotes.dataset.widgetId = widgetId;

    // Определяем номер для заголовка (следующий после существующих заметок)
    const existingNotes = widgetsCount.created.filter(w => w.type === 'notes').length;
    const widgetNumber = existingNotes + 1;

    const title = newNotes.querySelector('.notes-title-input');
    title.value = `Заметка №${widgetNumber}`;

    // Очищаем список заметок
    const notesList = newNotes.querySelector('.notes-list');
    notesList.innerHTML = '<div style="color: #5f748d; text-align: center; padding: 10px;">Нет заметок</div>';

    const noteInput = newNotes.querySelector('.note-input');
    noteInput.value = '';

    const addBtn = newNotes.querySelector('.add-note-btn');

    // Сохраняем пустые данные для нового виджета
    const widgetData = { notes: [], title: title.value };
    saveWidgetData(widgetId, widgetData);

    const deleteBtn = newNotes.querySelector('.delete-widget-btn');
    if (deleteBtn) {
        deleteBtn.onclick = function() { showDeleteConfirm(this); };
    }

    makeWidgetDraggable(newNotes);

    // Добавляем в список созданных
    widgetsCount.created.push({ type: 'notes', id: widgetId, title: title.value });
    widgetsCount.notes = widgetsCount.created.filter(w => w.type === 'notes').length;
    localStorage.setItem('widgetsCount', JSON.stringify(widgetsCount));

    return newNotes;
}

// ===== СОЗДАНИЕ НОВОГО ВИДЖЕТА РИСУНКА =====
function createDrawWidget() {
    const originalDraw = document.querySelector('.draw-widget');
    const newDraw = originalDraw.cloneNode(true);

    const widgetId = 'draw_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    newDraw.dataset.widgetId = widgetId;

    const existingDraw = widgetsCount.created.filter(w => w.type === 'draw').length;
    const widgetNumber = existingDraw + 1;

    const title = newDraw.querySelector('.draw-title-input');
    title.value = `Рисунок №${widgetNumber}`;

    // Сохраняем только заголовок (рисунок не сохраняем)
    saveWidgetData(widgetId, { title: title.value });

    const deleteBtn = newDraw.querySelector('.delete-widget-btn');
    if (deleteBtn) {
        deleteBtn.onclick = function() { showDeleteConfirm(this); };
    }

    makeWidgetDraggable(newDraw);

    widgetsCount.created.push({ type: 'draw', id: widgetId, title: title.value });
    widgetsCount.draw = widgetsCount.created.filter(w => w.type === 'draw').length;
    localStorage.setItem('widgetsCount', JSON.stringify(widgetsCount));

    return newDraw;
}

// Добавление виджета
document.querySelectorAll('.modal-item').forEach(item => {
    item.addEventListener('click', () => {
        const widgetType = item.dataset.widget;
        let newWidget;
        if (widgetType === 'notes') {
            newWidget = createNotesWidget();
        } else if (widgetType === 'draw') {
            newWidget = createDrawWidget();
        }
        if (newWidget) {
            centerBlock.insertBefore(newWidget, centerBlock.firstChild);
            // После добавления в DOM инициализируем
            if (widgetType === 'notes') {
                initNotesWidgetWithData(newWidget);
            } else if (widgetType === 'draw') {
                initDrawingWidget(newWidget);
            }
            
            // Сохраняем порядок после инициализации
            setTimeout(() => {
                saveWidgetOrder();
            }, 200);
            
            widgetModal.classList.remove('show');
        }
    });
});

// ===== МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ =====
(function() {
    // Удаляем активный класс с кнопок удаления
    function removeDeleteActiveClass() {
        document.querySelectorAll('.delete-active').forEach(el => el.classList.remove('delete-active'));
    }

    // Показываем модальное окно
    window.showModal = function(message, buttons) {
        const modal = document.getElementById('deleteModal');
        const messageEl = document.getElementById('modalMessage');
        const buttonsEl = document.getElementById('modalButtons');

        if (!modal) {
            console.error('Модальное окно не найдено!');
            return;
        }

        messageEl.textContent = message;
        buttonsEl.innerHTML = '';

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.text;
            let className = 'modal-btn';
            if (btn.primary) className += ' primary';
            if (btn.danger) className += ' danger';
            button.className = className;

            button.onclick = () => {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                    removeDeleteActiveClass();
                }, 300);
                if (btn.callback) btn.callback();
            };
            buttonsEl.appendChild(button);
        });

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    };

    // Удаление виджета
    window.showDeleteConfirm = function(btn) {
        const widget = btn.closest('.notes-widget, .draw-widget, .plans-widget, .calendar-widget');
        if (!widget) return;

        btn.classList.add('delete-active');

        const isNotes = widget.classList.contains('notes-widget');
        const isDraw = widget.classList.contains('draw-widget');
        const isPlans = widget.classList.contains('plans-widget');
        const isCalendar = widget.classList.contains('calendar-widget');

        const totalNotes = document.querySelectorAll('.notes-widget').length;
        const totalDraw = document.querySelectorAll('.draw-widget').length;
        const totalPlans = document.querySelectorAll('.plans-widget').length;
        const totalCalendar = document.querySelectorAll('.calendar-widget').length;

        let canDelete = true;
        if (isNotes && totalNotes <= 1) canDelete = false;
        if (isDraw && totalDraw <= 1) canDelete = false;
        if (isPlans && totalPlans <= 1) canDelete = false;
        if (isCalendar && totalCalendar <= 1) canDelete = false;

        // Получаем заголовок
        let title;
        if (isNotes || isDraw) {
            const titleInput = widget.querySelector('.notes-title-input, .draw-title-input');
            title = titleInput ? titleInput.value : 'этот виджет';
        } else if (isPlans) {
            const titleEl = widget.querySelector('.plans-title');
            title = titleEl ? titleEl.textContent : 'Планы';
        } else if (isCalendar) {
            const titleEl = widget.querySelector('.calendar-title');
            title = titleEl ? titleEl.textContent : 'Календарь';
        }

        if (!canDelete) {
            showModal('Нельзя удалить последний виджет.', [
                { text: 'Ок', primary: false, callback: null }
            ]);
            return;
        }

        showModal(`Удалить "${title}"?`, [
            { text: 'Да', primary: true, danger: true, callback: function() {
                const widgetId = widget.dataset.widgetId;
                if (widgetId) {
                    // Удаляем из created
                    widgetsCount.created = widgetsCount.created.filter(w => w.id !== widgetId);
                    widgetsCount.notes = widgetsCount.created.filter(w => w.type === 'notes').length;
                    widgetsCount.draw = widgetsCount.created.filter(w => w.type === 'draw').length;
                    localStorage.setItem('widgetsCount', JSON.stringify(widgetsCount));
                    // Удаляем данные
                    localStorage.removeItem(`widgetData_${widgetId}`);
                }

                widget.remove();

                if (typeof saveWidgetOrder === 'function') {
                    saveWidgetOrder();
                }
            }},
            { text: 'Нет', primary: false, callback: null }
        ]);
    };

    // Закрытие при клике на затемнённый фон
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('deleteModal');
        if (modal && e.target.classList.contains('modal-overlay')) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                removeDeleteActiveClass();
            }, 300);
        }
    });
})();

// ===== ВОССТАНОВЛЕНИЕ ВСЕХ ВИДЖЕТОВ =====
function restoreAllWidgets() {
    const centerBlock = document.querySelector('.center-block .block-content');
    if (!centerBlock) return;

    // Сохраняем ссылки на Календарь и Трекер
    const existingCalendar = document.querySelector('.calendar-widget');
    const existingTracker = document.querySelector('.tracker-widget');
    
    // Очищаем центр, но НЕ удаляем Календарь и Трекер
    const children = Array.from(centerBlock.children);
    children.forEach(child => {
        if (!child.classList.contains('drag-indicator') && 
            !child.classList.contains('calendar-widget') &&
            !child.classList.contains('tracker-widget')) {
            child.remove();
        }
    });

    // Восстанавливаем созданные виджеты (заметки и рисунки)
    widgetsCount.created.forEach(item => {
        let widget;
        if (item.type === 'notes') {
            widget = createNotesWidgetFromTemplate(item.id, item.title);
        } else if (item.type === 'draw') {
            widget = createDrawWidgetFromTemplate(item.id, item.title);
        }
        if (widget) {
            centerBlock.insertBefore(widget, existingTracker || existingCalendar || centerBlock.firstChild);
        }
    });

    // Загружаем порядок
    setTimeout(() => {
        loadWidgetOrder();
        // Переинициализируем трекер после загрузки порядка
        if (existingTracker) {
            initTracker();
        }
    }, 100);
}

// Шаблонные функции для создания из данных
function createNotesWidgetFromTemplate(id, title) {
    const template = `
        <div class="notes-widget" data-widget-id="${id}">
            <div class="notes-header">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <input type="text" class="notes-title-input" value="${title}">
                    <button class="delete-widget-btn" onclick="showDeleteConfirm(this)">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
            <div class="notes-list"></div>
            <div class="notes-footer">
                <input type="text" class="note-input" placeholder="Добавить заметку">
                <button class="add-note-btn">✓</button>
            </div>
        </div>
    `;
    const temp = document.createElement('div');
    temp.innerHTML = template.trim();
    const widget = temp.firstChild;
    makeWidgetDraggable(widget);
    // Инициализируем с загрузкой данных
    setTimeout(() => initNotesWidgetWithData(widget), 50);
    return widget;
}

function createDrawWidgetFromTemplate(id, title) {
    const template = `
        <div class="draw-widget" data-widget-id="${id}">
            <div class="draw-header">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <input type="text" class="draw-title-input" value="${title}">
                    <button class="delete-widget-btn" onclick="showDeleteConfirm(this)">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
            <div class="draw-canvas-container">
                <canvas width="500" height="300"></canvas>
                <div class="grid-overlay"></div>
            </div>
            <div class="draw-footer">
                <button class="draw-btn" id="clearCanvas">очистить</button>
                <div class="undo-redo">
                    <button class="draw-btn" id="undoBtn">←</button>
                    <button class="draw-btn" id="redoBtn">→</button>
                </div>
                <div class="draw-tools">
                    <button class="tool-btn active" data-color="#000000">●</button>
                    <button class="tool-btn" data-color="#7aa2f7">●</button>
                    <button class="tool-btn" data-color="#bb9af7">●</button>
                    <button class="tool-btn" data-color="#f28b82">●</button>
                    <button class="tool-btn" data-color="#98c379">●</button>
                </div>
            </div>
        </div>
    `;
    const temp = document.createElement('div');
    temp.innerHTML = template.trim();
    const widget = temp.firstChild;
    makeWidgetDraggable(widget);
    setTimeout(() => initDrawingWidget(widget), 50);
    return widget;
}

// Запускаем восстановление при загрузке
document.addEventListener('DOMContentLoaded', function() {
    restoreAllWidgets();
});

// ===== ПРОВЕРКА НАЛИЧИЯ ПЛАНОВ В ЛЕВОЙ КОЛОНКЕ =====
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const leftBlock = document.querySelector('.left-block .block-content');
        const existingPlans = document.querySelector('.plans-widget');
        
        // Если планы есть, но они не в левой колонке - перемещаем
        if (existingPlans && leftBlock) {
            if (!leftBlock.contains(existingPlans)) {
                leftBlock.appendChild(existingPlans);
                console.log('📋 Планы перемещены в левую колонку');
            }
        }
    }, 200);
});

// ===== ТРЕКЕР ПРИВЫЧЕК =====
let trackerData = JSON.parse(localStorage.getItem('trackerData')) || {
    title: 'Трекер привычек',
    habits: []
};

// Функция сохранения
function saveTrackerData() {
    localStorage.setItem('trackerData', JSON.stringify(trackerData));
}

// Функция обновления прогресс-бара
function updateTrackerProgress() {
    const progressBar = document.getElementById('trackerProgress');
    if (!progressBar) return;
    
    let totalDays = 0;
    let completedDays = 0;
    
    trackerData.habits.forEach(habit => {
        habit.days.forEach(completed => {
            totalDays++;
            if (completed) completedDays++;
        });
    });
    
    const percent = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
    progressBar.style.width = `${percent}%`;
}

// Функция отрисовки трекера
function renderTracker() {
    const tbody = document.getElementById('trackerBody');
    if (!tbody) return;
    
    // Заголовок
    const titleInput = document.querySelector('.tracker-title-input');
    if (titleInput) titleInput.value = trackerData.title;
    
    let html = '';
    
    if (trackerData.habits.length === 0) {
        // Показываем сообщение, если нет привычек
        html = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #5f748d; font-style: italic; white-space: normal; word-break: break-word; background: transparent;">
                    Нет привычек
                </td>
            </tr>
        `;
    } else {
        trackerData.habits.forEach((habit, habitIndex) => {
            html += '<tr>';
            html += `<td class="habit-name">
                        <span>${habit.name}</span>
                        <button class="delete-habit" onclick="deleteHabit(${habitIndex})">✕</button>
                    </td>`;
            
            habit.days.forEach((completed, dayIndex) => {
                html += `<td>
                            <div class="habit-cell ${completed ? 'completed' : ''}" 
                                 onclick="toggleDay(${habitIndex}, ${dayIndex})"></div>
                        </td>`;
            });
            
            html += '</tr>';
        });
    }
    
    tbody.innerHTML = html;
    updateTrackerProgress();
}

// Переключение дня
window.toggleDay = function(habitIndex, dayIndex) {
    trackerData.habits[habitIndex].days[dayIndex] = !trackerData.habits[habitIndex].days[dayIndex];
    saveTrackerData();
    renderTracker();
};

// Удаление привычки
window.deleteHabit = function(habitIndex) {
    trackerData.habits.splice(habitIndex, 1);
    saveTrackerData();
    renderTracker();
};

// Инициализация трекера
function initTracker() {
    const addBtn = document.getElementById('addTrackerBtn');
    const input = document.getElementById('newTrackerInput');
    const titleInput = document.querySelector('.tracker-title-input');
    
    if (addBtn && input) {
        addBtn.addEventListener('click', () => {
            const name = input.value.trim();
            if (name) {
                trackerData.habits.push({
                    name: name,
                    days: [false, false, false, false, false, false, false]
                });
                saveTrackerData();
                input.value = '';
                renderTracker();
            }
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addBtn.click();
        });
    }
    
    if (titleInput) {
        titleInput.addEventListener('blur', () => {
            trackerData.title = titleInput.value;
            saveTrackerData();
        });
    }
    
    renderTracker();
}

// Запускаем инициализацию после загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    // Если трекер существует на странице, инициализируем его
    if (document.querySelector('.tracker-widget')) {
        initTracker();
    }
});