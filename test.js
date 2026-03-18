const assert = require("assert/strict");
const test = require("node:test");
const {
  generate,
  isValid,
  info,
  toDate,
  getTime,
  uid_init,
  uid_deinit,
  uid_create,
  uuid_init,
  uuid_deinit,
  uuid_create,
} = require("./index.js");

const FIXED_DATE = new Date("2021-09-24T09:55:09.332Z");
const KNOWN_UUID = "80c57a90-1d1d-11ec-adda-26dbb65f1526-0";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[0-9a-f]$/i;

const OFFICIAL_NODE = [0x10, 0x20, 0x30, 0x40, 0x50, 0x61];
const OFFICIAL_CLOCK_SEQ = 0x1234 & 0x1fff;

const createOfficialReferenceState = () => ({
  node: [...OFFICIAL_NODE],
  clockSeq: OFFICIAL_CLOCK_SEQ,
  lastTime: 0n,
  lastUSNS: 0,
});

const officialGetTimestamp100ns = (datetime, state) => {
  const date = new Date(datetime);

  const currentTime =
    BigInt(date.getTime() - Date.UTC(1601, 0, 1)) * 10000n + 5748192000000000n;

  if (currentTime === state.lastTime) {
    state.lastUSNS++;
  } else {
    state.lastUSNS = 0;
    state.lastTime = currentTime;
  }

  return currentTime + BigInt(state.lastUSNS);
};

const officialCalcCtrl = (uuid) => {
  let pos = 0;
  let index = 1;
  let sum = 0;

  while (uuid[pos]) {
    const char = uuid[pos++];

    if (char >= "0" && char <= "9") {
      sum += (char.charCodeAt(0) - 48) * index++;
    }

    if (char >= "a" && char <= "f") {
      sum += (char.charCodeAt(0) - 87) * index++;
    }

    if (index > 10) {
      index = 1;
    }
  }

  const remainder = sum % 16;
  return remainder < 10
    ? String(remainder)
    : String.fromCharCode(remainder + 87);
};

const officialUuidCreate = (datetime, state) => {
  const timeValue = officialGetTimestamp100ns(datetime, state);

  return {
    time_low: Number(timeValue & 0xffffffffn),
    time_mid: Number((timeValue >> 32n) & 0xffffn),
    time_hi_and_version: Number((timeValue >> 48n) & 0x0fffn) | (1 << 12),
    clock_seq_low: state.clockSeq & 0xff,
    clock_seq_hi_and_reserved: ((state.clockSeq & 0x3f00) >> 8) | 0x80,
    node: [...state.node],
  };
};

const officialUidCreate = (datetime, state) => {
  const uuid = officialUuidCreate(datetime, state);
  const base =
    `${uuid.time_low.toString(16).padStart(8, "0")}-` +
    `${uuid.time_mid.toString(16).padStart(4, "0")}-` +
    `${uuid.time_hi_and_version.toString(16).padStart(4, "0")}-` +
    `${uuid.clock_seq_hi_and_reserved.toString(16).padStart(2, "0")}` +
    `${uuid.clock_seq_low.toString(16).padStart(2, "0")}-` +
    `${uuid.node[5].toString(16).padStart(2, "0")}` +
    `${uuid.node[4].toString(16).padStart(2, "0")}` +
    `${uuid.node[3].toString(16).padStart(2, "0")}` +
    `${uuid.node[2].toString(16).padStart(2, "0")}` +
    `${uuid.node[1].toString(16).padStart(2, "0")}` +
    `${uuid.node[0].toString(16).padStart(2, "0")}`;

  return `${base}-${officialCalcCtrl(base)}`;
};

test("generate returns a valid UUID for a fixed date", () => {
  const uuid = generate(FIXED_DATE);

  assert.match(uuid, UUID_PATTERN);
  assert.equal(isValid(uuid), true);
  assert.equal(toDate(uuid).toISOString(), FIXED_DATE.toISOString());
});

test("official API methods exist in the JS module", () => {
  assert.equal(typeof uid_init, "function");
  assert.equal(typeof uid_deinit, "function");
  assert.equal(typeof uid_create, "function");
  assert.equal(typeof uuid_init, "function");
  assert.equal(typeof uuid_deinit, "function");
  assert.equal(typeof uuid_create, "function");
});

test("info keeps the original datetime for a generated UUID", () => {
  const uuid = generate(FIXED_DATE);
  const metadata = info(uuid);

  assert.equal(metadata.valid, true);
  assert.equal(metadata.len, uuid.length);
  assert.equal(metadata.controlNum, uuid.split("-")[5]);
  assert.equal(metadata.datetime.toISOString(), FIXED_DATE.toISOString());
});

test("generate produces different UUIDs for repeated calls with the same date", () => {
  const firstUuid = generate(FIXED_DATE);
  const secondUuid = generate(FIXED_DATE);

  assert.notEqual(firstUuid, secondUuid);
  assert.equal(isValid(firstUuid), true);
  assert.equal(isValid(secondUuid), true);
  assert.equal(toDate(firstUuid).toISOString(), FIXED_DATE.toISOString());
  assert.equal(toDate(secondUuid).toISOString(), FIXED_DATE.toISOString());
});

