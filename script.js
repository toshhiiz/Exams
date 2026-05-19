let allData = { ru: {}, en: {}, kz: {} };
let currentLanguage = 'ru';
let currentVariant = null;
let currentQuestion = 1;
let viewMode = 'single';

async function init() {
    await loadAllData();
    initI18next();
    setupEventListeners();
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
            allData[lang] = { variants: {} };
        }
    }
}

function initI18next() {
    i18next.init({
        lng: currentLanguage,
        debug: false,
        resources: {
            ru: {
                translation: {
                    'exam': 'Экзамен',
                    'questions': '360 вопросов - 9 вариантов по 40 вопросов',
                    'selectVariant': 'Выбрать вариант:',
                    'randomVariant': '🎲 Случайный вариант',
                    'questionNumber': 'Номер вопроса:',
                    'viewMode': 'Режим просмотра:',
                    'singleView': 'По одному',
                    'allQuestionsView': 'Все вопросы',
                    'selectVariantToStart': 'Выберите вариант для начала',
                    'totalQuestions': 'Всего вопросов',
                    'answered': 'Ответлено',
                    'progress': 'Прогресс',
                    'variant': 'Вариант',
                    'question': 'Вопрос'
                }
            },
            en: {
                translation: {
                    'exam': 'Exam',
                    'questions': '360 questions - 9 variants with 40 questions each',
                    'selectVariant': 'Select variant:',
                    'randomVariant': '🎲 Random variant',
                    'questionNumber': 'Question number:',
                    'viewMode': 'View mode:',
                    'singleView': 'One at a time',
                    'allQuestionsView': 'All questions',
                    'selectVariantToStart': 'Select a variant to start',
                    'totalQuestions': 'Total questions',
                    'answered': 'Answered',
                    'progress': 'Progress',
                    'variant': 'Variant',
                    'question': 'Question'
                }
            },
            kz: {
                translation: {
                    'exam': 'Емтихан',
                    'questions': '360 сұрақ - 9 нұсқа, әрқайсында 40 сұрақ',
                    'selectVariant': 'Нұсқа таңдау:',
                    'randomVariant': '🎲 Кездейсоқ нұсқа',
                    'questionNumber': 'Сұрақ нөмері:',
                    'viewMode': 'Көру режимі:',
                    'singleView': 'Бірі бірден',
                    'allQuestionsView': 'Барлық сұрақтар',
                    'selectVariantToStart': 'Басту үшін нұсқа таңдаңыз',
                    'totalQuestions': 'Барлығы сұрақтар',
                    'answered': 'Жауап берілді',
                    'progress': 'Прогресс',
                    'variant': 'Нұсқа',
                    'question': 'Сұрақ'
                }
            }
        }
    });
}

function setupEventListeners() {
    document.getElementById('variant').addEventListener('change', selectVariant);
    document.getElementById('questionNumber').addEventListener('change', loadQuestion);
    document.getElementById('languageSelect').addEventListener('change', changeLanguage);
}

function changeLanguage() {
    currentLanguage = document.getElementById('languageSelect').value;
    i18next.changeLanguage(currentLanguage);
    updatePageTranslations();
    if (currentVariant) {
        displayQuestions();
    } else {
        document.getElementById('content').innerHTML = `<div class="message info">${i18next.t('selectVariantToStart')}</div>`;
    }
    updateStats();
}

function updatePageTranslations() {
    document.querySelector('h1').textContent = i18next.t('exam');
    document.getElementById('pageSubtitle').textContent = i18next.t('questions');

    const labels = document.querySelectorAll('.control-group label');
    const buttons = document.querySelectorAll('.view-options button');

    labels[0].textContent = i18next.t('selectVariant');
    labels[1].textContent = i18next.t('questionNumber');

    if (document.querySelector('[data-stat="totalQuestions"]')) {
        document.querySelector('[data-stat="totalQuestions"]').textContent = i18next.t('totalQuestions');
        document.querySelector('[data-stat="answered"]').textContent = i18next.t('answered');
        document.querySelector('[data-stat="progress"]').textContent = i18next.t('progress');
    }
}

function selectVariant() {
    currentVariant = document.getElementById('variant').value;
    currentQuestion = 1;

    if (!currentVariant) {
        document.getElementById('content').innerHTML = `<div class="message info">${i18next.t('selectVariantToStart')}</div>`;
        return;
    }

    const questions = allData[currentLanguage].variants[currentVariant] || [];
    const questionInput = document.getElementById('questionNumber');
    questionInput.max = questions.length;
    questionInput.value = 1;

    displayQuestions();
}

