# UUID-CBR

> Генератор УИд для Node.js по требованиям Банка России.

Пакет формирует УИд на основе UUID v1 с контрольным символом и повторяет поведение официального примера Банка России на C.

## Установка

```bash
npm install uuid-cbr
```

## Быстрый старт

CommonJS:

```js
const { generate } = require("uuid-cbr");

const uid = generate();
```

ESM:

```js
import { generate } from "uuid-cbr";

const uid = generate();
```

## Основные методы

### `generate(datetime?)`

Формирует УИд в формате `8-4-4-4-12-1`, где последний символ является контрольным.

```js
const { generate } = require("uuid-cbr");

const uid = generate(new Date("2021-09-24T09:55:09.332Z"));
// 80c57a90-1d1d-11ec-adda-26dbb65f1526-0

const uidNow = generate();
// генерация для текущего момента
```

### `isValid(uuid)`

Проверяет формат UUID v1, variant-биты и контрольный символ.

```js
const { isValid } = require("uuid-cbr");

isValid("80c57a90-1d1d-11ec-adda-26dbb65f1526-0"); // true
isValid("not-a-uuid"); // false
```

### `toDate(uuid)`

Извлекает дату из UUID-части идентификатора.

```js
const { toDate } = require("uuid-cbr");

toDate("80c57a90-1d1d-11ec-adda-26dbb65f1526-0");
// 2021-09-24T09:55:09.332Z
```

### `info(uuid)`

Возвращает длину, валидность, контрольный символ, clock sequence и дату.

```js
const { info } = require("uuid-cbr");

info("80c57a90-1d1d-11ec-adda-26dbb65f1526-0");
// { len: 38, valid: true, controlNum: '0', gClockSeq: ..., datetime: 2021-09-24T09:55:09.332Z }
```

### `getTime(datetime?)`

Возвращает ту же метку времени в 100-нс интервалах, которая кодируется в UUID.

```js
const { getTime } = require("uuid-cbr");

getTime(new Date("2021-09-24T09:55:09.332Z"));
```

## Управление генератором

Если нужен управляемый state генератора, используйте `uid_init`, `uid_create` и `uid_deinit`.

```js
const { uid_init, uid_deinit, uid_create } = require("uuid-cbr");

uid_init({
  node: [0x10, 0x20, 0x30, 0x40, 0x50, 0x60],
  clockSeq: 0x1234,
});

const uid = uid_create(new Date("2021-09-24T09:55:09.332Z"));
uid_deinit();
```

- `node` — 6 байт: Buffer, Array или hex-строка. По умолчанию случайные.
- `clockSeq` — 13-битный clock sequence. По умолчанию случайный.

## Совместимость API

- `uid_create` формирует УИд-строку, аналог `generate`.
- `uuid_create` возвращает поля UUID: `time_low`, `time_mid`, `time_hi_and_version`, `clock_seq_hi_and_reserved`, `clock_seq_low`, `node`.

`uuid_init` и `uuid_deinit` это алиасы `uid_init` и `uid_deinit`.
