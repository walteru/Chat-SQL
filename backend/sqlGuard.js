'use strict';

/**
 * Valida que una consulta generada por la IA sea segura para ejecutar:
 * una ÚNICA sentencia SELECT, sin escritura de archivos.
 *
 * Es la primera capa de defensa (validación). La segunda es ejecutar la query
 * en una conexión con `multipleStatements: false`, que rechaza sentencias
 * apiladas a nivel del driver MySQL. Las dos juntas cierran el agujero de
 * "SELECT 1; DROP TABLE ...": el `startsWith('select')` original no alcanzaba.
 */

// SELECT ... INTO OUTFILE / DUMPFILE escribe archivos en el server: no es read-only.
const FILE_WRITE = /\binto\s+(outfile|dumpfile)\b/i;

// Comentarios SQL. Los rechazamos por completo: una query generada por IA no los
// necesita, y MySQL trata `/* */` como espacio, lo que permitiría ofuscar
// keywords (ej. INTO/**/OUTFILE) para esquivar las demás validaciones.
const SQL_COMMENT = /\/\*|\*\/|--|#/;

function validateSelectQuery(rawSql) {
  const sql = typeof rawSql === 'string' ? rawSql.trim() : '';

  if (!sql) {
    return { valid: false, error: 'Query is empty.' };
  }

  // Permitimos un único `;` final inocuo; cualquier cosa después es otra sentencia.
  const statement = sql.replace(/;\s*$/, '');

  if (statement.includes(';')) {
    return { valid: false, error: 'Multiple SQL statements are not allowed.' };
  }

  if (SQL_COMMENT.test(statement)) {
    return { valid: false, error: 'SQL comments are not allowed.' };
  }

  // Tiene que EMPEZAR por SELECT. Un comentario o espacio líder que no sea SELECT
  // se rechaza (lado seguro): no intentamos "limpiar" la query, la descartamos.
  if (!/^select\b/i.test(statement)) {
    return { valid: false, error: 'Only SELECT queries are allowed for security reasons.' };
  }

  if (FILE_WRITE.test(statement)) {
    return { valid: false, error: 'SELECT ... INTO OUTFILE/DUMPFILE is not allowed.' };
  }

  return { valid: true };
}

module.exports = { validateSelectQuery };
