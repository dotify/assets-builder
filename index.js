const {execFile} = require('child_process');
const optipng = require('optipng-bin');
const fs = require("fs");
const tinyPngKeys = require("./tinypng-keys");
const tinify = require("tinify");

// Build files queus ==================================================================

sourceDirectory = "src";
buildDirectory = "build";

let pngQueue = [];
let copyQueue = [];

// scan source dir and build queue lists
moduleDirs = fs.readdirSync(sourceDirectory);
moduleDirs.forEach(file => {
    let moduleDir = sourceDirectory + "/" + file;

    if (fs.lstatSync(moduleDir).isDirectory() && file.search(/^module_.*/) !== -1) {

        const buildModuleDir = buildDirectory + "/" + file;

        if (!fs.existsSync(buildModuleDir))
            fs.mkdirSync(buildModuleDir);

        const sceneDirs = fs.readdirSync(moduleDir);
        sceneDirs.forEach(file => {
            let sceneDir = moduleDir + "/" + file;
            if (fs.lstatSync(sceneDir).isDirectory() && file.search(/^scene-.*/) !== -1) {

                let buildSceneDir = buildModuleDir + "/scene-" + file.split("scene-").pop();

                if (!fs.existsSync(buildSceneDir))
                    fs.mkdirSync(buildSceneDir);

                const imageFiles = fs.readdirSync(sceneDir);
                imageFiles.forEach(file => {
                    let imageFile = sceneDir + '/' + file;

                    if (fs.lstatSync(imageFile).isFile()) {
                        // convert png
                        if (file.search(/.*\.png/) !== -1) {
                            pngQueue.push({in: imageFile, out: `${buildSceneDir}/${file}`});
                        }

                        // copy mp4 and mp3
                        else if (file.search(/.*\.mp[34]/) !== -1) {
                            copyQueue.push({in: imageFile, out: `${buildSceneDir}/${file}`});
                        }
                    }
                });
            }
        });
    }
});

// Png convert helper ==================================================================

let parallelConvert = require('os').cpus().length;

let convertInd = 0;

/**
 * Convert png using opti png
 */
function convertOptiPng() {
    if (convertInd >= pngQueue.length)
        return;

    let file = pngQueue[convertInd++];
    console.log("> " + convertInd + "/" + pngQueue.length + " : " + file.in);

    // delete existing file
    if (fs.existsSync(file.out)) fs.unlinkSync(file.out);
    execFile(optipng, ['-out', file.out, file.in], err => {
        if (err) {
            return console.log(err);
        }

        convertOptiPng();
    });
}

let tinyPngsAccounts = Object.keys(tinyPngKeys);
let keyInd = Math.floor(Math.random() * (tinyPngsAccounts.length - 0.000001));


/**
 * Convert png using tony png
 */
function convertTinyPng() {

    if (convertInd >= pngQueue.length)
        return;

    // roll tiny png key
    tinify.key = tinyPngKeys[tinyPngsAccounts[keyInd]];
    keyInd = (keyInd + 1) % tinyPngsAccounts.length;

    // get file
    let file = pngQueue[convertInd++];
    if (fs.existsSync(file.out))
        fs.unlinkSync(file.out);

    console.log("> " + convertInd + "/" + pngQueue.length + " : " + file.in);

    tinify.fromFile(file.in).toFile(file.out).then(() => {
        convertTinyPng();
    });

}

// catch script args and decide which conversion tool to use

const args = process.argv;

// convert PNG files
if (args.length >= 3 && args[2] === "tinypng") {
    while (parallelConvert--) convertTinyPng();
} else {
    while (parallelConvert--) convertOptiPng();
}

// copy mp3 and mp4
// let copyCounter = 1;
// copyQueue.map(file => {
//     // delete existing file
//     if (fs.existsSync(file.out)) fs.unlinkSync(file.out);
//
//     // copy
//     fs.createReadStream(file.in).pipe(fs.createWriteStream(file.out)
//         .on('close', () => {
//             console.log(`> copied ${copyCounter}/${copyQueue.length} : ${file.in}`);
//             copyCounter++;
//         }));
// });
