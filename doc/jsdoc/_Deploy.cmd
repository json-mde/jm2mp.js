@ECHO OFF
REM It updates JSDoc website after a new documentation generation.
REM Paths relatives to package directory: ${JM2MP.JS}/

:Start
IF EXIST "..\JSON-MDE.GitHub.IO\jm2mp.js\" GOTO Deploy
GOTO Error

:Deploy
DEL /F /S /Q ..\JSON-MDE.GitHub.IO\jm2mp.js\
XCOPY /E /V /I /H /Y /Z .\doc\jsdoc-out\@json-mde\jm2mp\1.0.0\ ..\JSON-MDE.GitHub.IO\jm2mp.js\
MOVE /Y ..\JSON-MDE.GitHub.IO\jm2mp.js\humans.txt ..\JSON-MDE.GitHub.IO\
MOVE /Y ..\JSON-MDE.GitHub.IO\jm2mp.js\robots.txt ..\JSON-MDE.GitHub.IO\
MOVE /Y ..\JSON-MDE.GitHub.IO\jm2mp.js\LICENSE.txt ..\JSON-MDE.GitHub.IO\
COPY /Y ..\JSON-MDE.GitHub.IO\LICENSE.txt ..\JSON-MDE.GitHub.IO\LICENSE
GOTO Exit

:Error
ECHO Directory "..\JSON-MDE.GitHub.IO\jm2mp.js\" not found!

:Exit
REM End of file
