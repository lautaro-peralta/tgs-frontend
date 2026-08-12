#!/usr/bin/env node
/**
 * Comprueba la salud de los archivos de traducción.
 *
 * Falla si:
 *   1. Una clave existe en un idioma y no en el otro. Cuando falta,
 *      ngx-translate muestra el identificador crudo: el usuario ve
 *      "monthlyReview.confirmDelete" escrito en pantalla.
 *   2. Una clave tiene el valor vacío.
 *
 * También avisa (sin fallar) de las claves que no referencia ningún archivo
 * del código. No falla por eso porque hay claves que se arman en tiempo de
 * ejecución —`'status.' + it.status`, `legal.terms.sections.${key}`— y una
 * búsqueda de texto no puede verlas.
 *
 * Uso:  node scripts/check-i18n.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const I18N = 'src/assets/i18n';
const FUENTE = 'src/app';
const IDIOMAS = ['es', 'en'];

/** Aplana {a:{b:1}} a {'a.b': 1}. */
function aplanar(obj, prefijo = '', salida = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const ruta = prefijo ? `${prefijo}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) aplanar(v, ruta, salida);
    else salida[ruta] = v;
  }
  return salida;
}

function archivosFuente(dir, acc = []) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) archivosFuente(ruta, acc);
    else if (['.ts', '.html'].includes(extname(ruta)) && !ruta.endsWith('.spec.ts')) acc.push(ruta);
  }
  return acc;
}

const tablas = Object.fromEntries(
  IDIOMAS.map((l) => [l, aplanar(JSON.parse(readFileSync(`${I18N}/${l}.json`, 'utf8')))])
);

const problemas = [];

// 1) simetría entre idiomas
for (const idioma of IDIOMAS) {
  for (const otro of IDIOMAS.filter((l) => l !== idioma)) {
    for (const clave of Object.keys(tablas[idioma])) {
      if (!(clave in tablas[otro])) {
        problemas.push(`falta en ${otro}.json: ${clave}   (está en ${idioma}.json)`);
      }
    }
  }
}

// 2) valores vacíos
for (const idioma of IDIOMAS) {
  for (const [clave, valor] of Object.entries(tablas[idioma])) {
    if (typeof valor === 'string' && valor.trim() === '') {
      problemas.push(`valor vacío en ${idioma}.json: ${clave}`);
    }
  }
}

// 3) aviso: claves que no aparecen literalmente en el código
const codigo = archivosFuente(FUENTE)
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');
const huerfanas = Object.keys(tablas[IDIOMAS[0]]).filter((c) => !codigo.includes(c));

if (problemas.length) {
  console.error(`\n✘ ${problemas.length} problema(s) en las traducciones:\n`);
  for (const p of problemas) console.error(`   ${p}`);
  console.error('');
  process.exit(1);
}

const total = Object.keys(tablas[IDIOMAS[0]]).length;
console.log(`✔ traducciones consistentes: ${total} claves en ${IDIOMAS.join(' y ')}`);
if (huerfanas.length) {
  console.log(
    `\nℹ ${huerfanas.length} clave(s) sin referencia literal en el código. Algunas pueden ` +
      `construirse en tiempo de ejecución, así que esto es sólo un aviso:`
  );
  for (const c of huerfanas.slice(0, 20)) console.log(`   ${c}`);
  if (huerfanas.length > 20) console.log(`   … y ${huerfanas.length - 20} más`);
}
