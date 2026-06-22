const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'releases_v2.json');
const outputFile = path.join(__dirname, 'releases.json');

function parseRegexString(regexStr) {
  const match = regexStr.match(/^\/(.+)\/([gimsuvy]*)$/);
  if (match) {
    return {
      pattern: match[1],
      flags: match[2] || 'g'
    };
  }
  return {
    pattern: regexStr,
    flags: 'g'
  };
}

function restoreFixes(groupedFixes) {
  const expanded = [];

  for (const grouped of groupedFixes) {
    for (const replacement of grouped.replacements) {
      const regexObj = parseRegexString(replacement.regex);
      
      let pattern = regexObj.pattern;
      
      // Restore DISABLED flag if present
      if (replacement.disable)
        pattern = `DISABLED ${pattern}`;

      const fix = {
        tc: grouped.tc,
        name: grouped.name,
        type: grouped.type,
		files: grouped.files,
        regex: {
          pattern: pattern,
          flags: regexObj.flags
        },
        replacement: replacement.replacement
      };

      if (grouped.appDependencies && grouped.appDependencies.length > 0)
        fix.appDependencies = grouped.appDependencies;

      expanded.push(fix);
    }
  }

  return expanded;
}

function inverseTransform(data) {
  const transformed = {};

  for (const version in data) {
    const entry = data[version];
    transformed[version] = {
      versionMeta: entry.versionMeta,
      dates: entry.dates,
      checkTcTicket: entry.checkTcTicket,
      fixes: restoreFixes(entry.fixes || [])
    };
  }

  return transformed;
}

// Read input
const inputJson = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Transform and write output
const transformedJson = inverseTransform(inputJson);
fs.writeFileSync(outputFile, JSON.stringify(transformedJson, null, 2), 'utf8');

console.log(`Inverse conversion saved to ${outputFile}`);