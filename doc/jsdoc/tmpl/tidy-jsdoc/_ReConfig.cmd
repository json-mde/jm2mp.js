@ECHO OFF
REM Reconfigures Tidy-JSDoc for JM2MP.JS documentation generation.
REM Paths relatives to this directory: ${JM2MP.JS}/doc/jsdoc/tmpl/tidy-jsdoc/

:Start
IF EXIST "..\..\..\..\node_modules\tidy-jsdoc\" GOTO Deploy
GOTO Error

:Deploy
COPY /V /-Y /B .\*.tmpl     ..\..\..\..\node_modules\tidy-jsdoc\tmpl\
COPY /V /-Y /B .\*.css      ..\..\..\..\node_modules\tidy-jsdoc\static\styles\
COPY /V /-Y /B .\publish.js ..\..\..\..\node_modules\tidy-jsdoc\publish.js
GOTO Exit

:Error
ECHO Directory "..\..\..\..\node_modules\tidy-jsdoc\" not found!

:Exit
REM End of file
