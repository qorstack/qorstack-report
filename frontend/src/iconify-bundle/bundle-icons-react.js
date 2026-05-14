"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * This is an advanced example for creating icon bundles for Iconify SVG Framework.
 *
 * It creates a bundle from:
 * - All SVG files in a directory.
 * - Custom JSON files.
 * - Iconify icon sets.
 * - SVG framework.
 *
 * This example uses Iconify Tools to import and clean up icons.
 * For Iconify Tools documentation visit https://docs.iconify.design/tools/tools2/
 */
const fs_1 = require("fs");
const path_1 = require("path");
// Installation: npm install --save-dev @iconify/tools @iconify/utils @iconify/json @iconify/iconify
const tools_1 = require("@iconify/tools");
const utils_1 = require("@iconify/utils");
const icons_bundle_config_1 = require("./config/icons-bundle-config");
// Iconify component (this changes import statement in generated file)
// Available options: '@iconify/react' for React, '@iconify/vue' for Vue 3, '@iconify/vue2' for Vue 2, '@iconify/svelte' for Svelte
const component = '@iconify/react';
// Set to true to use require() instead of import
const commonJS = false;
// File to save bundle to
const target = 'src/iconify-bundle/icons-bundle-react.js';
(async function () {
    let bundle = commonJS
        ? "const { addCollection } = require('" + component + "');\n\n"
        : "import { addCollection } from '" + component + "';\n\n";
    // Create directory for output if missing
    const dir = (0, path_1.dirname)(target);
    try {
        await fs_1.promises.mkdir(dir, {
            recursive: true
        });
    }
    catch (err) {
        //
    }
    /**
     * Convert sources.icons to sources.json
     */
    if (icons_bundle_config_1.sources.icons) {
        const sourcesJSON = icons_bundle_config_1.sources.json ? icons_bundle_config_1.sources.json : (icons_bundle_config_1.sources.json = []);
        // Sort icons by prefix
        const organizedList = organizeIconsList(icons_bundle_config_1.sources.icons);
        for (const prefix in organizedList) {
            const filename = require.resolve(`@iconify/json/json/${prefix}.json`);
            sourcesJSON.push({
                filename,
                icons: organizedList[prefix]
            });
        }
    }
    /**
     * Bundle JSON files
     */
    if (icons_bundle_config_1.sources.json) {
        for (let i = 0; i < icons_bundle_config_1.sources.json.length; i++) {
            const item = icons_bundle_config_1.sources.json[i];
            // Load icon set
            const filename = typeof item === 'string' ? item : item.filename;
            let content = JSON.parse(await fs_1.promises.readFile(filename, 'utf8'));
            // Filter icons
            if (typeof item !== 'string' && item.icons?.length) {
                const filteredContent = (0, utils_1.getIcons)(content, item.icons);
                if (!filteredContent) {
                    throw new Error(`Cannot find required icons in ${filename}`);
                }
                content = filteredContent;
            }
            // Remove metadata
            removeMetaData(content);
            // Change Tabler icons' stroke-width to 1.5px
            for (const key in content) {
                if (key === 'prefix' && content.prefix === 'tabler') {
                    for (const key in content.icons) {
                        content.icons[key].body = content.icons[key].body.replace(/stroke-width="2"/g, 'stroke-width="1.5"');
                    }
                }
            }
            // Minify data and add to bundle
            (0, utils_1.minifyIconSet)(content);
            bundle += 'addCollection(' + JSON.stringify(content) + ');\n';
            console.log(`Bundled icons from ${filename}`);
        }
    }
    /**
     * Custom SVG
     */
    if (icons_bundle_config_1.sources.svg) {
        for (let i = 0; i < icons_bundle_config_1.sources.svg.length; i++) {
            const source = icons_bundle_config_1.sources.svg[i];
            // Import icons
            const iconSet = await (0, tools_1.importDirectory)(source.dir, {
                prefix: source.prefix
            });
            // Validate, clean up, fix palette and optimise
            await iconSet.forEach(async (name, type) => {
                if (type !== 'icon') {
                    return;
                }
                // Get SVG instance for parsing
                const svg = iconSet.toSVG(name);
                if (!svg) {
                    // Invalid icon
                    iconSet.remove(name);
                    return;
                }
                // Clean up and optimise icons
                try {
                    // Clean up icon code
                    await (0, tools_1.cleanupSVG)(svg);
                    if (source.monotone) {
                        // Replace color with currentColor, add if missing
                        // If icon is not monotone, remove this code
                        await (0, tools_1.parseColors)(svg, {
                            defaultColor: 'currentColor',
                            callback: (attr, colorStr, color) => {
                                return !color || (0, tools_1.isEmptyColor)(color) ? colorStr : 'currentColor';
                            }
                        });
                    }
                    // Optimise
                    await (0, tools_1.runSVGO)(svg);
                }
                catch (err) {
                    // Invalid icon
                    console.error(`Error parsing ${name} from ${source.dir}:`, err);
                    iconSet.remove(name);
                    return;
                }
                // Update icon from SVG instance
                iconSet.fromSVG(name, svg);
            });
            console.log(`Bundled ${iconSet.count()} icons from ${source.dir}`);
            // Export to JSON
            const content = iconSet.export();
            bundle += 'addCollection(' + JSON.stringify(content) + ');\n';
        }
    }
    // Save to file
    await fs_1.promises.writeFile(target, bundle, 'utf8');
    console.log(`Saved ${target} (${bundle.length} bytes)`);
})().catch(err => {
    console.error(err);
});
/**
 * Remove metadata from icon set
 */
function removeMetaData(iconSet) {
    const props = ['info', 'chars', 'categories', 'themes', 'prefixes', 'suffixes'];
    props.forEach(prop => {
        delete iconSet[prop];
    });
}
/**
 * Sort icon names by prefix
 */
function organizeIconsList(icons) {
    const sorted = Object.create(null);
    icons.forEach(icon => {
        const item = (0, utils_1.stringToIcon)(icon);
        if (!item) {
            return;
        }
        const prefix = item.prefix;
        const prefixList = sorted[prefix] ? sorted[prefix] : (sorted[prefix] = []);
        const name = item.name;
        if (prefixList.indexOf(name) === -1) {
            prefixList.push(name);
        }
    });
    return sorted;
}
