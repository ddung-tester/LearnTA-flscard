const { test } = require("node:test");
const assert = require("node:assert/strict");

Object.assign(process.env, { DB_HOST: "127.0.0.1", DB_USER: "test", DB_NAME: "test" });
const pool = require("../src/config/db");
const aiService = require("../src/services/aiService");
const { ganNenNeuCan } = require("../src/services/ganMucLyThuyet");

const cho = () => new Promise((resolve) => setTimeout(resolve, 20));

test("parseGrammarMapping keeps only known questions and grammar ids", () => {
  const ketQua = aiService.parseGrammarMapping(
    '{"gan":[{"id":5,"muc":"g1"},{"id":6,"muc":"g9"},{"id":99,"muc":"g1"},{"id":7,"muc":null}]}',
    { grammarIds: ["g1", "g2"], questionIds: [5, 6, 7] }
  );
  assert.deepEqual([...ketQua], [[5, "g1"]]);
});

test("ganNenNeuCan skips when grammar_id column does not exist yet", () => {
  assert.equal(ganNenNeuCan({ id: 1 }, [{ id: "g1" }, { id: "g2" }], [{ id: 5, source: "main" }]), false);
});

test("one grammar section: every main question is mapped without calling AI", async () => {
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return [[]];
  };
  aiService.mapQuestionsToGrammar = async () => {
    throw new Error("khong duoc goi AI");
  };
  const qs = [
    { id: 5, source: "main", grammar_id: null },
    { id: 6, source: "extra", grammar_id: null },
    { id: 7, source: "main", grammar_id: "g1" },
  ];
  assert.equal(ganNenNeuCan({ id: 2, title: "B" }, [{ id: "g1" }], qs), true);
  await cho();
  assert.deepEqual(calls.map((c) => c.params), [["g1", 5]]);
});

test("several sections: AI result is saved, and a lesson is not mapped twice at once", async () => {
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return [[]];
  };
  let soLan = 0;
  aiService.mapQuestionsToGrammar = async (input) => {
    soLan += 1;
    assert.deepEqual(input.grammar.map((m) => m.id), ["g1", "g2"]);
    return new Map([[5, "g2"]]);
  };
  const qs = [{ id: 5, source: "main", grammar_id: null, prompt: "I ___ not" }];
  const grammar = [{ id: "g1", title: "Khẳng định" }, { id: "g2", title: "Phủ định" }];
  assert.equal(ganNenNeuCan({ id: 3, title: "B" }, grammar, qs), true);
  assert.equal(ganNenNeuCan({ id: 3, title: "B" }, grammar, qs), false);
  await cho();
  assert.equal(soLan, 1);
  assert.deepEqual(calls[0].params, ["g2", 5]);
});
