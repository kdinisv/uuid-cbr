# UUID-CBR

> Js библиотека для генирации uuid по требованию ЦБ

### Пример использования

**_Генерация uuid_**

```JavaScript
const { generate } = require("uuid-cbr");
const nowDatetime = new Date("2021-09-24T09:55:09.332Z")
const uuidByDate = generate(nowDatetime)
console.log(uuidByDate); // 80c57a90-1d1d-11ec-adda-26dbb65f1526-0

const uuidNowDate = generate()
console.log(uuidNowDate); // 3ce3d880-1d1e-11ec-b690-d07329e2e226-5
```

**_Проверка валидации_**

```JavaScript
const { isValid } = require("uuid-cbr");
const isValidUUID = isValid('3ce3d880-1d1e-11ec-b690-d07329e2e226-5')
console.log(isValidUUID) //true
```

**_Преобразование uuid к дате_**

```JavaScript
const { toDate } = require("uuid-cbr");
const datetime = toDate('80c57a90-1d1d-11ec-adda-26dbb65f1526-0')
console.log(datetime) //2021-09-24T09:55:09.332Z
```