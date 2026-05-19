let allData = { ru: {}, en: {}, kz: {} };
let currentLanguage = 'ru';
let currentVariant = null;
let currentQuestion = null;

async function init() {
    await loadAllData();
    populateVariants();
    updateStats();
}

async function loadAllData() {
    const files = { ru: 'locales/ru.json', en: 'locales/eng.json', kz: 'locales/kz.json' };

    for (const [lang, file] of Object.entries(files)) {
        try {
            // Сначала пытаемся загрузить сохранённые данные из localStorage
            const savedData = localStorage.getItem(`examData_${lang}`);
            if (savedData) {
                allData[lang] = JSON.parse(savedData);
            } else {
                // Если нет сохранённых данных, загружаем из JSON файла
                const response = await fetch(file);
                allData[lang] = await response.json();
            }
        } catch (e) {
            console.error(`Failed to load ${file}:`, e);
            allData[lang] = { ui: {}, variants: {} };
        }
    }
}

function populateVariants() {
    const select = document.getElementById('variantSelect');
    const variants = Object.keys(allData[currentLanguage].variants || {}).sort((a, b) => parseInt(a) - parseInt(b));

    select.innerHTML = '<option value="">Выберите вариант</option>';
    variants.forEach(v => {
        const option = document.createElement('option');
        option.value = v;
        option.textContent = `Вариант ${v}`;
        select.appendChild(option);
    });
}

