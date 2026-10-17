// NSwag maps the `rows` cell schema (oneOf string | number | boolean) to `string`, which would
// stringify numbers. Cells are `object` so callers can pass numbers and booleans as-is.
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../src/dotnet/QorstackApi.cs');
const src = fs.readFileSync(file, 'utf8');
const out = src.replace(
  /ICollection<System\.Collections\.Generic\.ICollection<string>> Rows \{ get; set; \} = new System\.Collections\.ObjectModel\.Collection<System\.Collections\.Generic\.ICollection<string>>\(\);/g,
  'ICollection<System.Collections.Generic.ICollection<object>> Rows { get; set; } = new System.Collections.ObjectModel.Collection<System.Collections.Generic.ICollection<object>>();'
);
if (!/ICollection<object>> Rows/.test(out)) {
  console.error('fix-dotnet: Rows property not found — check the generated QorstackApi.cs');
  process.exit(1);
}
fs.writeFileSync(file, out, 'utf8');
console.log('fix-dotnet: table Rows cells typed as object');
