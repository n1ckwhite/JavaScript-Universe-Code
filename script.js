class CodePlayground {
    constructor() {
        this.editor = null;
        this.currentLanguage = 'javascript';
        this.outputElement = document.getElementById('output');
        this.languageSelect = document.getElementById('languageSelect');
        this.runBtn = document.getElementById('runBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.clearOutputBtn = document.getElementById('clearOutputBtn');
        this.autoRunToggle = document.getElementById('autoRunToggle');
        
        this.autoRunTimeout = null;
        this.autoRunDelay = 1000; // 1 секунда задержки
        this.autoCompleteTimeout = null;
        this.autoCompleteDelay = 300; // 300ms задержка для автодополнения
        
        this.initEditor();
        this.bindEvents();
        this.loadDefaultCode();
    }

    initEditor() {
        const textarea = document.getElementById('codeEditor');
        
        this.editor = CodeMirror.fromTextArea(textarea, {
            mode: this.currentLanguage === 'typescript' ? 'text/typescript' : 'javascript',
            theme: 'monokai',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 2,
            tabSize: 2,
            lineWrapping: true,
            foldGutter: true,
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'CodeMirror-lint-markers'],
            styleActiveLine: true,
            lint: true,
            extraKeys: {
                'Ctrl-Enter': () => this.runCode(),
                'Cmd-Enter': () => this.runCode(),
                'Ctrl-Space': (cm) => this.showContextualHints(cm),
                'Cmd-Space': (cm) => this.showContextualHints(cm),
                'Tab': (cm) => this.showContextualHints(cm),
                'Enter': (cm) => this.handleEnter(cm),
                'Escape': (cm) => this.hideHints(cm)
            }
        });

        // Устанавливаем размер редактора
        setTimeout(() => {
            this.editor.refresh();
        }, 100);
    }

    bindEvents() {
        this.runBtn.addEventListener('click', () => this.runCode());
        this.clearBtn.addEventListener('click', () => this.clearEditor());
        this.clearOutputBtn.addEventListener('click', () => this.clearOutput());
        this.languageSelect.addEventListener('change', (e) => this.switchLanguage(e.target.value));
        this.autoRunToggle.addEventListener('change', (e) => {
            if (!e.target.checked) {
                this.clearAutoRunTimeout();
            }
        });
        
        // Автоматический запуск при изменении кода
        this.editor.on('change', (cm, change) => {
            this.scheduleAutoRun();
            this.scheduleAutoComplete();
        });
        
        // Скрываем подсказки при клике вне редактора
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.inline-hints') && !e.target.closest('.CodeMirror')) {
                this.hideInlineHints();
            }
        });
        
        // Обработка ошибок
        window.addEventListener('error', (e) => {
            this.logError(e.error || e.message);
        });
    }

    switchLanguage(language) {
        this.currentLanguage = language;
        this.editor.setOption('mode', language === 'typescript' ? 'text/typescript' : 'javascript');
        
        if (language === 'typescript') {
            this.loadTypeScriptExample();
        } else {
            this.loadJavaScriptExample();
        }
    }

    scheduleAutoRun() {
        if (!this.autoRunToggle.checked) return;
        
        this.clearAutoRunTimeout();
        this.autoRunTimeout = setTimeout(() => {
            this.runCode();
        }, this.autoRunDelay);
    }

    clearAutoRunTimeout() {
        if (this.autoRunTimeout) {
            clearTimeout(this.autoRunTimeout);
            this.autoRunTimeout = null;
        }
    }

    scheduleAutoComplete() {
        this.clearAutoCompleteTimeout();
        this.autoCompleteTimeout = setTimeout(() => {
            this.showContextualHints(this.editor);
        }, this.autoCompleteDelay);
    }

    clearAutoCompleteTimeout() {
        if (this.autoCompleteTimeout) {
            clearTimeout(this.autoCompleteTimeout);
            this.autoCompleteTimeout = null;
        }
    }

    handleEnter(cm) {
        // Если открыты встроенные подсказки, выберите активную
        const hints = document.querySelector('.inline-hints');
        if (hints) {
            const activeItem = hints.querySelector('.hint-item.active');
            if (activeItem) {
                const hintText = activeItem.dataset.hint;
                // Вставляем подсказку
                const cursor = cm.getCursor();
                const line = cm.getLine(cursor.line);
                const beforeCursor = line.substring(0, cursor.ch);
                const dotIndex = beforeCursor.lastIndexOf('.');
                if (dotIndex !== -1) {
                    const startPos = { line: cursor.line, ch: dotIndex + 1 };
                    const endPos = cursor;
                    this.insertHint(cm, hintText, startPos, endPos);
                    this.hideInlineHints();
                }
                return CodeMirror.Pass;
            }
        }
        return CodeMirror.Pass;
    }

    hideHints(cm) {
        this.hideInlineHints();
        return CodeMirror.Pass;
    }

    showContextualHints(cm) {
        const cursor = cm.getCursor();
        const line = cm.getLine(cursor.line);
        const context = this.getContext(line, cursor.ch);
        
        // Отладочная информация
        console.log('Cursor position:', cursor);
        console.log('Current line:', line);
        console.log('Context:', context);
        
        // Проверяем, нужно ли показывать подсказки
        if (!this.shouldShowHints(line, cursor.ch)) {
            this.hideInlineHints();
            return;
        }
        
        let hints = [];
        
        // Контекстные подсказки для массивов
        if (context.object === 'Array') {
            hints = this.getArrayMethods();
            console.log('Showing Array methods:', hints.length);
        }
        // Контекстные подсказки для строк
        else if (context.object === 'String') {
            hints = this.getStringMethods();
            console.log('Showing String methods:', hints.length);
        }
        // Контекстные подсказки для объектов
        else if (context.object === 'Object') {
            hints = this.getObjectMethods();
            console.log('Showing Object methods:', hints.length);
        }
        // Контекстные подсказки для чисел
        else if (context.object === 'Number') {
            hints = this.getNumberMethods();
            console.log('Showing Number methods:', hints.length);
        }
        // Контекстные подсказки для функций
        else if (context.object === 'Function') {
            hints = this.getFunctionMethods();
            console.log('Showing Function methods:', hints.length);
        }
        // Контекстные подсказки для булевых значений
        else if (context.object === 'Boolean') {
            hints = this.getBooleanMethods();
            console.log('Showing Boolean methods:', hints.length);
        }
        // Общие подсказки
        else {
            hints = this.getGeneralHints();
            console.log('Showing General methods:', hints.length);
        }
        
        // Фильтруем по текущему вводу
        const currentWord = this.getCurrentWord(cm, cursor);
        if (currentWord) {
            hints = hints.filter(hint => 
                hint.text.toLowerCase().includes(currentWord.toLowerCase())
            );
        }
        
        if (hints.length > 0) {
            this.showInlineHints(cm, hints, context);
        } else {
            this.hideInlineHints();
        }
    }

    showInlineHints(cm, hints, context) {
        this.hideInlineHints();
        
        const cursor = cm.getCursor();
        const line = cm.getLine(cursor.line);
        const beforeCursor = line.substring(0, cursor.ch);
        const dotIndex = beforeCursor.lastIndexOf('.');
        
        if (dotIndex === -1) return;
        
        const startPos = { line: cursor.line, ch: dotIndex + 1 };
        const endPos = cursor;
        
        // Создаем элемент для подсказок
        const hintsElement = document.createElement('div');
        hintsElement.className = 'inline-hints';
        hintsElement.innerHTML = `
            <div class="hints-header">
                <span class="hint-type">${this.getTypeName(context.object)}</span>
                <span class="hint-count">${hints.length} методов</span>
            </div>
            <div class="hints-list">
                ${hints.slice(0, 8).map((hint, index) => `
                    <div class="hint-item ${index === 0 ? 'active' : ''}" data-hint="${hint.text}">
                        <span class="hint-icon ${context.object.toLowerCase()}"></span>
                        <span class="hint-text">${hint.text}</span>
                        <span class="hint-description">${hint.displayText}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Добавляем в DOM
        document.body.appendChild(hintsElement);
        
        // Позиционируем относительно курсора
        const coords = cm.cursorCoords(cursor);
        hintsElement.style.left = (coords.left + 20) + 'px';
        hintsElement.style.top = (coords.bottom + 5) + 'px';
        
        // Добавляем обработчики событий
        this.addInlineHintsEvents(cm, hintsElement, hints, startPos, endPos);
        
        // Сохраняем ссылку для последующего удаления
        this.currentInlineHints = hintsElement;
    }

    hideInlineHints() {
        if (this.currentInlineHints) {
            this.currentInlineHints.remove();
            this.currentInlineHints = null;
        }
    }

    addInlineHintsEvents(cm, hintsElement, hints, startPos, endPos) {
        const hintItems = hintsElement.querySelectorAll('.hint-item');
        let activeIndex = 0;
        
        // Обработчик клика
        hintItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                const hintText = item.dataset.hint;
                this.insertHint(cm, hintText, startPos, endPos);
                this.hideInlineHints();
            });
            
            item.addEventListener('mouseenter', () => {
                hintItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                activeIndex = index;
            });
        });
        
        // Обработчик клавиатуры
        const handleKeydown = (e) => {
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    activeIndex = (activeIndex + 1) % hintItems.length;
                    hintItems.forEach(i => i.classList.remove('active'));
                    hintItems[activeIndex].classList.add('active');
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    activeIndex = (activeIndex - 1 + hintItems.length) % hintItems.length;
                    hintItems.forEach(i => i.classList.remove('active'));
                    hintItems[activeIndex].classList.add('active');
                    break;
                case 'Enter':
                case 'Tab':
                    e.preventDefault();
                    const activeItem = hintItems[activeIndex];
                    if (activeItem) {
                        const hintText = activeItem.dataset.hint;
                        this.insertHint(cm, hintText, startPos, endPos);
                        this.hideInlineHints();
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.hideInlineHints();
                    break;
            }
        };
        
        document.addEventListener('keydown', handleKeydown, { once: true });
        
        // Удаляем обработчик при скрытии подсказок
        hintsElement.addEventListener('remove', () => {
            document.removeEventListener('keydown', handleKeydown);
        });
    }

    insertHint(cm, hintText, startPos, endPos) {
        cm.replaceRange(hintText, startPos, endPos);
        cm.setCursor({ line: startPos.line, ch: startPos.ch + hintText.length });
    }

    getTypeName(type) {
        const names = {
            'Array': 'Массив',
            'String': 'Строка', 
            'Object': 'Объект',
            'Number': 'Число',
            'Function': 'Функция',
            'Boolean': 'Булево',
            'General': 'Общие'
        };
        return names[type] || type;
    }

    shouldShowHints(line, pos) {
        const beforeCursor = line.substring(0, pos);
        
        // Показываем подсказки только после точки
        if (beforeCursor.match(/\.\s*$/)) {
            return true;
        }
        
        // Показываем подсказки для общих функций в начале строки
        if (beforeCursor.match(/^\s*\w*$/)) {
            return true;
        }
        
        return false;
    }

    // Добавляем отладочную информацию
    debugContext(line, pos) {
        const context = this.getContext(line, pos);
        console.log('Context:', context);
        return context;
    }

    getContext(line, pos) {
        const beforeCursor = line.substring(0, pos);
        
        // Проверяем контекст после точки
        if (beforeCursor.match(/\.\s*$/)) {
            const match = beforeCursor.match(/(\w+)\s*\.\s*$/);
            if (match) {
                const varName = match[1];
                return this.determineVariableType(varName, line);
            }
        }
        
        // Проверяем контекст в начале строки
        if (beforeCursor.match(/^\s*\w*$/)) {
            return { object: 'General' };
        }
        
        return { object: 'General' };
    }

    determineVariableType(varName, currentLine) {
        // Получаем весь код для анализа
        const code = this.editor.getValue();
        const lines = code.split('\n');
        const currentLineIndex = this.editor.getCursor().line;
        
        // Ищем объявление переменной
        for (let i = currentLineIndex; i >= 0; i--) {
            const line = lines[i];
            
            // Ищем объявление переменной (JavaScript и TypeScript)
            const varMatch = line.match(new RegExp(`(?:const|let|var)\\s+${varName}\\s*:\\s*(.+?)\\s*=\\s*(.+)`)); // TypeScript с типом
            const jsVarMatch = line.match(new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*(.+)`)); // JavaScript без типа
            
            if (varMatch) {
                // TypeScript с типом
                const type = varMatch[1].trim();
                const value = varMatch[2].trim();
                
                // Определяем тип по TypeScript типу
                if (type.includes('[]') || type.includes('Array<') || type.includes('ReadonlyArray<')) {
                    return { object: 'Array' };
                }
                if (type.includes('string') || type.includes('String')) {
                    return { object: 'String' };
                }
                if (type.includes('number') || type.includes('Number')) {
                    return { object: 'Number' };
                }
                if (type.includes('Function') || type.includes('=>')) {
                    return { object: 'Function' };
                }
                if (type.includes('object') || type.includes('Object') || type.includes('interface')) {
                    return { object: 'Object' };
                }
                if (type.includes('boolean') || type.includes('Boolean')) {
                    return { object: 'Boolean' };
                }
                
                // Определяем по значению как fallback
                return this.determineTypeByValue(value);
            } else if (jsVarMatch) {
                // JavaScript без типа
                const value = jsVarMatch[1].trim();
                return this.determineTypeByValue(value);
            }
        }
        
        // Если не нашли объявление, используем эвристику по имени
        return this.determineTypeByName(varName);
    }

    determineTypeByValue(value) {
        if (value.match(/^\[.*\]$/)) {
            return { object: 'Array' };
        }
        if (value.match(/^['"`].*['"`]$/)) {
            return { object: 'String' };
        }
        if (value.match(/^\d+(\.\d+)?$/)) {
            return { object: 'Number' };
        }
        if (value.match(/^function\s*\(/)) {
            return { object: 'Function' };
        }
        if (value.match(/^\{.*\}$/)) {
            return { object: 'Object' };
        }
        if (value.match(/^(true|false)$/)) {
            return { object: 'Boolean' };
        }
        if (value.match(/^new\s+Array\(/)) {
            return { object: 'Array' };
        }
        if (value.match(/^new\s+String\(/)) {
            return { object: 'String' };
        }
        if (value.match(/^new\s+Number\(/)) {
            return { object: 'Number' };
        }
        if (value.match(/^new\s+Object\(/)) {
            return { object: 'Object' };
        }
        if (value.match(/^new\s+Boolean\(/)) {
            return { object: 'Boolean' };
        }
        
        return { object: 'Object' };
    }

    determineTypeByName(varName) {
        if (varName.includes('array') || varName.includes('arr') || varName.includes('list') || 
            varName.includes('items') || varName.includes('elements') || varName.includes('data')) {
            return { object: 'Array' };
        }
        if (varName.includes('str') || varName.includes('text') || varName.includes('message') || 
            varName.includes('name') || varName.includes('title') || varName.includes('content')) {
            return { object: 'String' };
        }
        if (varName.includes('num') || varName.includes('count') || varName.includes('index') || 
            varName.includes('id') || varName.includes('age') || varName.includes('price')) {
            return { object: 'Number' };
        }
        if (varName.includes('func') || varName.includes('fn') || varName.includes('callback')) {
            return { object: 'Function' };
        }
        if (varName.includes('bool') || varName.includes('flag') || varName.includes('is')) {
            return { object: 'Boolean' };
        }
        if (varName.includes('obj') || varName.includes('user') || varName.includes('config') || 
            varName.includes('data') || varName.includes('settings')) {
            return { object: 'Object' };
        }
        
        return { object: 'Object' };
    }

    getCurrentWord(cm, cursor) {
        const line = cm.getLine(cursor.line);
        const beforeCursor = line.substring(0, cursor.ch);
        const match = beforeCursor.match(/\w+$/);
        return match ? match[0] : '';
    }

    getArrayMethods() {
        return [
            { text: 'push()', displayText: 'добавить элемент в конец' },
            { text: 'pop()', displayText: 'удалить последний элемент' },
            { text: 'shift()', displayText: 'удалить первый элемент' },
            { text: 'unshift()', displayText: 'добавить элемент в начало' },
            { text: 'slice()', displayText: 'извлечь часть массива' },
            { text: 'splice()', displayText: 'изменить массив' },
            { text: 'concat()', displayText: 'объединить массивы' },
            { text: 'join()', displayText: 'объединить в строку' },
            { text: 'reverse()', displayText: 'перевернуть массив' },
            { text: 'sort()', displayText: 'отсортировать' },
            { text: 'filter()', displayText: 'отфильтровать элементы' },
            { text: 'map()', displayText: 'преобразовать элементы' },
            { text: 'reduce()', displayText: 'свернуть массив' },
            { text: 'forEach()', displayText: 'перебрать элементы' },
            { text: 'find()', displayText: 'найти первый элемент' },
            { text: 'findIndex()', displayText: 'найти индекс элемента' },
            { text: 'includes()', displayText: 'проверить наличие' },
            { text: 'indexOf()', displayText: 'найти индекс' },
            { text: 'length', displayText: 'длина массива' }
        ];
    }

    getStringMethods() {
        return [
            { text: 'charAt()', displayText: 'получить символ по индексу' },
            { text: 'charCodeAt()', displayText: 'получить код символа' },
            { text: 'concat()', displayText: 'объединить строки' },
            { text: 'includes()', displayText: 'проверить наличие' },
            { text: 'indexOf()', displayText: 'найти позицию' },
            { text: 'lastIndexOf()', displayText: 'найти последнюю позицию' },
            { text: 'match()', displayText: 'найти совпадения' },
            { text: 'replace()', displayText: 'заменить' },
            { text: 'search()', displayText: 'найти позицию' },
            { text: 'slice()', displayText: 'извлечь часть строки' },
            { text: 'split()', displayText: 'разделить на массив' },
            { text: 'substring()', displayText: 'извлечь подстроку' },
            { text: 'toLowerCase()', displayText: 'в нижний регистр' },
            { text: 'toUpperCase()', displayText: 'в верхний регистр' },
            { text: 'trim()', displayText: 'убрать пробелы' },
            { text: 'trimStart()', displayText: 'убрать пробелы в начале' },
            { text: 'trimEnd()', displayText: 'убрать пробелы в конце' },
            { text: 'padStart()', displayText: 'дополнить в начале' },
            { text: 'padEnd()', displayText: 'дополнить в конце' },
            { text: 'startsWith()', displayText: 'начинается с' },
            { text: 'endsWith()', displayText: 'заканчивается на' },
            { text: 'length', displayText: 'длина строки' }
        ];
    }

    getObjectMethods() {
        return [
            { text: 'keys()', displayText: 'Object.keys(obj) - получить ключи' },
            { text: 'values()', displayText: 'Object.values(obj) - получить значения' },
            { text: 'entries()', displayText: 'Object.entries(obj) - получить пары ключ-значение' },
            { text: 'assign()', displayText: 'Object.assign(target, sources) - копировать свойства' },
            { text: 'create()', displayText: 'Object.create(proto) - создать объект' },
            { text: 'defineProperty()', displayText: 'Object.defineProperty(obj, prop, descriptor)' },
            { text: 'freeze()', displayText: 'Object.freeze(obj) - заморозить объект' },
            { text: 'seal()', displayText: 'Object.seal(obj) - запечатать объект' },
            { text: 'is()', displayText: 'Object.is(value1, value2) - сравнить значения' },
            { text: 'hasOwnProperty()', displayText: 'hasOwnProperty(prop) - проверить собственное свойство' },
            { text: 'toString()', displayText: 'toString() - преобразовать в строку' },
            { text: 'valueOf()', displayText: 'valueOf() - получить примитивное значение' }
        ];
    }

    getNumberMethods() {
        return [
            { text: 'toFixed()', displayText: 'toFixed(digits) - округлить до знаков' },
            { text: 'toPrecision()', displayText: 'toPrecision(precision) - округлить до точности' },
            { text: 'toString()', displayText: 'toString(radix) - преобразовать в строку' },
            { text: 'valueOf()', displayText: 'valueOf() - получить примитивное значение' },
            { text: 'toExponential()', displayText: 'toExponential(fractionDigits) - экспоненциальная запись' },
            { text: 'parseInt()', displayText: 'parseInt(string, radix) - парсить целое число' },
            { text: 'parseFloat()', displayText: 'parseFloat(string) - парсить число с плавающей точкой' },
            { text: 'isNaN()', displayText: 'isNaN(value) - проверить NaN' },
            { text: 'isFinite()', displayText: 'isFinite(value) - проверить конечность' },
            { text: 'MAX_VALUE', displayText: 'Number.MAX_VALUE - максимальное значение' },
            { text: 'MIN_VALUE', displayText: 'Number.MIN_VALUE - минимальное значение' },
            { text: 'POSITIVE_INFINITY', displayText: 'Number.POSITIVE_INFINITY - положительная бесконечность' },
            { text: 'NEGATIVE_INFINITY', displayText: 'Number.NEGATIVE_INFINITY - отрицательная бесконечность' }
        ];
    }

    getFunctionMethods() {
        return [
            { text: 'call()', displayText: 'вызвать с контекстом' },
            { text: 'apply()', displayText: 'вызвать с массивом аргументов' },
            { text: 'bind()', displayText: 'привязать контекст' },
            { text: 'toString()', displayText: 'получить строковое представление' },
            { text: 'length', displayText: 'количество параметров' },
            { text: 'name', displayText: 'имя функции' }
        ];
    }

    getBooleanMethods() {
        return [
            { text: 'toString()', displayText: 'преобразовать в строку' },
            { text: 'valueOf()', displayText: 'получить примитивное значение' }
        ];
    }

    getGeneralHints() {
        const hints = [
            { text: 'console.log()', displayText: 'вывести в консоль' },
            { text: 'console.error()', displayText: 'вывести ошибку' },
            { text: 'console.warn()', displayText: 'вывести предупреждение' },
            { text: 'console.info()', displayText: 'вывести информацию' },
            { text: 'setTimeout()', displayText: 'отложить выполнение' },
            { text: 'setInterval()', displayText: 'повторять выполнение' },
            { text: 'clearTimeout()', displayText: 'отменить таймер' },
            { text: 'clearInterval()', displayText: 'отменить интервал' },
            { text: 'JSON.stringify()', displayText: 'преобразовать в JSON' },
            { text: 'JSON.parse()', displayText: 'парсить JSON' },
            { text: 'Math.random()', displayText: 'случайное число' },
            { text: 'Math.floor()', displayText: 'округлить вниз' },
            { text: 'Math.ceil()', displayText: 'округлить вверх' },
            { text: 'Math.round()', displayText: 'округлить' },
            { text: 'Math.abs()', displayText: 'абсолютное значение' },
            { text: 'Math.max()', displayText: 'максимальное значение' },
            { text: 'Math.min()', displayText: 'минимальное значение' },
            { text: 'Date.now()', displayText: 'текущее время в миллисекундах' },
            { text: 'new Date()', displayText: 'создать объект даты' },
            { text: 'Array.isArray()', displayText: 'проверить массив' },
            { text: 'typeof', displayText: 'получить тип' },
            { text: 'instanceof', displayText: 'проверить тип' },
            { text: 'try', displayText: 'обработка ошибок' },
            { text: 'catch', displayText: 'перехват ошибок' },
            { text: 'finally', displayText: 'блок завершения' },
            { text: 'throw', displayText: 'выбросить ошибку' },
            { text: 'async', displayText: 'асинхронная функция' },
            { text: 'await', displayText: 'ожидание промиса' },
            { text: 'Promise.resolve()', displayText: 'создать разрешенный промис' },
            { text: 'Promise.reject()', displayText: 'создать отклоненный промис' }
        ];

        // Добавляем TypeScript специфичные подсказки
        if (this.currentLanguage === 'typescript') {
            hints.push(
                { text: 'interface', displayText: 'определить интерфейс' },
                { text: 'type', displayText: 'определить тип' },
                { text: 'enum', displayText: 'определить перечисление' },
                { text: 'namespace', displayText: 'определить пространство имен' },
                { text: 'export', displayText: 'экспортировать' },
                { text: 'import', displayText: 'импортировать' },
                { text: 'extends', displayText: 'наследование' },
                { text: 'implements', displayText: 'реализация интерфейса' },
                { text: 'readonly', displayText: 'только для чтения' },
                { text: 'optional', displayText: 'опциональное свойство' },
                { text: 'union', displayText: 'объединение типов' },
                { text: 'intersection', displayText: 'пересечение типов' },
                { text: 'generic', displayText: 'обобщенный тип' },
                { text: 'keyof', displayText: 'ключи типа' },
                { text: 'typeof', displayText: 'тип значения' },
                { text: 'infer', displayText: 'вывести тип' },
                { text: 'satisfies', displayText: 'удовлетворить тип' },
                { text: 'as const', displayText: 'константное утверждение' },
                { text: 'Partial<T>', displayText: 'частичный тип' },
                { text: 'Required<T>', displayText: 'обязательный тип' },
                { text: 'Pick<T, K>', displayText: 'выбрать свойства' },
                { text: 'Omit<T, K>', displayText: 'исключить свойства' },
                { text: 'Record<K, T>', displayText: 'запись типов' },
                { text: 'ReturnType<T>', displayText: 'тип возврата' },
                { text: 'Parameters<T>', displayText: 'типы параметров' }
            );
        }

        return hints.map(hint => ({
            text: hint.text,
            displayText: hint.displayText,
            render: (element) => {
                const iconClass = this.getHintIconClass(hint.text);
                element.innerHTML = `
                    <div class="hint-item">
                        <div class="hint-icon ${iconClass}"></div>
                        <div class="hint-text">${hint.text}</div>
                        <div class="hint-description">${hint.displayText}</div>
                    </div>
                `;
            }
        }));
    }

    getHintIconClass(hint) {
        if (hint.includes('console.')) return 'console';
        if (hint.includes('Math.') || hint.includes('Date.') || hint.includes('Array.') || 
            hint.includes('String.') || hint.includes('Object.') || hint.includes('Number.') || 
            hint.includes('Boolean.')) return 'builtin';
        if (hint.includes('function') || hint.includes('async') || hint.includes('await')) return 'function';
        if (hint.includes('const') || hint.includes('let') || hint.includes('var')) return 'variable';
        if (hint.includes('if') || hint.includes('else') || hint.includes('for') || hint.includes('while')) return 'control';
        if (hint.includes('interface') || hint.includes('type') || hint.includes('enum')) return 'typescript';
        if (hint.includes('class') || hint.includes('extends') || hint.includes('implements')) return 'class';
        if (hint.includes('import') || hint.includes('export')) return 'module';
        if (hint.includes('try') || hint.includes('catch') || hint.includes('throw')) return 'error';
        return 'general';
    }

    async runCode() {
        this.clearOutput();
        const code = this.editor.getValue();
        
        if (!code.trim()) {
            this.logInfo('Введите код для выполнения');
            return;
        }

        // Показываем индикатор загрузки
        this.showLoading();

        try {
            if (this.currentLanguage === 'typescript') {
                await this.runTypeScript(code);
            } else {
                await this.runJavaScript(code);
            }
        } catch (error) {
            this.logError(`Ошибка выполнения: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    async runTypeScript(code) {
        try {
            // Компилируем TypeScript в JavaScript
            const result = ts.transpileModule(code, {
                compilerOptions: {
                    target: ts.ScriptTarget.ES2020,
                    module: ts.ModuleKind.None,
                    strict: true,
                    esModuleInterop: true,
                    skipLibCheck: true
                }
            });

            if (result.diagnostics && result.diagnostics.length > 0) {
                result.diagnostics.forEach(diagnostic => {
                    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                    this.logError(`TypeScript ошибка: ${message}`);
                });
                return;
            }

            // Выполняем скомпилированный JavaScript
            await this.executeCode(result.outputText, 'TypeScript');
            
        } catch (error) {
            this.logError(`Ошибка компиляции TypeScript: ${error.message}`);
        }
    }

    async runJavaScript(code) {
        await this.executeCode(code, 'JavaScript');
    }

    async executeCode(code, language) {
        // Перехватываем console методы
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };

        const logs = [];

        // Переопределяем console методы
        console.log = (...args) => {
            logs.push({ type: 'log', args });
            originalConsole.log(...args);
        };

        console.error = (...args) => {
            logs.push({ type: 'error', args });
            originalConsole.error(...args);
        };

        console.warn = (...args) => {
            logs.push({ type: 'warn', args });
            originalConsole.warn(...args);
        };

        console.info = (...args) => {
            logs.push({ type: 'info', args });
            originalConsole.info(...args);
        };

        try {
            // Создаем безопасную среду выполнения
            const sandbox = {
                console: console,
                setTimeout: setTimeout,
                setInterval: setInterval,
                clearTimeout: clearTimeout,
                clearInterval: clearInterval,
                Math: Math,
                Date: Date,
                Array: Array,
                Object: Object,
                String: String,
                Number: Number,
                Boolean: Boolean,
                RegExp: RegExp,
                JSON: JSON,
                Promise: Promise,
                Map: Map,
                Set: Set,
                WeakMap: WeakMap,
                WeakSet: WeakSet,
                Symbol: Symbol,
                Proxy: Proxy,
                Reflect: Reflect,
                Intl: Intl
            };

            // Выполняем код в песочнице
            const functionBody = `
                with (sandbox) {
                    ${code}
                }
            `;
            
            const func = new Function('sandbox', functionBody);
            await func(sandbox);

            // Выводим результаты
            if (logs.length === 0) {
                this.logInfo('Код выполнен успешно (нет вывода)');
            } else {
                logs.forEach(log => {
                    this.logMessage(log.type, ...log.args);
                });
            }

        } catch (error) {
            this.logError(`Ошибка выполнения ${language}: ${error.message}`);
        } finally {
            // Восстанавливаем оригинальные console методы
            Object.assign(console, originalConsole);
        }
    }

    logMessage(type, ...args) {
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return String(arg);
        }).join(' ');

        const logElement = document.createElement('div');
        logElement.className = `log ${type}`;
        logElement.textContent = `[${type.toUpperCase()}] ${message}`;
        this.outputElement.appendChild(logElement);
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }

    logError(message) {
        this.logMessage('error', message);
    }

    logInfo(message) {
        this.logMessage('info', message);
    }

    showLoading() {
        const loadingElement = document.createElement('div');
        loadingElement.className = 'log loading';
        loadingElement.textContent = '[ЗАГРУЗКА] Выполняется...';
        loadingElement.id = 'loading-indicator';
        this.outputElement.appendChild(loadingElement);
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }

    hideLoading() {
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    clearEditor() {
        this.editor.setValue('');
        this.editor.focus();
    }

    clearOutput() {
        this.outputElement.innerHTML = '';
    }

    loadDefaultCode() {
        if (this.currentLanguage === 'typescript') {
            this.loadTypeScriptExample();
        } else {
            this.loadJavaScriptExample();
        }
    }

    loadJavaScriptExample() {
        const example = `// 🚀 JavaScript Universe - Начните здесь!
console.log('Привет, мир! 👋');

// 💡 Попробуйте написать: arr. и увидите подсказки методов массива
const arr = [1, 2, 3, 4, 5];
arr.

// 💡 Попробуйте написать: str. и увидите подсказки методов строки
const str = 'Hello World';
str.

// 💡 Работа с объектами - попробуйте: user.
const user = {
    name: 'Иван',
    age: 25,
    city: 'Москва'
};
user.

// 💡 Работа с числами - попробуйте: num.
const num = 3.14159;
num.

// 🔄 Асинхронная функция
async function fetchData() {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        const data = await response.json();
        console.log('✅ Полученные данные:', data);
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
}

// ▶️ Запустите код и увидите результат справа
fetchData();`;
        
        this.editor.setValue(example);
    }

    loadTypeScriptExample() {
        const example = `// 🚀 TypeScript Playground - Начните здесь!
console.log('Привет, TypeScript! 👋');

// 💡 Попробуйте написать: arr. и увидите подсказки методов массива
const arr: number[] = [1, 2, 3, 4, 5];
arr.

// 💡 Попробуйте написать: str. и увидите подсказки методов строки
const str: string = 'TypeScript Example';
str.

// 💡 Работа с объектами - попробуйте: user.
const user: { name: string; age: number } = {
    name: 'Иван',
    age: 25
};
user.

// 💡 Работа с числами - попробуйте: num.
const num: number = 3.14159;
num.

// 💡 Работа с булевыми - попробуйте: flag.
const flag: boolean = true;
flag.

// 🔧 TypeScript интерфейсы
interface User {
    id: number;
    name: string;
    email: string;
    age?: number;
}

// 🔧 TypeScript классы
class UserService {
    private users: User[] = [];

    addUser(user: User): void {
        this.users.push(user);
        console.log('✅ Пользователь добавлен:', user);
    }

    getAllUsers(): User[] {
        return this.users;
    }
}

// 🔧 TypeScript типы
type Status = 'active' | 'inactive' | 'pending';
const userStatus: Status = 'active';

// ▶️ Запустите код и увидите результат справа
console.log('🎯 Статус пользователя:', userStatus);`;
        
        this.editor.setValue(example);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new CodePlayground();
}); 