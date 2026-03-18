# UUID-CBR

> Генератор уникальных идентификаторов (УИд) по требованиям Банка России (Указание 5251-У, Положение 758-П)

Реализация алгоритма формирования УИд на основе UUID v1 с контрольным символом, полностью соответствующая официальному примеру ЦБ на C.

### Установка

```bash
npm install uuid-cbr
```

### Форматы модуля

Пакет публикуется сразу в двух вариантах:

- `require("uuid-cbr")` для CommonJS
- `import { generate } from "uuid-cbr"` для ESM
- встроенные декларации `index.d.ts` для TypeScript

```js
const { generate } = require("uuid-cbr");
```

```js
import { generate } from "uuid-cbr";
```

### API

#### `generate(datetime?)`

Формирует УИд — строку из 38 символов в формате `8-4-4-4-12-1`, где последний символ — контрольный.

```JavaScript
const { generate } = require("uuid-cbr");

const uid = generate(new Date("2021-09-24T09:55:09.332Z"));
// 80c57a90-1d1d-11ec-adda-26dbb65f1526-0

const uidNow = generate();
// генерация для текущего момента
```

#### `isValid(uuid)`

Проверяет строку: формат UUID v1, variant-биты, контрольный символ.

```JavaScript
const { isValid } = require("uuid-cbr");

isValid("80c57a90-1d1d-11ec-adda-26dbb65f1526-0"); // true
isValid("not-a-uuid");                               // false
```

#### `toDate(uuid)`

Извлекает дату из UUID-части идентификатора.

```JavaScript
const { toDate } = require("uuid-cbr");

toDate("80c57a90-1d1d-11ec-adda-26dbb65f1526-0");
// 2021-09-24T09:55:09.332Z
```

#### `info(uuid)`

Метаданные идентификатора: длина, валидность, контрольный символ, clock sequence, дата.

```JavaScript
const { info } = require("uuid-cbr");

info("80c57a90-1d1d-11ec-adda-26dbb65f1526-0");
// { len: 38, valid: true, controlNum: '0', gClockSeq: ..., datetime: 2021-09-24T09:55:09.332Z }
```

#### `getTime(datetime?)`

Возвращает метку времени в 100-наносекундных интервалах (Number) — то же значение, которое кодируется в UUID.

```JavaScript
const { getTime } = require("uuid-cbr");

getTime(new Date("2021-09-24T09:55:09.332Z"));
```

#### `uid_init(options?)` / `uid_deinit()`

Lifecycle-управление генератором, аналог `uid_init` и `uid_deinit` из официального C-примера ЦБ.

```JavaScript
const { uid_init, uid_deinit, uid_create } = require("uuid-cbr");

uid_init({
  node: [0x10, 0x20, 0x30, 0x40, 0x50, 0x60],
  clockSeq: 0x1234,
});

const uid = uid_create(new Date("2021-09-24T09:55:09.332Z"));
uid_deinit();
```

`options`:

- `node` — 6 байт (Buffer, Array или hex-строка). По умолчанию — случайные.
- `clockSeq` — 13-битное значение clock sequence. По умолчанию — случайное.

#### `uid_create(datetime?)` / `uuid_create(datetime?)`

- `uid_create` — формирует УИд-строку (аналог `generate`).
- `uuid_create` — возвращает структуру полей UUID: `time_low`, `time_mid`, `time_hi_and_version`, `clock_seq_hi_and_reserved`, `clock_seq_low`, `node`.

`uuid_init` / `uuid_deinit` — алиасы для `uid_init` / `uid_deinit`.

### Тесты

```bash
npm test
```

Тесты запускаются через встроенный раннер Node.js `node:test` и покрывают поведение публичного API как unit-тесты.

### Сверка с официальным алгоритмом

```bash
npm run compare:official
```

Скрипт собирает УИд при детерминированных входных данных и побайтово сравнивает результат с эталонной реализацией, эквивалентной официальному C-коду ЦБ.

### Проверка перед публикацией

```bash
npm run verify:publish
```

Эта команда последовательно выполняет:

- unit-тесты;
- сверку с официальным алгоритмом;
- `npm pack --dry-run`, чтобы проверить состав публикуемого пакета.

При `npm publish` эта проверка запускается автоматически через `prepublishOnly`.

### Что попадает в npm

В опубликованный пакет входят только файлы рантайма:

- `index.js`
- `index.mjs`
- `index.d.ts`
- `README.md`

Тесты, служебные скрипты, локальные временные файлы и официальный reference-архив остаются в репозитории, но не публикуются в npm.

### Официальные материалы

- [docs/official/README.md](docs/official/README.md) — описание сохранённых документов
- [docs/official/cbr-algorithm-findings.md](docs/official/cbr-algorithm-findings.md) — результаты сверки с официальным примером
