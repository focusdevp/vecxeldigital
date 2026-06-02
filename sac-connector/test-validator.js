/**
 * Script de prueba para el módulo de validación
 * Ejecutar: node test-validator.js
 */

const fs = require('fs');
const path = require('path');
const { validateInventoryFile } = require('./src/services/fileValidator');

const TEST_FILES = [
  { name: 'valido.txt', shouldPass: true },
  { name: 'sin_separador.txt', shouldPass: false },
  { name: 'campos_insuficientes.txt', shouldPass: false },
  { name: 'skus_duplicados.txt', shouldPass: false },
  { name: 'precios_invalidos.txt', shouldPass: false },
  { name: 'vacio.txt', shouldPass: false },
  { name: 'formato_json.txt', shouldPass: false }
];

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  PRUEBAS DE VALIDACIÓN - SAC CONNECTOR');
  console.log('═══════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const test of TEST_FILES) {
    const filePath = path.join(__dirname, 'test-files', test.name);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  SKIP: ${test.name} - Archivo no encontrado`);
      continue;
    }

    try {
      const buffer = fs.readFileSync(filePath);
      const result = await validateInventoryFile(buffer, test.name);

      const testPassed = result.isValid === test.shouldPass;
      
      if (testPassed) {
        console.log(`✅ PASS: ${test.name}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Esperado: ${test.shouldPass ? 'VÁLIDO' : 'INVÁLIDO'}`);
        console.log(`   Obtenido: ${result.isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
        failed++;
      }

      if (!result.isValid) {
        console.log(`   └─ Errores: ${result.errores.length}`);
        if (result.errores.length > 0) {
          console.log(`      - ${result.errores[0]}`);
        }
      }

      if (result.advertencias.length > 0) {
        console.log(`   └─ Advertencias: ${result.advertencias.length}`);
      }

      console.log('');
    } catch (error) {
      console.log(`❌ ERROR: ${test.name}`);
      console.log(`   ${error.message}\n`);
      failed++;
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(`  RESULTADOS: ${passed} ✅ | ${failed} ❌`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Probar con archivo real si existe
  const realFilePath = path.join(__dirname, 'processed', 'SKU-INVENTARIO_2026-05-29T03-49-09-130Z.txt');
  if (fs.existsSync(realFilePath)) {
    console.log('Probando con archivo real de producción...\n');
    const buffer = fs.readFileSync(realFilePath);
    const result = await validateInventoryFile(buffer, 'SKU-INVENTARIO.txt');
    
    console.log('Archivo Real:');
    console.log(`  Estado: ${result.isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
    console.log(`  Líneas totales: ${result.estructura.lineas_totales}`);
    console.log(`  Productos válidos: ${result.formato.productos_validos}`);
    console.log(`  Tasa de error: ${result.formato.tasa_error}`);
    console.log(`  SKUs duplicados: ${result.negocio.skus_duplicados}`);
    console.log(`  Errores: ${result.errores.length}`);
    console.log(`  Advertencias: ${result.advertencias.length}\n`);
  }
}

runTests().catch(console.error);
