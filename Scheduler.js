const fs = require('fs');
const logger = require('./Logger.js');

exports.getPost = function () {

    let availableSubreddits = getAvailableSubreddits();

    for (let subreddit of availableSubreddits) {
        let post = getAvailablePost(subreddit);
        if (post) {
            return post;
        }
    }

    return null;

}

exports.getPostToPromote = function () {

    let posts = filterOutPostsForPromotion(JSON.parse(fs.readFileSync('./posts.json', 'utf8')));

    return posts.length > 0 ? posts[0] : null;

}

exports.posted = function (postArg) {

    let posts = JSON.parse(fs.readFileSync('./posts.json', 'utf8'));
    postArg.posted_at = Date.now();
    posts.push(postArg);
    fs.writeFileSync('./posts.json', JSON.stringify(posts));

}

exports.promoted = function (postArg, jobId) {

    let posts = JSON.parse(fs.readFileSync('./posts.json', 'utf8'));

    posts = posts.map(function (post) {
        if (post.subreddit === postArg.subreddit && post.title === postArg.title && post.link === postArg.link) {
            post.sproutgigs_job_id = jobId;
        }
        return post;
    });

    fs.writeFileSync('./posts.json', JSON.stringify(posts));

}

function filterOutPostsForPromotion(posts) {

    return posts.filter(function (post) {
        if (post.hasOwnProperty('post_link') && post.post_link && post.post_link.length > 0 && post.post_link !== 'error') {
            if (!post.hasOwnProperty('sproutgigs_job_id') || !post.sproutgigs_job_id || post.sproutgigs_job_id.length === 0) {
                if (post.hasOwnProperty('upvotes') && post.upvotes > 0) {
                    return true;
                }
            }
        }
        return false;
    });

}

function getAvailableSubreddits() {

    let schedule = JSON.parse(fs.readFileSync('./schedule.json', 'utf8'));
    let posts = JSON.parse(fs.readFileSync('./posts.json', 'utf8'));
    let currentHour = new Date().getHours();

    let availableSubreddits = schedule.filter(function (item) {
        if (!item.post_at.includes(currentHour)) {
            return false;
        }
        return posts.filter(function (post) {
            return post.subreddit === item.subreddit && ((Date.now() - post.posted_at) < item.post_every_n_days * 24 * 60 * 60 * 1000);
        }).length === 0;
    });

    availableSubreddits = shuffle(availableSubreddits);

    return availableSubreddits;

}

function getAvailablePost(subreddit) {

    let posts = JSON.parse(fs.readFileSync('./posts.json', 'utf8'));
    let links = shuffle(subreddit.links);
    let titles = shuffle(subreddit.titles);
    let targetTimestamp = (Date.now() - ((links.length - 1) * 24 * 60 * 60 * 1000));

    links = links.filter(function (link) {
        return posts.filter(function (post) {
            return post.posted_at > targetTimestamp && post.link === link;
        }).length === 0;
    });

    for (let link of links) {
        let availableTitles = titles.filter(function (title) {
            return title.length < 299 && posts.filter(function (post) {
                return (post.subreddit === subreddit.subreddit && post.link === link && post.title === title) || (post.subreddit === subreddit.subreddit && post.title === title && post.posted_at > (Date.now() - (14 * 24 * 60 * 60 * 1000)));
            }).length === 0;
        });
        if (availableTitles.length > 0) {
            return {
                subreddit: subreddit.subreddit,
                link: link,
                title: availableTitles[0],
                upvotes: subreddit.hasOwnProperty('upvotes') ? subreddit.upvotes : 0
            };
        } else {
            logger.log(`LINK ${link} HAS NO AVAILABLE TITLES ANYMORE TO USE`);
        }
    }

    return null;

}

function shuffle(array) {

    let currentIndex = array.length;

    while (currentIndex != 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;

}