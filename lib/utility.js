var step = require('step'),
    crypto = require('crypto'),
    markdown = require('markdown-js');

exports.forward = function(fn, key) {
    
    return function() {

        var args = Array.prototype.slice.call(arguments);
        args.unshift(key);
        fn.apply(fn, args);
    }
};

exports.cache = function(fn, keyArgument, time) {

    return function() {

        var args = Array.prototype.slice.call(arguments),
            signature = args.slice(1, args.length - 1),
            token = fn.toString().match(/function\s+([^\(]*)\s*\(/)[1] + ':' + signature.join('-'),
            key = args[0],
            callback = args.pop();

        if(key.cache && key.cache[token] && key.cache[token].expires > Date.now()) {
            
            //console.log('Cache hit for ' + token);
            callback(0, key.cache[token].output);

        } else {
            step(
                function callFunction() {
                    
                    args.push(this);
                    fn.apply(fn, args);
                },
                function stashResults(error, output) {

                    if(error)
                        callback(error);
                    else {

                        key.cache = key.cache || {};

                        key.cache[token] = {
                            expires: Date.now() + (time || key.cacheTime || 36300000),
                            output: output
                        };

                        callback(0, output);
                    }
                }
            );
        }
    }
};

exports.fileToTitle = function(filename) {

    return filename.replace(/\.(markdown|md)$/i, "");
};

exports.fileToPath = function(filename) {

    return exports.fileToTitle(filename).replace(/\s/g, "-").replace(/[^a-z^\-]/gi, "").toLowerCase();
};

exports.markdownToHTML = function(markdownText) {

    return markdown.makeHtml(markdownText);
};
