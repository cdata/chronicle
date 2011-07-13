var step = require('step');

exports.forward = function(fn, key) {
    
    return function() {

        var args = Array.prototype.slice.call(arguments);
        args.unshift(key);
        fn.apply(fn, args);
    }
};

exports.cache = function(fn, time) {

    return function() {

        var args = Array.prototype.slice.call(arguments),
            key = args[0],
            token = typeof args[1] === 'string' ? args[1] : fn.toString().match(/^function\s([^\(^\s]*)/)[1],
            callback = args.pop();

        if(key.cache && key.cache[token] && key.cache[token].expires > Date.now())
            callback(0, key.cache[token].output);
        else {
            step(
                function callFunction() {
                    
                    args.push(this);
                    fn.apply(func, args);
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

exports.titleToPath = function(title) {

    return title.replace(/\s/g, "-").replace(/[^a-z^\-]/gi, "").toLowerCase();
};
