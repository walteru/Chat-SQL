'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { validateSelectQuery } = require('./sqlGuard');

test('acepta un SELECT simple', () => {
  assert.strictEqual(validateSelectQuery('SELECT * FROM users').valid, true);
});

test('acepta SELECT con punto y coma final inocuo', () => {
  assert.strictEqual(validateSelectQuery('SELECT 1;').valid, true);
});

test('acepta SELECT en minúsculas y con espacios alrededor', () => {
  assert.strictEqual(validateSelectQuery('   select id from t  ').valid, true);
});

test('RECHAZA sentencias apiladas (el bug reportado)', () => {
  assert.strictEqual(validateSelectQuery('SELECT 1; DROP TABLE users;').valid, false);
  assert.strictEqual(validateSelectQuery('SELECT 1; DROP TABLE users').valid, false);
});

test('RECHAZA no-SELECT aunque sea una sola sentencia', () => {
  assert.strictEqual(validateSelectQuery('DROP TABLE users').valid, false);
  assert.strictEqual(validateSelectQuery('DELETE FROM users').valid, false);
  assert.strictEqual(validateSelectQuery('UPDATE users SET x=1').valid, false);
});

test('RECHAZA SELECT ... INTO OUTFILE/DUMPFILE (escritura de archivos)', () => {
  assert.strictEqual(validateSelectQuery("SELECT * FROM users INTO OUTFILE '/tmp/x'").valid, false);
  assert.strictEqual(validateSelectQuery("SELECT * FROM users INTO DUMPFILE '/tmp/x'").valid, false);
});

test('RECHAZA comentario líder que esconde otra cosa (no empieza con select)', () => {
  assert.strictEqual(validateSelectQuery('/* x */ DROP TABLE users').valid, false);
});

test('RECHAZA bypass de INTO OUTFILE/DUMPFILE con comentario inline (MySQL lo trata como espacio)', () => {
  assert.strictEqual(validateSelectQuery("SELECT 1 INTO/**/OUTFILE '/tmp/x'").valid, false);
  assert.strictEqual(validateSelectQuery("SELECT 1 INTO/*x*/DUMPFILE '/tmp/x'").valid, false);
});

test('RECHAZA cualquier comentario SQL (/* */, --, #) en la query', () => {
  assert.strictEqual(validateSelectQuery('SELECT 1 /* c */ FROM t').valid, false);
  assert.strictEqual(validateSelectQuery('SELECT 1 -- c').valid, false);
  assert.strictEqual(validateSelectQuery('SELECT 1 # c').valid, false);
});

test('RECHAZA vacío o no-string', () => {
  assert.strictEqual(validateSelectQuery('').valid, false);
  assert.strictEqual(validateSelectQuery('   ').valid, false);
  assert.strictEqual(validateSelectQuery(null).valid, false);
});
