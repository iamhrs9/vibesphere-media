const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const suspiciousKeywords = ['mongoose', 'Schema', 'process.env', 'require(', 'const reviewSchema ='];
let foundIssues = false;

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const keyword of suspiciousKeywords) {
        if (content.includes(keyword)) {
            console.error(`ERROR: Found suspicious keyword "${keyword}" in ${filePath}`);
            foundIssues = true;
        }
    }
}

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            scanDir(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.html')) {
            scanFile(filePath);
        }
    }
}

console.log(`Scanning ${publicDir} for backend code leaks...`);
try {
    scanDir(publicDir);
} catch (err) {
    console.error("Error scanning directory:", err);
    process.exit(1);
}

if (foundIssues) {
    console.error("FAILED: Backend code leaks detected in frontend files.");
    process.exit(1);
} else {
    console.log("SUCCESS: No backend code leaks found.");
    process.exit(0);
}
