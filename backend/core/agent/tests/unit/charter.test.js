import test from 'brittle'
import { createHash } from 'node:crypto'
import { CHARTER, CHARTER_VERSION } from '../../src/charter.js'
import { Session } from '../../src/session.js'

// The charter is the one string in this package whose exact bytes are the contract. It is sent
// to the model verbatim on every request and keys the prompt cache, yet every other test in the
// suite injects a `system` of its own — so a reflowed line would leave all of them green. This
// file is the only thing that would notice.
//
// Every charter that has shipped, and the bytes it shipped as. Editing the text is expected;
// editing it silently is not. A change to the charter fails here until a new version is added
// alongside it, which is what lets a battery score name the charter it was measured under.
const RELEASED = {
  v1: { sha256: '81156538ff4e961059339f5a0036caa87e9977117235d638e91e7b5b53c6612e', bytes: 4578 },
  // v2 rewrote the two HONESTY rules that made the agent answer a greeting with a refusal:
  // the no-ability rule is scoped to fleet questions, and small talk names its triggers with
  // answers to imitate. See fix(agent): stop the charter's refusal wording landing on greetings.
  v2: { sha256: '98a446859b989037eaa61f0c36be02a799dd4ab9c83989aa0359e3e6c79f2283', bytes: 4859 }
}

test('the charter version names the bytes that shipped under it', (t) => {
  const released = RELEASED[CHARTER_VERSION]
  // Stop here rather than compare against an absent row: two further failures reading
  // "expected 4578, got undefined" bury the one line that says what actually went wrong.
  if (!released) return t.fail(`CHARTER_VERSION is ${CHARTER_VERSION}, which no released charter describes`)

  t.is(Buffer.byteLength(CHARTER, 'utf8'), released.bytes, 'the charter is the length it shipped as')
  t.is(createHash('sha256').update(CHARTER, 'utf8').digest('hex'), released.sha256, 'and every byte of it is unchanged')
})

test('the charter states its four standing rules, in order', (t) => {
  t.alike(CHARTER.match(/^[A-Z][A-Z ]+ —/gm) ?? [], ['HONESTY —', 'GROUNDING —', 'MDK VOCABULARY —', 'STYLE —'])
})

test('a session given no system prompt runs on the charter', (t) => {
  t.is(new Session({ provider: {} }).system, CHARTER, 'the default is the charter itself, not a copy of it')
})

test('a caller may still supply its own', (t) => {
  t.is(new Session({ provider: {}, system: 'CHARTER' }).system, 'CHARTER')
})
