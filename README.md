# Your Project's Title...
IFDC on Edge Delivery Services

## Environments
- Preview: https://main--idfc--aemsites.aem.page/
- Live: https://main--idfc--aemsites.aem.live/

## Documentation

Before using the aem-boilerplate, we recommand you to go through the documentation on [www.aem.live](https://www.aem.live/docs/) and [experienceleague.adobe.com](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/edge-delivery/wysiwyg-authoring/authoring), more specifically:
1. [Getting Started](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/edge-delivery/wysiwyg-authoring/edge-dev-getting-started), [Creating Blocks](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/edge-delivery/wysiwyg-authoring/create-block), [Content Modelling](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/edge-delivery/wysiwyg-authoring/content-modeling)
2. [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
3. [Web Performance](https://www.aem.live/developer/keeping-it-100)
4. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)

Furthremore, we encourage you to watch the recordings of any of our previous presentations or sessions:
- [Getting started with AEM Authoring and Edge Delivery Services](https://experienceleague.adobe.com/en/docs/events/experience-manager-gems-recordings/gems2024/aem-authoring-and-edge-delivery)

## Prerequisites

- nodejs 20.9.x or newer
- AEM Cloud Service release 2024.8 or newer (>= `17465`)

## Installation
For the first build (and anytime package.json is updated), run:

```sh
npm i
```

## Linting and security
This project is using StyleLint and ESLint for Javascript. Our ESLint configuration includes 3 popular and reputable Javascript code quality and security plugins:
- SonarSource eslint-plugin-sonarjs, a code quality analyzer for JavaScript and TypeScript within the Sonar ecosystem (https://github.com/SonarSource/SonarJS/blob/master/packages/jsts/src/rules/README.md#eslint-rules)
- Interlace secure-coding plugin for general secure coding practices and OWASP compliance for JavaScript/TypeScript (https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules)
- Interlace browser-security for XSS, cookie, and DOM security rules for client-side JavaScript (https://eslint.interlace.tools/docs/security/plugin-browser-security/rules).


They are included in this command, which is run automatically via a github action on every pull request:

```sh
npm run lint
```

## Local development

1. Create a new repository based on the `aem-boilerplate` template and add a mountpoint in the `fstab.yaml`
1. Add the [AEM Code Sync GitHub App](https://github.com/apps/aem-code-sync) to the repository
1. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
1. Start AEM Proxy: `aem up` (opens your browser at `http://localhost:3000`)
1. Open the `{repo}` directory in your favorite IDE and start coding :)
1. Be sure to add the StyleLint and ESLint extensions in your IDE to see problems as you code.
