/* Autopilot & Audit Guide — чистый JS без React и сборки.
   Открывается двойным кликом или через VS Code (Live Server / Open with Live Server).
   Прогресс сохраняется в localStorage. */

"use strict";

var AGENTS_MD_PROMPT =
  "Создай файл AGENTS.md в корне проекта со следующим содержимым, дословно, без изменений и добавлений:\n\n" +
  "# Правила проекта (AGENTS.md)\n\n" +
  "## Роль\n" +
  "Ты — старший инженер этого проекта. Работаешь автономно, без вопросов к пользователю. Решения принимаешь сам, исходя из правил ниже, а в конце отчёта описываешь, что и почему выбрал.\n\n" +
  "## Принципы\n" +
  "- Не ломай работающее. Перед изменением пойми, как код работает сейчас.\n" +
  "- Минимальные диффы: правь только то, что требует аудит, не переписывай всё подряд.\n" +
  "- Не добавляй функции, которых не просили.\n" +
  "- Секреты (токены, ключи, пароли) никогда не попадают в код. Найденное — вынеси в .env + .env.example (значения-заглушки), сам .env добавь в .gitignore, реальный токен из истории удали и предупреди, что его нужно перевыпустить.\n" +
  "- После каждого изменения запусти проверку: для HTML — открыть в браузере и проверить консоль; для Python — python -m py_compile; для JS — node --check. Проверка упала — исправь, не отчитывайся с упавшей проверкой.\n" +
  "- Осмысленные коммиты: каждое изменение фиксируй отдельным коммитом с сообщением на русском языке в императиве («исправить», «добавить»), без мелких мусорных коммитов.\n\n" +
  "## Алгоритм работы\n" +
  "1. Аудит: осмотри весь проект (структуру, код, стили, разметку). Найди: секреты, критические баги, дубли и мёртвый код, проблемы стилей и разметки, нарушение консистентности (шрифты, отступы, цвета), потерю данных, уязвимости, мусорные файлы.\n" +
  "2. Отчёт: сохрани AUDIT.md с таблицей: проблема, файл:строка, серьёзность (P0 критично / P1 важно / P2 желательно), что делать.\n" +
  "3. План-fix: краткий план правок в порядке P0 → P1 → P2.\n" +
  "4. Рефакторинг: создай отдельную ветку refactor/<суть-правок> от main и работай только в ней — main не трогай. Правки по одной; после каждой — самопроверка и коммит (см. Принципы).\n" +
  "5. Финал: верни отчёт: что найдено, что исправлено, что осталось, как проверял, в какой ветке работа. Без воды.\n\n" +
  "## Definition of Done\n" +
  "- AUDIT.md создан и заполнен.\n" +
  "- Все P0 и P1 исправлены, каждая правка проверена.\n" +
  "- Секретов в коде нет.\n" +
  "- Код запускается и проверка проходит.\n" +
  "- Все правки — в ветке refactor/*, main на момент сдачи не изменён.\n" +
  "- Отчёт содержит: найдено / исправлено / осталось.\n\n" +
  "## Запрещено\n" +
  "- Задавать уточняющие вопросы — работай по этому документу.\n" +
  "- Объявлять «готово» без выполненной проверки.\n" +
  "- Коммитить и пушить без прямого указания пользователя.\n" +
  "- Вливать ветку refactor/* в main и делать push без прямого указания пользователя.";

var OPENCODE_JSON_PROMPT =
  "Создай файл opencode.json в корне проекта с содержимым:\n\n" +
  "{\n" +
  "  \"$schema\": \"https://opencode.ai/config.json\",\n" +
  "  \"instructions\": [\"AGENTS.md\"],\n" +
  "  \"permission\": {\n" +
  "    \"edit\": \"allow\",\n" +
   "    \"bash\": { \"git commit*\": \"allow\", \"git merge*\": \"ask\", \"git push*\": \"ask\", \"*\": \"allow\" }\n" +
  "  }\n" +
  "}\n\n" +
  "Затем напомни мне одну строкой: перезапустить opencode, чтобы конфиг применился.\n\n" +
  "Пояснение по permissions: правки файлов и git commit разрешены полностью — рефакторинг идёт в своей ветке refactor/*, и коммиты там безопасны. Под вопросом остаются git merge (вливание ветки в main) и git push (отправка на GitHub) — оба только после вашего явного «ок» на merge day.";

