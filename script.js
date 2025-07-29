class CodePlayground {
    constructor() {
        this.editor = null;
        this.outputElement = document.getElementById('output');
        this.runBtn = document.getElementById('runBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.clearOutputBtn = document.getElementById('clearOutputBtn');
        this.autoRunToggle = document.getElementById('autoRunToggle');
        
        this.autoRunTimeout = null;
        this.autoRunDelay = 1000; // 1 секунда задержки
        
        this.initializeEditor();
        this.bindEvents();
        this.loadDefaultCode();
        this.setupMobileOptimizations();
    }

    setupMobileOptimizations() {
        // Предотвращение двойного касания для зума
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // Оптимизация для мобильных устройств
        if (window.innerWidth <= 768) {
            this.setupMobileEditor();
        }

        // Обработка изменения ориентации
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.editor.refresh();
            }, 100);
        });

        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.editor.refresh();
            }, 100);
        });
    }

    setupMobileEditor() {
        // Уменьшаем задержку авто-запуска на мобильных
        this.autoRunDelay = 1000;
        
        // Оптимизируем CodeMirror для мобильных
        this.editor.setOption('lineWrapping', true);
        this.editor.setOption('scrollbarStyle', 'native');
        
        // Улучшаем обработку касаний
        this.editor.on('touchstart', () => {
            // Предотвращаем конфликты с системными жестами
        });

        // Дополнительные оптимизации для очень маленьких экранов
        if (window.innerWidth <= 480) {
            this.setupTinyScreenOptimizations();
        }
    }

    setupTinyScreenOptimizations() {
        // Уменьшаем размеры шрифтов
        this.editor.setOption('lineHeight', 1.1);
        
        // Уменьшаем отступы
        const editorElement = this.editor.getWrapperElement();
        editorElement.style.fontSize = '10px';
        
        // Оптимизируем для касаний
        this.editor.setOption('cursorBlinkRate', 0); // Отключаем мигание курсора для экономии ресурсов
        
        // Уменьшаем задержку авто-запуска для быстрого отклика
        this.autoRunDelay = 800;
    }

    initializeEditor() {
        const textarea = document.getElementById('codeEditor');
        
        this.editor = CodeMirror.fromTextArea(textarea, {
            mode: 'text/typescript',
            theme: 'monokai',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 2,
            tabSize: 2,
            lineWrapping: true,
            foldGutter: true,
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
            styleActiveLine: true,
            extraKeys: {
                'Ctrl-Enter': () => this.runCode(),
                'Cmd-Enter': () => this.runCode()
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
        this.autoRunToggle.addEventListener('change', (e) => {
            if (!e.target.checked) {
                this.clearAutoRunTimeout();
            }
        });
        
        // Автоматический запуск при изменении кода
        this.editor.on('change', (cm, change) => {
            this.scheduleAutoRun();
        });
        
        // Обработка ошибок
        window.addEventListener('error', (e) => {
            this.logError(e.error || e.message);
        });
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
            await this.runTypeScript(code);
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
                this.logErrorHeader('🔍 TypeScript ошибки:');
                result.diagnostics.forEach(diagnostic => {
                    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                    const line = diagnostic.file ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1 : '?';
                    const character = diagnostic.file ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).character + 1 : '?';
                    
                    this.logErrorLocation(`📍 Строка ${line}, символ ${character}: ${message}`);
                });
                return;
            }

            // Выполняем скомпилированный JavaScript
            await this.executeCode(result.outputText, 'TypeScript');
            
        } catch (error) {
            this.logError(`Ошибка компиляции TypeScript: ${error.message}`);
        }
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
        this.loadTypeScriptExample();
    }

    loadTypeScriptExample() {
        const example = `// 🚀 JavaScript Universe - TypeScript + JavaScript с подсветкой синтаксиса
console.log('Привет, мир! 👋');

// Работа с массивами
const arr: number[] = [1, 2, 3, 4, 5];
console.log('Массив:', arr);

// Работа со строками
const str: string = 'Hello World';
console.log('Строка:', str);

// Работа с объектами
const user: { name: string; age: number } = {
    name: 'Иван',
    age: 25
};
console.log('Пользователь:', user);

// Работа с числами
const num: number = 3.14159;
console.log('Число:', num);

// Работа с булевыми
const flag: boolean = true;
console.log('Флаг:', flag);

// TypeScript интерфейсы
interface User {
    id: number;
    name: string;
    email: string;
    age?: number;
}

// TypeScript классы
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

// TypeScript типы
type Status = 'active' | 'inactive' | 'pending';
const userStatus: Status = 'active';

// Пример ошибки TypeScript для демонстрации
interface IA {
    name: string;
}

const people: IA = {
    name: 1 // Ошибка: Type 'number' is not assignable to type 'string'
};

console.log(people);

// Асинхронная функция
async function fetchData(): Promise<void> {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        const data = await response.json();
        console.log('✅ Полученные данные:', data);
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
}

// Запуск кода
fetchData();
console.log('🎯 Статус пользователя:', userStatus);`;
        
        this.editor.setValue(example);
    }

    logErrorHeader(message) {
        const logElement = document.createElement('div');
        logElement.className = 'log error header';
        logElement.textContent = message;
        this.outputElement.appendChild(logElement);
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }

    logErrorLocation(message) {
        const logElement = document.createElement('div');
        logElement.className = 'log error location';
        logElement.textContent = message;
        this.outputElement.appendChild(logElement);
        this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new CodePlayground();
}); 