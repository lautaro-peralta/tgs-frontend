#!/usr/bin/env node
/**
 * CSS Optimization Script
 *
 * Optimiza archivos SCSS eliminando:
 * - Comentarios innecesarios
 * - Líneas en blanco múltiples
 * - Espacios duplicados
 * - Variables duplicadas
 *
 * Usage:
 *   node scripts/optimize-css.js
 *   node scripts/optimize-css.js --analyze-only
 *   node scripts/optimize-css.js --target src/app/components/home
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 CSS Optimization Script');
console.log('==========================\n');

// Configuración
const SRC_DIR = process.argv[3] || './src/app';
const BACKUP_DIR = './css-backup';
const ANALYZE_ONLY = process.argv[2] === '--analyze-only';
const MIN_SIZE_KB = 8; // Solo optimizar archivos > 8 kB

/**
 * Encuentra todos los archivos SCSS
 */
function findScssFiles(dir) {
  let results = [];

  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.includes('node_modules')) {
        results = results.concat(findScssFiles(fullPath));
      } else if (item.endsWith('.scss')) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`⚠️  Error leyendo directorio ${dir}:`, error.message);
  }

  return results;
}

/**
 * Optimiza contenido SCSS
 */
function optimizeScss(content) {
  let optimized = content;
  let changes = [];

  // 1. Remover comentarios de una línea cortos e innecesarios
  const beforeComments = optimized.match(/\/\/.*/g)?.length || 0;
  optimized = optimized.replace(/\/\/ .{0,30}(?!\s*===|\s*---|\s*TODO|\s*FIXME|\s*NOTE)\n/g, '');
  const afterComments = optimized.match(/\/\/.*/g)?.length || 0;
  if (beforeComments !== afterComments) {
    changes.push(`Removidos ${beforeComments - afterComments} comentarios cortos`);
  }

  // 2. Reducir múltiples líneas en blanco a máximo 2
  const beforeBlankLines = (optimized.match(/\n{3,}/g) || []).length;
  optimized = optimized.replace(/\n{4,}/g, '\n\n\n');
  if (beforeBlankLines > 0) {
    changes.push(`Reducidas ${beforeBlankLines} secuencias de líneas en blanco`);
  }

  // 3. Remover espacios al final de líneas
  const beforeTrailing = (optimized.match(/ +$/gm) || []).length;
  optimized = optimized.replace(/ +$/gm, '');
  if (beforeTrailing > 0) {
    changes.push(`Removidos espacios finales en ${beforeTrailing} líneas`);
  }

  // 4. Detectar nth-child repetitivos (sin modificar, solo reportar)
  const nthChildPattern = /&:nth-child\(\d+\)\s*\{[^}]+\}/g;
  const nthChildren = [...optimized.matchAll(nthChildPattern)];
  if (nthChildren.length > 10) {
    changes.push(`⚠️  ${nthChildren.length} reglas nth-child - considerar bucle SCSS`);
  }

  // 5. Detectar variables duplicadas potenciales
  const variablePattern = /\$[\w-]+:\s*[^;]+;/g;
  const variables = [...optimized.matchAll(variablePattern)];
  const uniqueVars = new Set(variables.map(v => v[0].split(':')[0]));
  if (variables.length - uniqueVars.size > 3) {
    changes.push(`⚠️  ${variables.length - uniqueVars.size} variables posiblemente duplicadas`);
  }

  return { optimized, changes };
}

/**
 * Analiza tamaño de archivo
 */
function analyzeFile(filePath) {
  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  const content = fs.readFileSync(filePath, 'utf8');

  const lines = content.split('\n').length;
  const commentLines = (content.match(/\/\/.*/g) || []).length;
  const blankLines = (content.match(/^\s*$/gm) || []).length;
  const variables = (content.match(/\$[\w-]+:/g) || []).length;
  const nthChildren = (content.match(/&:nth-child\(\d+\)/g) || []).length;

  return {
    sizeKB: parseFloat(sizeKB),
    lines,
    commentLines,
    blankLines,
    contentLines: lines - commentLines - blankLines,
    variables,
    nthChildren
  };
}

/**
 * Genera reporte de análisis
 */
function generateAnalysisReport(files) {
  console.log('\n📊 REPORTE DE ANÁLISIS DE CSS');
  console.log('================================\n');

  // Filtrar archivos grandes
  const largeFiles = files
    .map(file => ({
      path: file,
      ...analyzeFile(file)
    }))
    .filter(f => f.sizeKB >= MIN_SIZE_KB)
    .sort((a, b) => b.sizeKB - a.sizeKB);

  console.log(`Total archivos SCSS: ${files.length}`);
  console.log(`Archivos > ${MIN_SIZE_KB} kB: ${largeFiles.length}\n`);

  // Top 10 archivos más grandes
  console.log('🔝 Top 10 Archivos Más Grandes:');
  console.log('================================');
  largeFiles.slice(0, 10).forEach((file, index) => {
    const relativePath = path.relative(process.cwd(), file.path);
    console.log(`\n${index + 1}. ${relativePath}`);
    console.log(`   Tamaño: ${file.sizeKB} kB`);
    console.log(`   Líneas totales: ${file.lines}`);
    console.log(`   Líneas de contenido: ${file.contentLines}`);
    console.log(`   Comentarios: ${file.commentLines}`);
    console.log(`   Líneas en blanco: ${file.blankLines}`);
    console.log(`   Variables: ${file.variables}`);
    if (file.nthChildren > 0) {
      console.log(`   nth-child rules: ${file.nthChildren}`);
    }
  });

  // Estadísticas generales
  const totalSize = largeFiles.reduce((sum, f) => sum + f.sizeKB, 0);
  const avgSize = totalSize / largeFiles.length;
  const totalComments = largeFiles.reduce((sum, f) => sum + f.commentLines, 0);
  const totalBlankLines = largeFiles.reduce((sum, f) => sum + f.blankLines, 0);

  console.log('\n\n📈 Estadísticas Generales:');
  console.log('==========================');
  console.log(`Tamaño total: ${totalSize.toFixed(2)} kB`);
  console.log(`Tamaño promedio: ${avgSize.toFixed(2)} kB`);
  console.log(`Total comentarios: ${totalComments}`);
  console.log(`Total líneas en blanco: ${totalBlankLines}`);

  // Potencial de optimización
  const estimatedSavings = (totalComments * 0.05) + (totalBlankLines * 0.02); // Estimación conservadora
  console.log(`\n💡 Ahorro estimado: ~${estimatedSavings.toFixed(2)} kB (optimización básica)`);

  return largeFiles;
}