var AUTOPILOT_PROMPT =
  "Следуй AGENTS.md полностью: проведи аудит проекта, создай AUDIT.md, исправь все P0 и P1, выполни проверки из Definition of Done и верни финальный отчёт. Рефакторинг веди в отдельной ветке refactor/<суть-правок> — main не трогай, каждая правка с коммитом. Работай до конца без остановок и вопросов. В конце назови имя ветки с результатом.";

var AUDIT_ONLY_PROMPT =
  "Проведи аудит проекта по AGENTS.md: осмотри все файлы, проверь также git-состояние (текущая ветка, незакоммиченные изменения, ветки refactor/*). Создай AUDIT.md с таблицей (проблема, файл:строка, серьёзность P0/P1/P2, что делать). Ничего не исправляй, только аудит и отчёт.";

var REFACTOR_ONLY_PROMPT =
  "Открой AUDIT.md и выполни рефакторинг: сначала осмотр git-состояние (git status, текущая ветка, есть ли незакоммиченные правки — мусор в commits недопустим), затем создай ветку refactor/<суть-правок> от main и работай только в ней. Исправь все P0, затем P1, по одной правке за раз, после каждой запусти проверку из AGENTS.md и сделай коммит. main не трогай.";

var MERGE_DAY_PROMPT =
  "Merge day. Сначала аудит git-состояния: покажи список всех веток (git branch -vv), их состояние относительно main (впереди/позади, свежесть), незакоммиченные изменения и результат последней проверки AUDIT.md. Затем влей ветку с результатами рефакторинга в main — способ (merge или rebase/squash) выбери сам, но перед выбором объясни, что видишь в git-состоянии и почему выбрал именно этот способ. Конфликты разрешай сам, при сомнении — спрашивай. После слияния запусти проверки из AGENTS.md и покажи итог: git log --oneline, git status, git diff --stat. Пушить на GitHub и удалять слитые ветки — только после моего явного «ок».";

