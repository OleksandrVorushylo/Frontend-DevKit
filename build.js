const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, 'dist');
const TARGETS = ['chrome', 'firefox'];

// Directories and files to copy (excluding dev files and manifest)
const DIRS_TO_COPY = ['background', 'content', 'devtools', 'icons', 'popup', 'tools', 'utils'];
const FILES_TO_COPY = ['README.md', 'LICENSE']; // exclude manifest.json

function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function cleanBuildDir() {
    if (fs.existsSync(BUILD_DIR)) {
        fs.rmSync(BUILD_DIR, { recursive: true, force: true });
    }
}

function generateManifest(target) {
    const rawManifest = fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8');
    const manifest = JSON.parse(rawManifest);

    if (target === 'chrome') {
        // Chrome MV3 requirement
        if (manifest.background && manifest.background.scripts) {
            manifest.background.service_worker = manifest.background.scripts[0];
            delete manifest.background.scripts;
        }
        // Remove browser_specific_settings for Chrome
        delete manifest.browser_specific_settings;
    } else if (target === 'firefox') {
        // Firefox MV3 requirement is already background.scripts (or default manifest)
        // Ensure browser_specific_settings exists
        if (!manifest.browser_specific_settings || !manifest.browser_specific_settings.gecko) {
             manifest.browser_specific_settings = {
                 gecko: {
                     id: "frontend-dev-toolbox@example.com"
                 }
             };
        }
        // Remove use_dynamic_url for Firefox as it is unsupported and causes warnings
        if (manifest.web_accessible_resources) {
            manifest.web_accessible_resources.forEach(resource => {
                delete resource.use_dynamic_url;
            });
        }
    }

    return JSON.stringify(manifest, null, 2);
}

function build() {
    console.log('🚀 Starting build...');
    cleanBuildDir();

    for (const target of TARGETS) {
        console.log(`\n📦 Building for ${target.toUpperCase()}...`);
        const targetDir = path.join(BUILD_DIR, target);
        
        // 1. Copy Directories
        for (const dir of DIRS_TO_COPY) {
            const srcPath = path.join(__dirname, dir);
            const destPath = path.join(targetDir, dir);
            copyDir(srcPath, destPath);
        }

        // 2. Copy Files
        for (const file of FILES_TO_COPY) {
            const srcPath = path.join(__dirname, file);
            const destPath = path.join(targetDir, file);
            if (fs.existsSync(srcPath)) {
                fs.copyFileSync(srcPath, destPath);
            }
        }

        // 3. Generate Targeted Manifest
        const manifestStr = generateManifest(target);
        fs.writeFileSync(path.join(targetDir, 'manifest.json'), manifestStr);
        
        console.log(`✅ ${target} build complete (${path.join('dist', target)})`);
    }
    
    console.log('\n🎉 Build process finished successfully!');
}

build();