/**
 * Optimiza archivos
 */
function optimizeFiles(files) {
  console.log('\n🔧 OPTIMIZANDO ARCHIVOS');
  console.log('========================\n');

  // Crear backup
  console.log('📦 Creando backup...');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  console.log(`✅ Backup directory: ${BACKUP_DIR}\n`);

  let totalSaved = 0;
  const results = [];

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    const beforeStats = analyzeFile(file);

    // Ignorar archivos pequeños
    if (beforeStats.sizeKB < MIN_SIZE_KB) {
      continue;
    }

    console.log(`📄 ${relativePath}`);
    console.log(`   Tamaño actual: ${beforeStats.sizeKB} kB`);

    // Backup
    const backupPath = path.join(BACKUP_DIR, path.basename(file));
    const backupCounter = 1;
    let finalBackupPath = backupPath;

    // Si ya existe, agregar número
    while (fs.existsSync(finalBackupPath)) {
      const ext = path.extname(backupPath);
      const base = path.basename(backupPath, ext);
      finalBackupPath = path.join(BACKUP_DIR, `${base}-${Date.now()}${ext}`);
    }

    fs.copyFileSync(file, finalBackupPath);

    // Optimizar
    const content = fs.readFileSync(file, 'utf8');
    const { optimized, changes } = optimizeScss(content);

    // Guardar optimizado
    fs.writeFileSync(file, optimized, 'utf8');

    const afterStats = analyzeFile(file);
    const saved = beforeStats.sizeKB - afterStats.sizeKB;
    totalSaved += saved;

    console.log(`   Tamaño optimizado: ${afterStats.sizeKB} kB`);
    console.log(`   Ahorrado: ${saved.toFixed(2)} kB (${((saved / beforeStats.sizeKB) * 100).toFixed(1)}%)`);

    if (changes.length > 0) {
      console.log(`   Cambios aplicados:`);
      changes.forEach(change => console.log(`     - ${change}`));
    }
    console.log('');

    results.push({
      file: relativePath,
      before: beforeStats.sizeKB,
      after: afterStats.sizeKB,
      saved: saved,
      changes: changes
    });
  }

  // Resumen
  console.log('\n✨ RESUMEN DE OPTIMIZACIÓN');
  console.log('==========================');
  console.log(`Total ahorrado: ${totalSaved.toFixed(2)} kB`);
  console.log(`Archivos optimizados: ${results.length}`);

  if (results.length > 0) {
    const avgSaved = totalSaved / results.length;
    console.log(`Ahorro promedio: ${avgSaved.toFixed(2)} kB por archivo`);

    console.log('\n🏆 Top 5 Mayores Reducciones:');
    results
      .sort((a, b) => b.saved - a.saved)
      .slice(0, 5)
      .forEach((r, index) => {
        const percent = ((r.saved / r.before) * 100).toFixed(1);
        console.log(`   ${index + 1}. ${r.file}`);
        console.log(`      -${r.saved.toFixed(2)} kB (${percent}%)`);
      });
  }

  console.log('\n📦 Backup guardado en:', path.resolve(BACKUP_DIR));
  console.log('💡 Para restaurar: cp css-backup/*.scss <target-dir>/');

  return results;
}

/**
 * Main
 */
function main() {
  try {
    const scssFiles = findScssFiles(SRC_DIR);

    if (scssFiles.length === 0) {
      console.log('⚠️  No se encontraron archivos SCSS en:', SRC_DIR);
      return;
    }

    console.log(`✅ Encontrados ${scssFiles.length} archivos SCSS\n`);

    if (ANALYZE_ONLY) {
      generateAnalysisReport(scssFiles);
    } else {
      const largeFiles = generateAnalysisReport(scssFiles);
      console.log('\n');

      // Confirmación
      console.log('⚠️  ADVERTENCIA: Se van a modificar archivos SCSS');
      console.log('   Se creará un backup automático en:', BACKUP_DIR);
      console.log('');
      console.log('   Para continuar: presiona Ctrl+C para cancelar o espera 3 segundos...');

      setTimeout(() => {
        optimizeFiles(scssFiles);
        console.log('\n✅ Optimización completada!');
        console.log('\n📋 Próximos pasos:');
        console.log('   1. Ejecutar: npm run build');
        console.log('   2. Probar: npm start');
        console.log('   3. Si algo falla: restaurar desde', BACKUP_DIR);
      }, 3000);
    }
  } catch (error) {
    console.error('\n❌ Error durante la optimización:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { optimizeScss, analyzeFile, findScssFiles };