var STEPS = [
  {
    id: 1,
    icon: "🧾",
    newContext: true,
    tag: "AGENTS.MD",
    tagClass: "tag-violet",
    title: "AGENTS.md — постоянная память проекта",
    subtitle: "Жёсткие правила качества одним промптом",
    description:
      "opencode читает файл AGENTS.md в корне проекта и следует правилам из него в каждой сессии — это «постоянная память» проекта. Внутри: роль старшего инженера (работает автономно, без вопросов), принципы (не ломать работающее, минимальные диффы, никаких лишних функций, секреты — в .env, после каждой правки — проверка и коммит), алгоритм «аудит → отчёт → план → рефакторинг → финал», Definition of Done и раздел «Запрещено». Два главных термина алгоритма, коротко: аудит — осмотр проекта с целью найти проблемы, код при этом не меняется; рефакторинг — исправление найденного, при котором поведение программы не меняется. Полные определения — в шагах 3 и 4. Рефакторинг по правилам идёт в отдельной ветке refactor/* — main не трогается.",
    steps: [
      {
        label: "Скопировать и вставить промпт в opencode",
        description:
          "Откройте opencode в корне своего проекта, скопируйте промпт и отправьте:",
        prompt: AGENTS_MD_PROMPT,
        note: "Проверка: в корне проекта появился файл AGENTS.md с разделами «Роль», «Принципы», «Алгоритм работы», «Definition of Done» и «Запрещено»"
      }
    ]
  },
  {
    id: 2,
    icon: "⚡",
    newContext: true,
    tag: "АВТОПИЛОТ",
    tagClass: "tag-indigo",
    title: "opencode.json — снимаем подтверждения",
    subtitle: "Полный автопилот: opencode больше не спрашивает на каждом шагу",
    description:
      "Второй компонент автопилота — конфиг opencode.json в корне проекта. Поле instructions подключает AGENTS.md как контекст, permission снимает подтверждения на правки файлов, команды в терминале и git commit — коммиты безопасны, потому что рефакторинг идёт в своей ветке refactor/*. Под вопросом остаются git merge (вливание ветки в main) и git push (отправка на GitHub) — агент не сможет ни слить ветки, ни запушить без вашего «ок».",
    steps: [
      {
        label: "Скопировать и вставить промпт в opencode",
        description: "Скопируйте промпт и отправьте:",
        prompt: OPENCODE_JSON_PROMPT,
        note: "Проверка: в корне проекта появился opencode.json с $schema, instructions и permission"
      },
      {
        label: "Перезапустить opencode",
        description:
          "opencode напомнит одной строкой: «перезапустить opencode, чтобы конфиг применился». Конфиг и правила подхватываются только при старте — полностью закройте и откройте opencode.",
        note: "После перезапуска AGENTS.md подключён как контекст, подтверждения сняты — можно запускать автопилот"
      }
    ]
  },
  {
    id: 3,
    icon: "🚀",
    newContext: true,
    tag: "ЗАПУСК",
    tagClass: "tag-blue",
    title: "Кнопка автопилота",
    subtitle: "Один промпт — opencode работает до конца без остановок",
    description:
      "После перезапуска отправляете единственный промпт — это и есть «кнопка автопилота». Дальше opencode сам: осмотрит проект → напишет AUDIT.md → исправит → проверит → отчитается. Модели запрещено объявлять «готово» без самопроверки — так говорит AGENTS.md. Напомним термины. Аудит — это осмотр всего проекта без единого изменения кода: агент читает файлы и ищет секреты (токены, пароли), критические баги, дубли и мёртвый код (код, который никогда не выполнится), проблемы стилей и разметки, потерю данных и уязвимости — и складывает найденное в таблицу AUDIT.md. Рефакторинг — это исправление каждого пункта аудита: правка по одной, после каждой правки — самопроверка и коммит. Аудит отвечает на вопрос «что не так», рефакторинг — «что с этим делать». Порядок серьёзности: P0 — упало или небезопасно (чек появляется, сайт не работает, токен в коде — светится в git-истории), P1 — важно (дубли, мёртвый код, потеря данных, зависимость небезопасна), P2 — желательно (шрифт не тот, отступ съехал, цвет не из палитры). Сначала чинится всё, что мешает работе, потом — эстетика.",
    steps: [
      {
        label: "Отправить промпт-автопилот",
        description: "Скопируйте промпт, вставьте в opencode и отправьте:",
        prompt: AUTOPILOT_PROMPT,
        note: "Промпт один и тот же для любого проекта — больше ничего писать не нужно"
      },
      {
        label: "Что будет происходить",
        description: "opencode пройдёт весь цикл сам, без ваших уточнений:",
        bullets: [
          "Аудит: осмотрит весь проект — код, стили, разметку, секреты, git-состояние, мусорные файлы. Код не меняет",
          "Создаст AUDIT.md — таблицу: проблема, файл:строка, серьёзность P0/P1/P2, что делать",
          "Создаст ветку refactor/<суть-правок> от main — работа идёт только в ней",
          "Рефакторинг: исправит все P0 и P1 по одной правке, после каждой — проверка и коммит. Поведение программы не меняется",
          "Вернёт финальный отчёт: что найдено, что исправлено, что осталось, как проверял, в какой ветке работа"
        ],
        note: "Ваша работа — читать AUDIT.md и финальный отчёт; git merge (вливание в main) и git push по-прежнему требуют вашего подтверждения, коммиты в ветке агент делает сам"
      }
    ]
  },
  {
    id: 4,
    icon: "🩺",
    newContext: true,
    tag: "РУЧНОЙ РЕЖИМ",
    tagClass: "tag-gray",
    title: "Ручные промпты — по кускам",
    subtitle: "Аудит и рефакторинг по отдельности — и что они значат",
    description:
      "Автопилот — это «аудит → правки → проверки» целиком, но каждый этап можно запустить отдельным промптом. АУДИТ — это осмотр проекта без единой правки, детективская работа: агент читает файлы и ищет секреты (токены, ключи, пароли), критические баги и потерю данных, дубли и мёртвый код (код, который никогда не выполнится), проблемы стилей и разметки, нарушение консистентности (разные шрифты, отступы, цвета), уязвимости и мусорные файлы. Результат — AUDIT.md: таблица «проблема → файл:строка → серьёзность → что делать». Серьёзность: P0 — критично (секрет в коде, потеря данных, ничего не запускается), P1 — важно (баги, дубли, уязвимости), P2 — желательно (полировка). РЕФАКТОРИНГ — это исправление по отчёту: меняем внутреннее устройство кода, не меняя внешнего поведения — пользователь видит то же самое, но дубли свёрнуты в функции, мёртвый код удалён, стили и имена приведены в порядок. Новые функции не добавляются: рефакторинг только чинит то, что нашёл аудит. Правки по одной — сначала все P0, затем P1, после каждой проверка и коммит.",
    steps: [
      {
        label: "Только аудит",
        description: "Скопируйте промпт и отправьте. Что агент ищет при осмотре:",
        prompt: AUDIT_ONLY_PROMPT,
        bullets: [
          "Секреты в коде — токены, ключи, пароли (P0: светятся в git-истории)",
          "Критические баги, потеря данных, уязвимости (P0–P1)",
          "Дубли и мёртвый код — пять копий одного и того же, код, который не выполнится (P1)",
          "Проблемы стилей и разметки, разные шрифты/отступы/цвета (P2)",
          "Мусорные файлы и git-состояние: незакоммиченное, лишние ветки"
        ],
        note: "Проверка: появился AUDIT.md с таблицей проблем, при этом код не изменился ни на символ — главная примета аудита"
      },
      {
        label: "Только рефакторинг (после аудита)",
        description: "Когда AUDIT.md готов, отправьте в opencode. Признаки настоящего рефакторинга:",
        prompt: REFACTOR_ONLY_PROMPT,
        bullets: [
          "Внешнее поведение то же — для пользователя всё работает как раньше",
          "Внутреннее устройство лучше — дубли свёрнуты, мёртвый код удалён, стили единые, имена понятные",
          "Ничего нового не добавляется — только правится найденное аудитом",
          "Ритм: одна правка → проверка → коммит; порядок P0 → P1, работа в ветке refactor/*"
        ],
        note: "Проверка: правки идут по одной, после каждой запущена проверка из AGENTS.md и сделан коммит; в конце агент называет имя ветки refactor/*"
      }
    ]
  },
  {
    id: 5,
    icon: "🌉",
    newContext: true,
    tag: "MERGE DAY",
    tagClass: "tag-blue",
    title: "Merge day — вливаем результат в main",
    subtitle: "Агент разбирается с ветками и собирает всё в одну",
    description:
      "Рефакторинг закончился в ветке refactor/*, main остался нетронутым. Merge day — день Х, когда результат вливается в основную ветку. opencode сначала проводит аудит git-состояния (сколько веток, куда убежали, что незакоммичено), потом сам выбирает способ слияния (merge или rebase/squash) и объясняет выбор, разрешает конфликты и гоняет финальные проверки. Push и удаление слитых веток — только с вашего явного «ок».",
    steps: [
      {
        label: "Скопировать и вставить промпт в opencode",
        description: "Рефакторинг закончен, ветка refactor/* готова? Отправляйте:",
        prompt: MERGE_DAY_PROMPT,
        note: "Агент сначала покажет гит-состояние и объяснит выбор способа слияния — читайте и вникайте, это самый содержательный момент урока"
      },
      {
        label: "Что происходит на merge day",
        description: "opencode пройдёт сам, шаг за шагом:",
        bullets: [
          "Аудит git: список веток (git branch -vv), опережение/отставание от main, незакоммиченный мусор",
          "Выбор способа слияния — merge для простых случаев, rebase/squash для грязной истории — с объяснением",
          "Вливание в main и разрешение конфликтов (сомнения — на ваше усмотрение)",
          "Финальные проверки AGENTS.md + отчёт: git log --oneline, git status, git diff --stat"
        ],
        note: "Ваши решения на выходе: разрешить push на GitHub и удалить ли слитую ветку refactor/* — оба шага под «ask»"
      }
    ]
  }
];