test("known UUID stays valid and restores the expected date", () => {
  const datetime = toDate(KNOWN_UUID);

  assert.equal(isValid(KNOWN_UUID), true);
  assert.equal(datetime.toISOString(), FIXED_DATE.toISOString());
});

test("checksum changes make UUID invalid", () => {
  const invalidUuid = `${KNOWN_UUID.slice(0, -1)}f`;

  assert.equal(isValid(invalidUuid), false);
});

test("isValid rejects malformed UUID strings", () => {
  assert.equal(isValid(""), false);
  assert.equal(isValid("not-a-uuid"), false);
  assert.equal(isValid("80c57a90-1d1d-11ec-adda-26dbb65f1526"), false);
  assert.equal(isValid("80c57a90-1d1d-21ec-adda-26dbb65f1526-0"), false);
  assert.equal(isValid("80c57a90-1d1d-11ec-7dda-26dbb65f1526-0"), false);
});

test("generate without arguments returns a valid UUID", () => {
  const uuid = generate();
  const datetime = toDate(uuid);

  assert.match(uuid, UUID_PATTERN);
  assert.equal(isValid(uuid), true);
  assert.equal(Number.isNaN(datetime.getTime()), false);
});

test("getTime returns finite values and does not go backwards for the same timestamp", () => {
  const firstTime = getTime(FIXED_DATE);
  const secondTime = getTime(FIXED_DATE);

  assert.equal(Number.isFinite(firstTime), true);
  assert.equal(Number.isFinite(secondTime), true);
  assert.equal(secondTime >= firstTime, true);
});

test("generate preserves the timestamp for practical fixed dates", () => {
  const dates = [
    new Date("1601-01-01T00:00:00.000Z"),
    new Date("1970-01-01T00:00:00.000Z"),
    new Date("2021-09-24T09:55:09.332Z"),
    new Date("2038-01-19T03:14:07.000Z"),
    new Date("2050-06-15T12:30:45.123Z"),
    new Date("2100-12-31T23:59:59.999Z"),
  ];

  for (const date of dates) {
    const uuid = generate(date);
    assert.equal(isValid(uuid), true);
    assert.equal(toDate(uuid).toISOString(), date.toISOString());
  }
});

test("info returns stable metadata for generated UUIDs", () => {
  const firstUuid = generate(FIXED_DATE);
  const secondUuid = generate(FIXED_DATE);
  const firstMetadata = info(firstUuid);
  const secondMetadata = info(secondUuid);

  assert.equal(typeof firstMetadata.gClockSeq, "number");
  assert.equal(firstMetadata.gClockSeq, secondMetadata.gClockSeq);
  assert.equal(firstMetadata.controlNum.length, 1);
  assert.equal(secondMetadata.controlNum.length, 1);
  assert.equal(firstMetadata.len, 38);
  assert.equal(secondMetadata.len, 38);
});

test("official algorithm keeps node and clock sequence stable within the process", () => {
  const firstUuid = generate(FIXED_DATE);
  const secondUuid = generate(new Date("2021-09-24T09:55:10.332Z"));

  const firstParts = firstUuid.split("-");
  const secondParts = secondUuid.split("-");

  assert.equal(firstParts[3], secondParts[3]);
  assert.equal(firstParts[4], secondParts[4]);
});

test("uid_create matches the official C algorithm for deterministic fixtures", () => {
  const referenceState = createOfficialReferenceState();

  uid_init({
    node: OFFICIAL_NODE,
    clockSeq: OFFICIAL_CLOCK_SEQ,
    lastTime: 0n,
    lastUSNS: 0,
  });

  const expectedFirst = officialUidCreate(FIXED_DATE, referenceState);
  const actualFirst = uid_create(FIXED_DATE);
  const expectedSecond = officialUidCreate(FIXED_DATE, referenceState);
  const actualSecond = uid_create(FIXED_DATE);

  assert.equal(actualFirst, expectedFirst);
  assert.equal(actualSecond, expectedSecond);

  uid_deinit();
});

test("uuid_create matches the official C field layout for deterministic fixtures", () => {
  const referenceState = createOfficialReferenceState();

  uuid_init({
    node: OFFICIAL_NODE,
    clockSeq: OFFICIAL_CLOCK_SEQ,
    lastTime: 0n,
    lastUSNS: 0,
  });

  const expected = officialUuidCreate(FIXED_DATE, referenceState);
  const actual = uuid_create(FIXED_DATE);

  assert.deepEqual(actual, expected);

  uuid_deinit();
});

test("generate keeps UUIDs unique under moderate load", () => {
  const total = 5000;
  const generated = new Set();

  for (let index = 0; index < total; index++) {
    const uuid = generate(FIXED_DATE);
    assert.equal(generated.has(uuid), false);
    generated.add(uuid);
  }

  assert.equal(generated.size, total);
});

test("toDate throws for malformed UUID input", () => {
  assert.throws(() => toDate("not-a-uuid"));
  assert.throws(() => toDate(null));
});

test("info throws for malformed UUID input", () => {
  assert.throws(() => info(null));
});
