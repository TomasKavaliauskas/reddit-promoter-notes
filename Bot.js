const common = require('./Common.js');
const browserHelper = require('./Browser.js');
const logger = require('./Logger.js');
const NAVIGATION_OPTIONS = {
    timeout: 180000
};

let browser = null;
let page = null;

const SELECTORS = {
    INPUTS: {
        TITLE: 'faceplate-textarea-input[name="title"]',
        LINK: 'faceplate-textarea-input[name="link"]',
    },
    BUTTONS: {
        SUBMIT: '#submit-post-button'
    }
};

exports.post = async (post) => {

    return new Promise(async (resolve) => {

        logger.log(`POSTING : ${JSON.stringify(post)}`);

        try {

            await turnOnTheBrowser();
            await openPostSubmitPage(post.subreddit);

            if (isLoggedOut()) {

                logger.log("ACCOUNT IS DISCONNECTED. RECONNECT AND TRY AGAIN");
                resolve({
                    success: false,
                    reason: "disconnected"
                });
                return;

            }

            post = await submitPost(post);

        } catch (err) {

            logger.logError(err);

        }

        try {

            await browserHelper.exitBrowser(browser, page);

        } catch (err) {

        }

        resolve({
            success: post.hasOwnProperty('post_link') ? true : false,
            post: post
        });
        return;

    });

}

exports.test = async () => {

    return new Promise(async (resolve) => {

        logger.log(`TESTING MODE`);

        try {

            await turnOnTheBrowser();

            let pageLoaded = false;

            while (!pageLoaded) {

                try {

                    await Promise.all([
                        page.goto('https://reddit.com', NAVIGATION_OPTIONS),
                        page.waitForNavigation(NAVIGATION_OPTIONS)
                    ]);
                    pageLoaded = true;

                } catch (err) {

                }

            }

            await common.sleep(999);

        } catch (err) {

            logger.logError(err);

        }

        try {

            await browserHelper.exitBrowser(browser, page);

        } catch (err) {

        }

        resolve();
        return;

    });

}

async function openPostSubmitPage(subreddit) {

    return new Promise(async (resolve, reject) => {

        let pageLoaded = false;

        while (!pageLoaded) {

            try {

                await Promise.all([
                    page.goto(`https://www.reddit.com/r/${subreddit}/submit/?type=LINK`, NAVIGATION_OPTIONS),
                    page.waitForNavigation(NAVIGATION_OPTIONS)
                ]);
                pageLoaded = true;

            } catch (err) {

            }

        }

        resolve();
        return;

    });

}

async function submitPost(post) {

    return new Promise(async (resolve, reject) => {

        try {

            await page.waitForSelector(SELECTORS.INPUTS.TITLE);

            await page.click(SELECTORS.INPUTS.TITLE);
            await page.type(SELECTORS.INPUTS.TITLE, post.title);

            await page.click(SELECTORS.INPUTS.LINK);
            await page.type(SELECTORS.INPUTS.LINK, post.link);

            await common.sleep(1);

            await Promise.all([
                page.click(SELECTORS.BUTTONS.SUBMIT),
                page.waitForNavigation(NAVIGATION_OPTIONS)
            ]);

            let iterations = 0;

            while (page.url().includes(`https://www.reddit.com/r/${post.subreddit}/submit/?type=LINK`)) {

                if (iterations++ > 60) {
                    logger.log("SOMETHING IS WRONG, CANNOT SUBMIT A POST. EXITING...");
                    process.exit();
                }
                await common.sleep(1);

            }

            await page.waitForNavigation(NAVIGATION_OPTIONS);

            post.post_link = await page.evaluate(function () {
                return 'https://reddit.com' + document.querySelector('a[id*="post-title-"]').getAttribute('href');
            });

            resolve(post);
            return;

        } catch (err) {
            logger.logError(err);
        }

        resolve(false);
        return;

    });

}

function isLoggedOut() {

    return page.url().includes('reddit.com/login');

}

async function turnOnTheBrowser() {

    return new Promise(async (resolve, reject) => {

        let browserInitiated = await browserHelper.initiateBrowser();

        if (!browserInitiated) {

            logger.log("COULD NOT INITIATE BROWSER. EXITING...");
            await browserHelper.exitBrowser(browser, page);

        } else {

            browser = browserInitiated.browser;
            page = browserInitiated.page;

        }

        resolve(true);
        return;

    });

}

process.on('unhandledRejection', (reason, promise) => {
    console.log(reason)
});
process.on('uncaughtException', (reason) => {
    console.log(reason)
});