function loadQuestion() {
    const num = parseInt(document.getElementById('questionNumber').value);
    if (num >= 1 && num <= (allData[currentLanguage].variants[currentVariant]?.length || 0)) {
        currentQuestion = num;
        displayQuestions();
    }
}

function displayQuestions() {
    if (!currentVariant) return;

    const questions = allData[currentLanguage].variants[currentVariant] || [];
    const content = document.getElementById('content');

    if (questions.length === 0) {
        content.innerHTML = `<div class="message info">${i18next.t('selectVariantToStart')}</div>`;
        return;
    }

    if (viewMode === 'single') {
        displaySingleQuestion(questions);
    } else {
        displayAllQuestions(questions);
    }

    updateStats();
}

function displaySingleQuestion(questions) {
    const q = questions[currentQuestion - 1];
    const content = document.getElementById('content');

    let answersHtml = '';
    q.a.forEach((ans, i) => {
        answersHtml += `
            <div class="answer-option">
                <input type="radio" name="answer" id="answer_${i}" value="${i}">
                <label for="answer_${i}">${ans}</label>
            </div>
        `;
    });

    content.innerHTML = `
        <div class="question-block">
            <div class="question-number">${i18next.t('question')} ${currentQuestion}/${questions.length}</div>
            <div class="question-text">${q.q}</div>
            <div class="answers">${answersHtml}</div>
            <button class="check-button" onclick="checkAnswer(${q.c})">Проверить ответ</button>
        </div>
        <div class="pagination">
            <button onclick="previousQuestion()" ${currentQuestion === 1 ? 'disabled' : ''}>← Предыдущий</button>
            <button onclick="nextQuestion()" ${currentQuestion === questions.length ? 'disabled' : ''}>Следующий →</button>
        </div>
    `;
}

function displayAllQuestions(questions) {
    const content = document.getElementById('content');
    let html = '';

    questions.forEach((q, idx) => {
        let answersHtml = '';
        q.a.forEach((ans) => {
            answersHtml += `<div class="answer-option"><label>${ans}</label></div>`;
        });

        html += `
            <div class="question-block">
                <div class="question-number">${i18next.t('question')} ${idx + 1}</div>
                <div class="question-text">${q.q}</div>
                <div class="answers">${answersHtml}</div>
            </div>
        `;
    });

    content.innerHTML = html;
}

function previousQuestion() {
    if (currentQuestion > 1) {
        currentQuestion--;
        document.getElementById('questionNumber').value = currentQuestion;
        displayQuestions();
    }
}

function nextQuestion() {
    const questions = allData[currentLanguage].variants[currentVariant] || [];
    if (currentQuestion < questions.length) {
        currentQuestion++;
        document.getElementById('questionNumber').value = currentQuestion;
        displayQuestions();
    }
}

function setViewMode(mode) {
    viewMode = mode;
    document.getElementById('viewSingle').classList.toggle('active', mode === 'single');
    document.getElementById('viewAll').classList.toggle('active', mode === 'all');
    displayQuestions();
}

function checkAnswer(correctIndex) {
    const selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) return;

    const resultDiv = document.createElement('div');
    const isCorrect = parseInt(selected.value) === correctIndex;
    resultDiv.className = `result-message ${isCorrect ? 'correct' : 'incorrect'}`;
    resultDiv.textContent = isCorrect ? '✓ Правильно!' : '✗ Неправильно!';

    const questionBlock = document.querySelector('.question-block');
    const existingResult = questionBlock.querySelector('.result-message');
    if (existingResult) existingResult.remove();
    questionBlock.appendChild(resultDiv);
}

function selectRandomVariant() {
    const variants = Object.keys(allData[currentLanguage].variants || {});
    if (variants.length > 0) {
        const random = variants[Math.floor(Math.random() * variants.length)];
        document.getElementById('variant').value = random;
        selectVariant();
    }
}

function updateStats() {
    const totalQuestions = Object.values(allData[currentLanguage].variants || {})
        .reduce((sum, v) => sum + v.length, 0);

    document.getElementById('totalQuestions').textContent = totalQuestions;
    document.getElementById('answered').textContent = '0';
    document.getElementById('progress').textContent = '0%';
}

function increaseQuestion() {
    const input = document.getElementById('questionNumber');
    const current = parseInt(input.value) || 1;
    const max = parseInt(input.max) || 40;
    if (current < max) {
        input.value = current + 1;
        loadQuestion();
    }
}

function decreaseQuestion() {
    const input = document.getElementById('questionNumber');
    const current = parseInt(input.value) || 1;
    const min = parseInt(input.min) || 1;
    if (current > min) {
        input.value = current - 1;
        loadQuestion();
    }
}

init();
