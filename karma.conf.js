// Karma configuration file para Angular Testing
// Documentación: https://karma-runner.github.io/latest/config/configuration-file.html

module.exports = function (config) {
  // Sharding configuration for parallel execution
  const shardIndex = process.env.KARMA_SHARD ? parseInt(process.env.KARMA_SHARD) - 1 : 0;
  const totalShards = process.env.KARMA_TOTAL_SHARDS ? parseInt(process.env.KARMA_TOTAL_SHARDS) : 1;

  // Detect CI environment
  const isCI = process.env.CI === 'true' ||
               process.env.GITHUB_ACTIONS === 'true' ||
               Boolean(process.env.CI) ||
               Boolean(process.env.GITHUB_ACTIONS);

  // Debug logging
  console.log('🔍 Karma Config Debug:');
  console.log('  - CI env var:', process.env.CI);
  console.log('  - GITHUB_ACTIONS env var:', process.env.GITHUB_ACTIONS);
  console.log('  - isCI:', isCI);
  console.log('  - Browser to use:', isCI ? 'ChromeHeadlessCI' : 'Chrome');

  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage')
    ],
    client: {
      jasmine: {
        // Opciones de Jasmine
        random: false, // Ejecutar tests en orden determinístico
        seed: 42,
        stopSpecOnExpectationFailure: false
      },
      clearContext: false, // mantener visible el output de Jasmine Spec Runner
      // Sharding configuration passed to the browser
      shardIndex: shardIndex,
      totalShards: totalShards
    },
    jasmineHtmlReporter: {
      suppressAll: true // Remover trazas duplicadas
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/The-Garrison-System'),
      subdir: totalShards > 1 ? `shard-${shardIndex + 1}` : '.',
      reporters: [
        { type: 'html' },      // Reporte HTML detallado
        { type: 'text-summary' }, // Resumen en consola
        { type: 'lcovonly' },  // Para Codecov
        { type: 'json' }       // Para análisis adicional
      ],
      check: {
        // Coverage checks disabled for sharded execution
        // Coverage validation happens in merge job using nyc
        global: {
          statements: 0,  // Disabled - validated in merge job
          branches: 0,     // Disabled - validated in merge job
          functions: 0,    // Disabled - validated in merge job
          lines: 0         // Disabled - validated in merge job
        },
        each: {
          statements: 0,  // Disabled - per-file checks not applicable to shards
          branches: 0,     // Disabled - per-file checks not applicable to shards
          functions: 0,    // Disabled - per-file checks not applicable to shards
          lines: 0         // Disabled - per-file checks not applicable to shards
        }
      }
    },
    reporters: ['progress', 'kjhtml', 'coverage'],

    // Configuración de puerto
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: !isCI,

    // Browsers para testing
    browsers: isCI ? ['ChromeHeadlessCI'] : ['Chrome'],

    // Configuración para CI/CD
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          // CRITICAL: Flags para ambiente headless sin X server
          '--headless',                          // Modo headless explícito
          '--no-sandbox',                        // REQUIRED: Bypass OS security model (CI/Docker)
          '--disable-gpu',                       // No usar GPU en headless
          '--disable-dev-shm-usage',             // Overcome limited resource problems
          '--disable-software-rasterizer',       // Disable software rasterizer
          '--disable-extensions',                // No cargar extensiones
          '--disable-setuid-sandbox',            // Required para running as root en containers

          // CRITICAL FIX: Usar Ozone platform headless en lugar de X11
          '--ozone-platform=headless',           // ← FIX PRINCIPAL para "Missing X server"

          // Performance y estabilidad
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-ipc-flooding-protection',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--force-color-profile=srgb',
          '--metrics-recording-only',
          '--no-first-run',
          '--enable-automation',
          '--password-store=basic',
          '--use-mock-keychain',

          // Remote debugging (útil para troubleshooting)
          '--remote-debugging-port=9222',

          // Window size (necesario para algunos tests)
          '--window-size=1920,1080'
        ]
      },
      ChromeDebug: {
        base: 'Chrome',
        flags: [
          '--remote-debugging-port=9333'
        ]
      }
    },

    // Tiempo de espera
    singleRun: isCI,
    restartOnFileChange: !isCI,
    browserDisconnectTimeout: 10000,
    browserDisconnectTolerance: 3,
    browserNoActivityTimeout: 60000,
    captureTimeout: 210000,

    // Configuración de archivos
    files: [
      // Incluir archivos de assets si es necesario
    ],

    // Preprocesadores
    preprocessors: {
      // Los archivos TypeScript son manejados por @angular-devkit/build-angular
    }
  });
};
