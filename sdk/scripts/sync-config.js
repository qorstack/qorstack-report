const fs = require('fs');
const path = require('path');

// Configuration
const packageJsonPath = path.resolve(__dirname, '../package.json');
const csprojPath = path.resolve(__dirname, '../src/dotnet/Qorstack.Report.Sdk.csproj');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Read .csproj
let csprojContent = fs.readFileSync(csprojPath, 'utf8');

// Helper function to update XML tag content
function updateTag(content, tagName, value) {
    const regex = new RegExp(`<${tagName}>.*?</${tagName}>`, 'g');
    const newTag = `<${tagName}>${value}</${tagName}>`;
    
    if (content.match(regex)) {
        return content.replace(regex, newTag);
    } else {
        // If tag doesn't exist, we might want to insert it, but for simplicity 
        // in this regex approach, we assume the structure exists or user adds it once.
        // However, let's try to be a bit smarter: insert into PropertyGroup if missing?
        // For now, let's just log a warning if missing, or maybe simple replace is enough if we ensure file structure.
        console.warn(`Warning: Tag <${tagName}> not found in .csproj. Skipping update for this tag.`);
        return content;
    }
}

// Update fields
console.log(`Syncing version ${packageJson.version} to .csproj...`);
csprojContent = updateTag(csprojContent, 'Version', packageJson.version);

if (packageJson.description) {
    console.log(`Syncing description...`);
    csprojContent = updateTag(csprojContent, 'Description', packageJson.description);
}

if (packageJson.author) {
    console.log(`Syncing authors...`);
    csprojContent = updateTag(csprojContent, 'Authors', packageJson.author);
}

if (packageJson.repository && packageJson.repository.url) {
    console.log(`Syncing repository url...`);
    csprojContent = updateTag(csprojContent, 'RepositoryUrl', packageJson.repository.url);
}

if (packageJson.license) {
    console.log(`Syncing license...`);
    csprojContent = updateTag(csprojContent, 'PackageLicenseExpression', packageJson.license);
}

// Write back to .csproj
fs.writeFileSync(csprojPath, csprojContent, 'utf8');
console.log('Successfully synced config from package.json to .csproj');
