var step = require('step'),
    utility = require('./utility'),
    jsdom = require('jsdom');

exports.createRenderer = (function() {

    function getIndexPage(reader, index, callback) {

        
    }

    function getEntryPage(reader, entry, callback) {

    }

    return function(reader) {

        return {
            getIndexPage: utility.forward(getIndexPage, reader),
            getEntryPage: utility.forward(getEntryPage, reader)
        };
    };
})()