function loadVariant() {
    currentVariant = document.getElementById('variantSelect').value;
    currentQuestion = null;
    const select = document.getElementById('questionSelect');

    if (!currentVariant) {
        select.innerHTML = '<option value="">Выберите вопрос</option>';
        renderEditor();
        return;
    }

    const questions = allData[currentLanguage].variants[currentVariant];
    select.innerHTML = '<option value="">Выберите вопрос</option>';

    questions.forEach((q, i) => {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Вопрос ${i + 1}`;
        select.appendChild(option);
    });

    renderEditor();
}

function loadQuestion() {
    currentQuestion = document.getElementById('questionSelect').value;
    if (currentQuestion !== '') {
        currentQuestion = parseInt(currentQuestion);
    }
    renderEditor();
}

function renderEditor() {
    const content = document.getElementById('editorContent');

    if (!currentVariant || currentQuestion === null || currentQuestion === '') {
        content.innerHTML = '<div class="no-data">Выберите вопрос для редактирования</div>';
        return;
    }

    const question = allData[currentLanguage].variants[currentVariant][currentQuestion];

    let answersHtml = '';
    question.a.forEach((ans, i) => {
        const isCorrect = i === question.c;
        answersHtml += `
            <div class="answer-item ${isCorrect ? 'correct' : ''}">
                <input type="text" value="${ans}" id="answer_${i}"
                    onchange="updateAnswer(${i})">
                <div class="answer-controls">
                    <button class="btn-correct" onclick="setCorrectAnswer(${i})">
                        ${isCorrect ? '✓ Правильный' : 'Выбрать правильным'}
                    </button>
                    ${question.a.length > 2 ? `<button class="btn-delete" onclick="deleteAnswer(${i})">Удалить</button>` : ''}
                </div>
            </div>
        `;
    });

    content.innerHTML = `
        <h2>Вопрос ${currentQuestion + 1}, Вариант ${currentVariant}</h2>

        <div class="language-tabs">
            <button ${currentLanguage === 'ru' ? 'class="active"' : ''} onclick="switchLanguage('ru')">Русский</button>
            <button ${currentLanguage === 'en' ? 'class="active"' : ''} onclick="switchLanguage('en')">English</button>
            <button ${currentLanguage === 'kz' ? 'class="active"' : ''} onclick="switchLanguage('kz')">Қазақша</button>
        </div>

        <div class="form-group">
            <label>Вопрос</label>
            <textarea id="questionText" onchange="updateQuestion()">${question.q}</textarea>
        </div>

        <div class="answers-section">
            <h3>Ответы</h3>
            ${answersHtml}
        </div>

        <button class="btn-success" onclick="addAnswer()" style="width: 100%; padding: 12px; margin-bottom: 20px;">+ Добавить ответ</button>

        <div class="form-actions">
            <button class="btn-primary" onclick="saveQuestion()">💾 Сохранить</button>
            <button class="btn-secondary" onclick="deleteQuestion()">Удалить вопрос</button>
        </div>
    `;
}

function switchLanguage(lang) {
    currentLanguage = lang;
    const buttons = document.querySelectorAll('.language-tabs button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Находим кнопку с нужным языком и активируем её
    buttons.forEach(btn => {
        const btnText = btn.textContent.toLowerCase();
        if ((lang === 'ru' && btnText.includes('русский')) ||
            (lang === 'en' && btnText.includes('english')) ||
            (lang === 'kz' && btnText.includes('қазақша'))) {
            btn.classList.add('active');
        }
    });
    
    updateStats();
    renderEditor();
}

function updateQuestion() {
    const text = document.getElementById('questionText').value;
    allData[currentLanguage].variants[currentVariant][currentQuestion].q = text;
}

function updateAnswer(index) {
    const text = document.getElementById(`answer_${index}`).value;
    allData[currentLanguage].variants[currentVariant][currentQuestion].a[index] = text;
}

function setCorrectAnswer(index) {
    allData[currentLanguage].variants[currentVariant][currentQuestion].c = index;
    renderEditor();
}

function addAnswer() {
    const question = allData[currentLanguage].variants[currentVariant][currentQuestion];
    question.a.push('Новый ответ');
    renderEditor();
}

function deleteAnswer(index) {
    const question = allData[currentLanguage].variants[currentVariant][currentQuestion];
    if (question.a.length > 2) {
        question.a.splice(index, 1);
        if (question.c === index) {
            question.c = 0;
        } else if (question.c > index) {
            question.c--;
        }
        renderEditor();
    } else {
        showMessage('Должно быть минимум 2 ответа', 'error');
    }
}

function deleteQuestion() {
    if (confirm(`Вы уверены, что хотите удалить вопрос ${currentQuestion + 1}?`)) {
        allData[currentLanguage].variants[currentVariant].splice(currentQuestion, 1);
        currentQuestion = null;
        loadVariant();
        saveAllData();
        showMessage('Вопрос удалён', 'success');
    }
}

function addNewQuestion() {
    if (!currentVariant) {
        showMessage('Выберите вариант для добавления вопроса', 'error');
        return;
    }

    const newQuestion = {
        q: 'Новый вопрос',
        a: ['Ответ 1', 'Ответ 2'],
        c: 0
    };

    allData[currentLanguage].variants[currentVariant].push(newQuestion);
    loadVariant();
    const select = document.getElementById('questionSelect');
    select.value = allData[currentLanguage].variants[currentVariant].length - 1;
    loadQuestion();
    saveAllData();
    showMessage('Вопрос добавлен', 'success');
}

function saveQuestion() {
    saveAllData();
    showMessage('✓ Все изменения сохранены', 'success');
}

function saveAllData() {
    for (const lang of ['ru', 'en', 'kz']) {
        localStorage.setItem(`examData_${lang}`, JSON.stringify(allData[lang]));
    }
}

function exportData() {
    const dataToExport = allData;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport, null, 2)));
    element.setAttribute('download', `exam_backup_${new Date().toISOString().slice(0, 10)}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showMessage('✓ Данные экспортированы', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            allData = imported;
            saveAllData();
            populateVariants();
            showMessage('✓ Данные импортированы успешно', 'success');
        } catch (err) {
            showMessage('✗ Ошибка при импорте файла', 'error');
        }
    };
    reader.readAsText(file);
}

function resetToDefault() {
    if (confirm('Вы уверены? Это вернёт данные в исходное состояние. Это действие нельзя отменить!')) {
        localStorage.clear();
        location.reload();
    }
}

function updateStats() {
    const variantCount = Object.keys(allData[currentLanguage].variants).length;
    let totalQuestions = 0;
    Object.values(allData[currentLanguage].variants).forEach(v => {
        totalQuestions += v.length;
    });
    const languageCount = Object.keys(allData).length;

    document.getElementById('statVariants').textContent = variantCount;
    document.getElementById('statQuestions').textContent = totalQuestions;
    document.getElementById('statLanguages').textContent = languageCount;
    document.getElementById('stats').style.display = 'grid';
}

function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    setTimeout(() => {
        messageEl.className = 'message';
    }, 3000);
}

init();
