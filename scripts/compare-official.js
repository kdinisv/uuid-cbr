const assert = require("assert/strict");
const {
  uid_init,
  uid_deinit,
  uid_create,
  uuid_init,
  uuid_deinit,
  uuid_create,
} = require("../index.js");

const FIXED_DATE = new Date("2021-09-24T09:55:09.332Z");
const OFFICIAL_NODE = [0x10, 0x20, 0x30, 0x40, 0x50, 0x61];
const OFFICIAL_CLOCK_SEQ = 0x1234 & 0x1fff;
const WIN_EPOCH_MS = BigInt(Date.UTC(1601, 0, 1));
const HUNDRED_NS_PER_MS = 10000n;
const UUID_TIME_OFFSET = 5748192000000000n;

const createOfficialReferenceState = () => ({
  node: [...OFFICIAL_NODE],
  clockSeq: OFFICIAL_CLOCK_SEQ,
  lastTime: 0n,
  lastUSNS: 0,
});

const officialGetTimestamp100ns = (datetime, state) => {
  const date = new Date(datetime);

  const currentTime =
    (BigInt(date.getTime()) - WIN_EPOCH_MS) * HUNDRED_NS_PER_MS +
    UUID_TIME_OFFSET;

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

const referenceStateForUid = createOfficialReferenceState();
uid_init({
  node: OFFICIAL_NODE,
  clockSeq: OFFICIAL_CLOCK_SEQ,
  lastTime: 0n,
  lastUSNS: 0,
});

const expectedUid = officialUidCreate(FIXED_DATE, referenceStateForUid);
const actualUid = uid_create(FIXED_DATE);
assert.equal(actualUid, expectedUid);

const referenceStateForUuid = createOfficialReferenceState();
uuid_init({
  node: OFFICIAL_NODE,
  clockSeq: OFFICIAL_CLOCK_SEQ,
  lastTime: 0n,
  lastUSNS: 0,
});

const expectedUuid = officialUuidCreate(FIXED_DATE, referenceStateForUuid);
const actualUuid = uuid_create(FIXED_DATE);
assert.deepEqual(actualUuid, expectedUuid);

uuid_deinit();
uid_deinit();

console.log(
  JSON.stringify(
    {
      status: "ok",
      comparedAgainst: "official-c-source-equivalent-reference",
      datetime: FIXED_DATE.toISOString(),
      uid: actualUid,
      uuid: actualUuid,
    },
    null,
    2,
  ),
);