// ---------- состояние ----------
var completed = loadJson("audit-lecture-completed", []);
var subChecked = loadJson("audit-lecture-subchecked", {});
var completedSet = {};
completed.forEach(function (id) { completedSet[id] = true; });

function loadJson(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) { return fallback; }
}
function save() {
  try {
    localStorage.setItem("audit-lecture-completed", JSON.stringify(Object.keys(completedSet).map(Number)));
    localStorage.setItem("audit-lecture-subchecked", JSON.stringify(subChecked));
  } catch (e) {}
}

// ---------- svg ----------
function svgCheck(cls) {
  return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
}
function svgExternal(cls) {
  return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
}
function svgCopy(cls) {
  return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
}
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&" + "amp;").replace(/</g, "&" + "lt;").replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

// ---------- копирование ----------
function copyText(text, btn) {
  function done() {
    if (!btn) return;
    var original = btn.innerHTML;
    btn.innerHTML = svgCheck("") + "<span>скопировано</span>";
    btn.classList.add("copy-ok");
    setTimeout(function () { btn.innerHTML = original; btn.classList.remove("copy-ok"); }, 2000);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
  } else { fallbackCopy(text); done(); }
}
function fallbackCopy(text) {
  var ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch (e) {}
  document.body.removeChild(ta);
}

