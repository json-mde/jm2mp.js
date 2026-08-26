@ECHO OFF
REM Reconfigures Tidy-JSDoc for JM2MP.JS documentation generation.
REM Paths relatives to this directory: ${JM2MP.JS}/doc/jsdoc/tmpl/tidy-jsdoc/
COPY /V /-Y /B .\*.tmpl     ..\..\..\..\src\node_modules\tidy-jsdoc\tmpl\
COPY /V /-Y /B .\*.css      ..\..\..\..\src\node_modules\tidy-jsdoc\static\styles\
COPY /V /-Y /B .\publish.js ..\..\..\..\src\node_modules\tidy-jsdoc\publish.js

REM End of file
