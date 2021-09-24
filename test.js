const { generate, isValid, info, toDate } = require("./index.js");


const nowDatetime = new Date("2021-09-24T09:55:09.332Z")

const uuid = generate(nowDatetime)
console.log(uuid)

const isValidUUID = isValid(uuid)

console.log(isValidUUID)

const infoUUID = info(uuid)

console.log(nowDatetime.toISOString(), infoUUID.datetime.toISOString())
console.assert(nowDatetime.toISOString() === infoUUID.datetime.toISOString())


const datetime = toDate('80c57a90-1d1d-11ec-adda-26dbb65f1526-0')

console.log(datetime)