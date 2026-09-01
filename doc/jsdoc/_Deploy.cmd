@ECHO OFF
ECHO It updates JSDoc website after a new documentation generation.
ECHO Paths relatives to package directory: ${JM2MP.JS}/
CD

:Start
IF EXIST "..\JSON-MDE.GitHub.IO\.git\" GOTO Deploy
GOTO Error

:Deploy
REM It preserves the .GIT subdirectory (includding all hiddend files).
XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\.git\" "%TEMP%\JSON-MDE.GitHub.IO(.git)\"
REM It fully deletes the old content.
DEL /F /S /Q "..\JSON-MDE.GitHub.IO\"
REM It restores the .GIT subdirectory.
XCOPY /E /V /I /H /Y /R /K "%TEMP%\JSON-MDE.GitHub.IO(.git)\" "..\JSON-MDE.GitHub.IO\.git\"
RMDIR /S /Q "%TEMP%\JSON-MDE.GitHub.IO(.git)"
REM It copies all JSDoc-generated files!
XCOPY /E /V /I /H /Y /R /K ".\doc\jsdoc-out\@json-mde\jm2mp\1.0.0\" "..\JSON-MDE.GitHub.IO\jm2mp.js\"
REM It places (moves) appropriately every subdirectory: images, styles, scripts, examples, _root, alias, schemas, cli, express, and www.
REM /images/
REM ###XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\jm2mp.js\images\" "..\JSON-MDE.GitHub.IO\images\"
REM ###RMDIR /S /Q "..\JSON-MDE.GitHub.IO\jm2mp.js\images\"
REM /styles/
REM ###XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\jm2mp.js\styles\" "..\JSON-MDE.GitHub.IO\styles\"
REM ###RMDIR /S /Q "..\JSON-MDE.GitHub.IO\jm2mp.js\styles\"
REM /scripts/
REM ###XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\jm2mp.js\scripts\" "..\JSON-MDE.GitHub.IO\scripts\"
REM ###RMDIR /S /Q "..\JSON-MDE.GitHub.IO\jm2mp.js\scripts\"
REM /examples/
XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\jm2mp.js\courses-students\" "..\JSON-MDE.GitHub.IO\examples\courses-students\"
RMDIR /S /Q "..\JSON-MDE.GitHub.IO\jm2mp.js\courses-students\"
XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\jm2mp.js\inventory\" "..\JSON-MDE.GitHub.IO\examples\inventory\"
RMDIR /S /Q "..\JSON-MDE.GitHub.IO\jm2mp.js\inventory\"
XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\jm2mp.js\Gregory-Liebniz--Pi\" "..\JSON-MDE.GitHub.IO\examples\Gregory-Liebniz--Pi\"
RMDIR /S /Q "..\JSON-MDE.GitHub.IO\jm2mp.js\Gregory-Liebniz--Pi\"
REM _root
XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\jm2mp.js\_root\" "..\JSON-MDE.GitHub.IO\"
RMDIR /S /Q "..\JSON-MDE.GitHub.IO\jm2mp.js\_root\"
MOVE /Y "..\JSON-MDE.GitHub.IO\jm2mp.js\images\favicon.ico" "..\JSON-MDE.GitHub.IO\"
MOVE /Y "..\JSON-MDE.GitHub.IO\jm2mp.js\humans.txt" "..\JSON-MDE.GitHub.IO\"
MOVE /Y "..\JSON-MDE.GitHub.IO\jm2mp.js\robots.txt" "..\JSON-MDE.GitHub.IO\"
MOVE /Y "..\JSON-MDE.GitHub.IO\jm2mp.js\LICENSE.txt" "..\JSON-MDE.GitHub.IO\"
COPY /Y "..\JSON-MDE.GitHub.IO\LICENSE.txt" "..\JSON-MDE.GitHub.IO\LICENSE"
REM /security/
MOVE /Y "..\JSON-MDE.GitHub.IO\jm2mp.js\security.txt" "..\JSON-MDE.GitHub.IO\.well-known\"
REM /jm2mp/
XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\jm2mp.js\jm2mp\" "..\JSON-MDE.GitHub.IO\jm2mp\"
RMDIR /S /Q "..\JSON-MDE.GitHub.IO\jm2mp.js\jm2mp\"
REM /schemas/
MOVE /Y "..\JSON-MDE.GitHub.IO\jm2mp.js\JM2MP-v1.0.0--JSON-Schema-Draft-2020-12.json" "..\JSON-MDE.GitHub.IO\jm2mp.js\schemas\"
XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\jm2mp.js\schemas\" "..\JSON-MDE.GitHub.IO\schemas\"
XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\jm2mp.js\schemas\" "..\JSON-MDE.GitHub.IO\schemas\jm2mp\"
XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\jm2mp.js\schemas\" "..\JSON-MDE.GitHub.IO\schemas\jm2mp\1.0.0\"
RMDIR /S /Q "..\JSON-MDE.GitHub.IO\jm2mp.js\schemas\"
REM /jm2mp.js-cli/
XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\jm2mp.js\jm2mp.js-cli\" "..\JSON-MDE.GitHub.IO\jm2mp.js-cli\"
RMDIR /S /Q "..\JSON-MDE.GitHub.IO\jm2mp.js\jm2mp.js-cli\"
REM /jm2mp.js-express/
XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\jm2mp.js\jm2mp.js-express\" "..\JSON-MDE.GitHub.IO\jm2mp.js-express\"
RMDIR /S /Q "..\JSON-MDE.GitHub.IO\jm2mp.js\jm2mp.js-express\"
REM /jm2mp.js-www/
XCOPY /E /V /I /H /Y /R /K "..\JSON-MDE.GitHub.IO\jm2mp.js\jm2mp.js-www\" "..\JSON-MDE.GitHub.IO\jm2mp.js-www\"
RMDIR /S /Q "..\JSON-MDE.GitHub.IO\jm2mp.js\jm2mp.js-www\"
REM Finished!
GOTO Exit

:Error
ECHO Directory "..\JSON-MDE.GitHub.IO\.git\" not found!

:Exit
REM End of file
