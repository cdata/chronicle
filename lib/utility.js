exports.forward = function(fn, key) {
    
    return function() {

        var args = Array.prototype.slice.call(arguments);
        args.unshift(key);
        fn.apply(fn, args);
    }
}