// ---------- рендер ----------
function pad(n) { return String(n).padStart(2, "0"); }
function stepsWord(n) {
  var m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "шаг";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "шага";
  return "шагов";
}

function renderProgress() {
  var total = STEPS.length;
  var doneCount = Object.keys(completedSet).length;
  var pct = Math.round((doneCount / total) * 100);
  document.getElementById("progressCount").textContent = doneCount + "/" + total + " " + stepsWord(total);
  var fill = document.getElementById("progressFill");
  fill.style.width = pct + "%";
  if (pct === 100) fill.classList.add("full"); else fill.classList.remove("full");
  var hint = document.getElementById("progressHint");
  if (pct === 0) { hint.textContent = ""; }
  else if (pct === 100) { hint.textContent = "🎉 Всё готово! Автопилот работает."; }
  else { hint.textContent = pct + "% завершено — продолжайте!"; }
  document.getElementById("footerCount").textContent = doneCount + " из " + total + " выполнено";
}

function renderChips() {
  var box = document.getElementById("chips");
  box.innerHTML = STEPS.map(function (s) {
    var done = !!completedSet[s.id];
    return '<div class="chip' + (done ? " done" : "") + '">' +
      (done ? svgCheck("") : "<span>" + s.icon + "</span>") +
      "<span>" + esc(s.title) + "</span></div>";
  }).join("");
}

