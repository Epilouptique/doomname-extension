/* Tests de non-régression sur la normalisation des domaines :
   node build/test-domain.mjs */
import {
  normalizeDomain, isValidDomain, isBareLabel, registrableDomain, domainFromUrl,
} from '../src/common/domain.js';

const cases = [
  [() => domainFromUrl('https://www.Google.com/path?a=1'), 'google.com'],
  [() => domainFromUrl('http://docs.google.com'), 'google.com'],
  [() => domainFromUrl('https://blog.exemple.co.uk/x'), 'exemple.co.uk'],
  [() => domainFromUrl('https://annad.fr'), 'annad.fr'],
  [() => domainFromUrl('chrome://extensions'), null],
  [() => domainFromUrl('file:///tmp/a.html'), null],
  [() => domainFromUrl(''), null],
  [() => normalizeDomain('  HTTPS://WWW.Test.FR:8080/a '), 'test.fr'],
  [() => normalizeDomain('exemple.com.'), 'exemple.com'],
  [() => registrableDomain('a.b.c.com'), 'c.com'],
  [() => registrableDomain('shop.boutique.com.au'), 'boutique.com.au'],
  [() => isValidDomain('test.fr'), true],
  [() => isValidDomain('test'), false],
  [() => isValidDomain('-bad.com'), false],
  [() => isBareLabel('monsite'), true],
  [() => isBareLabel('mon site'), false],
];

let failed = 0;
for (const [fn, expected] of cases) {
  const actual = fn();
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`${ok ? '✔' : '✘ ÉCHEC'} ${String(fn)} => ${JSON.stringify(actual)}${ok ? '' : ` (attendu ${JSON.stringify(expected)})`}`);
}
console.log(failed ? `\n${failed} échec(s)` : `\n${cases.length} tests OK`);
process.exit(failed ? 1 : 0);
