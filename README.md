# DICOM Service

Nodejs microservice for processing DICOM imaging files. Supports REST APIs for file upload, header value extraction and PNG image export.

## Features

- Supports single DICOM file upload up to 10MB
- Retrieves header attributes from uploaded files with a provided DICOM tag
- Export up to 16 bit greyscale, single-frame DICOM image to PNG

## Installation

This project requires [Node.js](https://nodejs.org/) v20+ to run.

Install the dependencies:

```sh
npm i
```

Run the server:

```sh
npm run dev
```

The application can be accessed locally on port 3000. Addtionally, the API contracts can be found at [/openapi](http://localhost:3000/openapi)

## Development

Want to contribute? Great!

Start dev server

```sh
npm run dev
```

To run linting

```sh
npm run lint
```

To run unit tests

```sh
npm run test
```

## Next steps

##### The service can use these following improvements:

- PNG conversion can be expanded on, allowing support for color images and images with multiple frames
- To improve availability, DICOM upload and PNG export can be done asynchronously. To avoid repeated work, the system can keep track of existing files that have been processed.
- Some exported PNGs appear lighter/darker compared to the original image. This can be improved by implementing window center and width scaling of the original pixel data.
- Header value extraction can be improved to support more value representations. Currently, numerical values will be processed. Any other raw values will fall back to display the "stringified" value.

##### The following will need to be done to be production ready:

- Application needs to be containerized
- Any configuration (e.g. feature flags) needs to be externalized and sensitive data will need to be stored securely
- Service should be behind authentication and APIs will need to be secured with TLS
- Introduce E2E and performance testing infrastructure
- CICD infrastructure and gating for production deployments
- Support for observability and monitoring
