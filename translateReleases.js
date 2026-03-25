const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'releases.json');
const outputFile = path.join(__dirname, 'releases_v2.json');

function appDepKey(dep) {
  return `${dep.id || ''}|${dep.name}|${dep.publisher}|${dep.version}`;
}

function mergeUniqueAppDependencies(depArrays) {
  const seen = new Set();
  const result = [];

  for (const dep of depArrays.flat()) {
    const key = appDepKey(dep);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(dep);
    }
  }

  return result;
}

function cleanPatternAndFlagDisable(pattern) {
  const disabledMatch = pattern.match(/^DISABLED\s*(\d{8})?\s*/);
  if (disabledMatch) {
    return {
      pattern: pattern.replace(/^DISABLED\s*(\d{8})?\s*/, '').trim(),
      disable: true
    };
  }
  return { pattern: pattern.trim(), disable: false };
}

function groupFixes(fixes) {
  const grouped = {};

  for (const fix of fixes) {
    const key = `${fix.tc || ''}|${fix.name}|${fix.type}`;
    if (!grouped[key]) {
      grouped[key] = {
        tc: fix.tc,
        name: fix.name,
        type: fix.type,
        replacements: [],
        appDependencies: []
      };
    }

    const cleaned = cleanPatternAndFlagDisable(fix.regex.pattern);

    const replacement = {
	  regex: new RegExp(cleaned.pattern, fix.regex.flags || "g").toString(),
      replacement: fix.replacement,
    };

    if (cleaned.disable) {
      replacement.disable = true;
    }

    grouped[key].replacements.push(replacement);

    if (fix.appDependencies) {
      grouped[key].appDependencies.push(...fix.appDependencies);
    }
  }

  // Remove duplicates from appDependencies or omit if empty
  for (const key in grouped) {
    const deps = grouped[key].appDependencies;
    if (deps.length === 0) {
      delete grouped[key].appDependencies;
    } else {
      grouped[key].appDependencies = mergeUniqueAppDependencies([deps]);
    }
  }

  return Object.values(grouped);
}

function transformReleases(data) {
  const transformed = {};

  for (const version in data) {
    const entry = data[version];
    transformed[version] = {
      versionMeta: entry.versionMeta,
      dates: entry.dates,
      checkTcTicket: entry.checkTcTicket,
      fixes: groupFixes(entry.fixes || [])
    };
  }

  return transformed;
}

// Read input
const inputJson = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Transform and write output
const transformedJson = transformReleases(inputJson);
fs.writeFileSync(outputFile, JSON.stringify(transformedJson, null, 2), 'utf8');

console.log(`Converted file saved to ${outputFile}`);