function substepHtml(stepId, sub, idx) {
  var key = stepId + "-" + idx;
  var checked = !!subChecked[key];
  var html = '<div class="substep' + (checked ? " checked" : "") + '" data-sub="' + key + '">';
  html += '<div class="checkbox">' + (checked ? svgCheck("") : "") + "</div>";
  html += '<div class="substep-body"><span class="substep-num">' + pad(idx + 1) + "</span>";
  html += '<div class="substep-content">';
  html += '<p class="substep-title">' + esc(sub.label) + "</p>";
  if (!checked) {
    if (sub.description) html += '<p class="substep-text">' + esc(sub.description) + "</p>";
    if (sub.link) {
      html += '<a class="substep-link" href="' + esc(sub.link.href) + '" target="_blank" rel="noopener noreferrer" data-stop="1">' +
        esc(sub.link.text) + svgExternal("") + "</a>";
    }
    if (sub.bullets) {
      html += '<ul class="bullets">' + sub.bullets.map(function (b) {
        return '<li><i>✦</i><span>' + esc(b) + "</span></li>";
      }).join("") + "</ul>";
    }
    if (sub.prompt) {
      html += '<div class="prompt-block"><div class="prompt-head"><span class="prompt-head-label"><span>✦</span> промпт для opencode</span>' +
        '<button class="copy-btn" data-copy="' + esc(sub.prompt).replace(/"/g, "&" + "quot;") + '" data-stop="1">' + svgCopy("") + "<span>копировать</span></button></div>" +
        '<pre class="prompt-text">' + esc(sub.prompt) + "</pre></div>";
    }
    if (sub.prompt2) {
      html += '<div class="prompt-block"><div class="prompt-head"><span class="prompt-head-label"><span>✦</span> промпт для opencode — затем</span>' +
        '<button class="copy-btn" data-copy="' + esc(sub.prompt2).replace(/"/g, "&" + "quot;") + '" data-stop="1">' + svgCopy("") + "<span>копировать</span></button></div>" +
        '<pre class="prompt-text">' + esc(sub.prompt2) + "</pre></div>";
    }
    if (sub.note) html += '<p class="note"><b>→</b><span>' + esc(sub.note) + "</span></p>";
  }
  html += "</div></div></div>";
  return html;
}

function renderCards() {
  var box = document.getElementById("steps");
  box.innerHTML = STEPS.map(function (step, i) {
    var done = !!completedSet[step.id];
    var html = '<article class="step-card animate-fade-up' + (done ? " completed-card" : "") + '" style="animation-delay:' + (i * 120) + 'ms">';
    html += '<div class="step-head"><div class="step-head-left">';
    html += '<div class="step-icon">' + (done ? '<span class="animate-check-pop">' + svgCheck("") + "</span>" : step.icon) + "</div>";
    html += "<div>";
    html += '<div class="step-meta"><span class="tag ' + step.tagClass + '">' + esc(step.tag) + "</span>" +
      '<span class="step-num">' + pad(i + 1) + " / " + pad(STEPS.length) + "</span></div>";
    html += "<h2>" + esc(step.title) + "</h2>";
    html += '<p class="step-sub">' + esc(step.subtitle) + "</p>";
    html += "</div></div>";
    if (step.url) {
      html += '<a class="site-link" href="' + esc(step.url) + '" target="_blank" rel="noopener noreferrer">' + svgExternal("") + "<span>сайт</span></a>";
    }
    html += "</div>";
    if (step.newContext) {
      html += '<div class="context-banner"><span>🗂️</span><p style="margin:0"><b>Каждый шаг — отдельный контекст.</b> Перед тем как вставлять промпт, создайте новую вкладку в opencode — не продолжайте в старом чате.</p></div>';
    }
    html += '<p class="step-desc">' + esc(step.description) + "</p>";
    html += '<div class="substeps">' + step.steps.map(function (s, j) { return substepHtml(step.id, s, j); }).join("") + "</div>";
    html += '<div class="done-row">';
    html += done
      ? '<div class="done-label animate-slide-right">' + svgCheck("") + "Выполнено</div>"
      : "<div></div>";
    html += '<button class="done-btn' + (done ? " is-done" : "") + '" data-done="' + step.id + '">' +
      (done ? svgCheck("") + "Готово — отменить?" : "Отметить как сделано ✓") + "</button>";
    html += "</div></article>";
    return html;
  }).join("");

  var allDone = Object.keys(completedSet).length === STEPS.length;
  document.getElementById("finalBanner").style.display = allDone ? "block" : "none";
}

function renderAll() { renderProgress(); renderChips(); renderCards(); }

// ---------- события (делегирование) ----------
document.addEventListener("click", function (e) {
  var stop = e.target.closest("[data-stop]");
  if (stop) e.stopPropagation();

  var copyBtn = e.target.closest("[data-copy]");
  if (copyBtn) {
    e.stopPropagation();
    copyText(copyBtn.getAttribute("data-copy"), copyBtn);
    return;
  }
  var doneBtn = e.target.closest("[data-done]");
  if (doneBtn) {
    var id = Number(doneBtn.getAttribute("data-done"));
    if (completedSet[id]) { delete completedSet[id]; }
    else {
      completedSet[id] = true;
      // мини-конфетти
      var card = doneBtn.closest(".step-card");
      if (card) burst(card);
    }
    save(); renderAll();
    return;
  }
  var sub = e.target.closest("[data-sub]");
  if (sub) {
    var key = sub.getAttribute("data-sub");
    // клик по ссылке/кнопке внутри — не переключать чекбокс
    if (e.target.closest("a,button")) return;
    subChecked[key] = !subChecked[key];
    save(); renderAll();
  }
});

function burst(card) {
  var colors = ["#4f46e5", "#16a34a", "#f59e0b", "#ec4899", "#06b6d4"];
  var wrap = document.createElement("div");
  wrap.className = "confetti-wrap";
  for (var i = 0; i < 18; i++) {
    var c = document.createElement("div");
    c.className = "confetti";
    c.style.left = (10 + (i * 5) % 80) + "%";
    c.style.backgroundColor = colors[i % colors.length];
    c.style.animationDelay = (i * 60) + "ms";
    c.style.transform = "rotate(" + (i * 20) + "deg)";
    wrap.appendChild(c);
  }
  card.appendChild(wrap);
  setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 1600);
}

document.getElementById("resetBtn").addEventListener("click", function () {
  completedSet = {}; subChecked = {}; save(); renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

renderAll();
