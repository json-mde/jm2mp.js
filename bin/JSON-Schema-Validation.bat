REM Example of JSON Schema validation against a JM2MP projection.
REM See also: <https://ajv.js.org/packages/ajv-cli.html>
npx -- ajv-cli --spec=draft2020 -s .\src\schemas\JM2MP-v1.0.0--JSON-Schema-Draft-2020-12.json -d .\examples\alumni\projection.json
