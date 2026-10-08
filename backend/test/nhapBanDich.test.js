const { test } = require("node:test");
const assert = require("node:assert/strict");
const { planUpdates } = require("../scripts/nhap-ban-dich");
const source = [{ id: 1, term_en: "sister", example_sentence: "My little sister loves drawing.", example_translation: "Em gái tôi thích vẽ." }];
test("translation import rejects changed English or missing IDs", () => {
  assert.throws(() => planUpdates(source, [{ ...source[0], example_sentence: "Another sentence." }]), /đã thay đổi/);
  assert.throws(() => planUpdates(source, []), /đã thay đổi/);
});
test("translation import fills missing values, reruns safely and rejects conflicting translations", () => {
  assert.equal(planUpdates(source, [{ ...source[0], example_translation: null }]).length, 1);
  assert.equal(planUpdates(source, source).length, 0);
  assert.throws(() => planUpdates(source, [{ ...source[0], example_translation: "Khác" }]), /đã có bản dịch khác/);
});
