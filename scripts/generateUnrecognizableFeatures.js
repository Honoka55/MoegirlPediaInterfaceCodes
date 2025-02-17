"use strict";
const consoleWithTime = require("./modules/console.js");
consoleWithTime.info("Start initialization...");
const exec = require("./modules/exec.js");
const fetch = require("./modules/fetch.js");
const mkdtmp = require("./modules/mkdtmp.js");
const fs = require("fs");
const path = require("path");

const targetChromiumVersion = "70.0.3538.0";
const targetUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${targetChromiumVersion} Safari/537.36`;

(async () => {
    try {
        const unrecognizableFeatures = [];
        const tempPath = await mkdtmp();
        consoleWithTime.info("Start compile src/ to temporary bundle file...");
        const bundlePath = path.join(tempPath, "bundle.js");
        consoleWithTime.log("bundlePath:", bundlePath);
        await exec(`npx tsc --project tsconfig.json --outFile ${bundlePath}`);
        consoleWithTime.info("\tDone.");
        consoleWithTime.info("Start analyse the temporary bundle file...");
        const analysisReport = [...new Set(JSON.parse(await exec(`npx @financial-times/js-features-analyser analyse --file ${path.relative(".", bundlePath)}`)))].sort();
        const clone = [...analysisReport];
        consoleWithTime.info("\tDone.");
        let i = 0;
        while (analysisReport.length > 0) {
            const piece = [];
            while (analysisReport.length > 0 && piece.join(",").length <= 1973) {
                piece.push(analysisReport.splice(0, 1));
            }
            consoleWithTime.info(`Start download polyfill file #${i}...`);
            const url = new URL("https://polyfill.io/v3/polyfill.js");
            url.searchParams.set("features", piece.join(","));
            url.searchParams.set("ua", targetUA);
            const data = await fetch.text(`${url}`, {
                method: "GET",
            });
            consoleWithTime.info("\tDone.");
            const match = data.match(/(?<=\n \* These features were not recognised:\n \* - )[^\n]+?(?=\s*\*\/)/)?.[0]?.split?.(/,-\s*/);
            unrecognizableFeatures.push(...match);
            i++;
        }
        await fs.promises.writeFile("scripts/generatePolyfill/unrecognizableFeatures.json", JSON.stringify(unrecognizableFeatures, null, 4));
        consoleWithTime.info("left", clone.length - unrecognizableFeatures.length);
        process.exit(0);
    } catch (e) {
        consoleWithTime.error(e);
        process.exit(1);
    }
})();
