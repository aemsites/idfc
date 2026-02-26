module.exports = {
  root: true,
  plugins: ['secure-coding', 'browser-security', 'sonarjs'],
  extends: [
    'airbnb-base',
    'plugin:json/recommended',
    'plugin:xwalk/recommended',
    'plugin:sonarjs/recommended-legacy',
  ],
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    // Note: sonarjs rules are pulled automatically via plugin:sonarjs/recommended-legacy.
    // Below secure-coding rules are enabled manually for legacy ESLint 8 config,
    // see https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules
    'secure-coding/no-hardcoded-credentials': 'error',
    'secure-coding/no-redos-vulnerable-regex': 'error',
    'secure-coding/no-unsafe-deserialization': 'error',
    'secure-coding/no-improper-sanitization': ['error', {
      safeSanitizers: [
        'DOMPurify.sanitize', 'he.encode', 'encodeURIComponent', 'encodeURI', 'escape',
      ],
    }],
    'secure-coding/no-format-string-injection': 'error',
    'secure-coding/no-unchecked-loop-condition': 'error',
    'secure-coding/no-unlimited-resource-allocation': 'error',
    'secure-coding/no-xpath-injection': 'error',
    'secure-coding/no-graphql-injection': 'error',
    'secure-coding/no-xxe-injection': 'error',
    'secure-coding/detect-non-literal-regexp': 'warn',
    'secure-coding/detect-object-injection': 'warn',
    'secure-coding/no-improper-type-validation': 'warn',
    'secure-coding/no-missing-authentication': 'warn',
    'secure-coding/no-sensitive-data-exposure': 'warn',
    'secure-coding/no-pii-in-logs': 'warn',
    // Below browser-security rules are enabled manually for legacy ESLint 8 config,
    // see https://eslint.interlace.tools/docs/security/plugin-browser-security
    'browser-security/no-innerhtml': ['error', {
      trustedSanitizers: [
        'DOMPurify.sanitize', 'sanitize', 'sanitizeHtml', 'xss', 'purify',
      ],
    }],
    'browser-security/no-eval': 'error',
    'browser-security/require-postmessage-origin-check': 'error',
    'browser-security/no-postmessage-wildcard-origin': 'error',
    'browser-security/no-postmessage-innerhtml': 'error',
    'browser-security/no-sensitive-localstorage': 'error',
    'browser-security/no-jwt-in-storage': 'error',
    'browser-security/no-sensitive-sessionstorage': 'error',
    'browser-security/no-sensitive-indexeddb': 'error',
    'browser-security/no-sensitive-cookie-js': 'error',
    'browser-security/no-cookie-auth-tokens': 'error',
    'browser-security/require-cookie-secure-attrs': 'error',
    'browser-security/require-websocket-wss': 'error',
    'browser-security/no-websocket-innerhtml': 'error',
    'browser-security/no-websocket-eval': 'error',
    'browser-security/no-filereader-innerhtml': 'error',
    'browser-security/require-blob-url-revocation': 'warn',
    'browser-security/no-dynamic-service-worker-url': 'error',
    'browser-security/no-worker-message-innerhtml': 'error',
    'browser-security/no-unsafe-inline-csp': 'error',
    'browser-security/no-unsafe-eval-csp': 'error',
    'browser-security/detect-mixed-content': 'error',
    'browser-security/no-allow-arbitrary-loads': 'error',
    'browser-security/no-clickjacking': 'error',
    'browser-security/no-credentials-in-query-params': 'error',
    'browser-security/no-http-urls': 'error',
    'browser-security/no-insecure-redirects': 'error',
    'browser-security/require-https-only': 'error',
    'browser-security/no-insecure-websocket': 'error',
    'browser-security/no-unvalidated-deeplinks': 'error',
    'browser-security/no-client-side-auth-logic': 'error',
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
    // Below are rules for AEM Crosswalk component model definitions, see https://www.aem.live/developer/component-model-definitions#type-inference
    'xwalk/max-cells': ['error', {
      section: 30, // section is a key-value block and over 4 is OK
      'multi-section': 30,
      accordion: 5,
      cards: 8,
      card: 7,
      'category-nav-item': 10,
      'section-title': 5,
      steps: 5,
      table: 6,
    }],
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message: 'for..in loops iterate over the entire prototype chain. Use Object.{keys,values,entries}, and iterate over the resulting array.',
      },
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],
  },
};
