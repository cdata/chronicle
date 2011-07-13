var step = require('step'),
    utility = require('./utility'),
    jsdom = require('jsdom');

exports.createRenderer = (function() {

    var basicTemplate = 
       '<!DOCTYPE html> \
        <html class="no-js" lang="en"> \
            <head> \
                <meta charset="utf-8"> \
                <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"> \
                <title></title> \
                <meta name="viewport" content="widget=device.width, initial-scale=1.0"> \
            </head> \
            <body> \
            </body> \
        </html>';

    function initializeRenderer(reader, error) {

        step(
            function loadUp() {

                reader.getConfig(this.parallel());
                reader.getIndex(this.parallel());
                jsdom.env(pageTemplate, this.parallel());
            },
            function createCustomTemplates(error, args) {

                if(error)
                    callback(error);
                else {

                    config = args[0];

                    var config = args[0],
                        index = args[1],
                        window = args[2],
                        document = window.document,
                        head = document.getElementsByTagName('head')[0],
                        archive = document.createElement('section'),
                        content = document.createElement('section'),
                        header = document.createElement('header'),
                        title = config.name || "Untitled",
                        meta = {
                            author: config.author ? (typeof config.author === "string" ? config.author : config.author.name) : "Unknown author",
                            description: config.description,
                            keywords: config.keywords ? config.keywords.join(', ') : ""
                        },
                        customTemplate = "",
                        currentMonth;

                    head.getElementsByTagName('title')[0].innerText = title;

                    for(var name in meta) {

                        var metaTag = document.createElement('meta');
                        metaTag.setAttribute('name', name);
                        metaTag.setAttribute('content', meta[name]);

                        head.appendChild(metaTag);
                    }

                    header.innerHTML = "<h1>" + title + "</h1><h2>" + meta.description + "</h2>";

                    archive.setAttribute('id', 'Archive');
                    archive.innerHTML = "<nav><ul></ul></nav>";
                    
                    index.forEach(
                        function(entry) {
                            
                            
                        }
                    );

                    customTemplate = document.docType + '\n' + document.innerHTML;
                    
                    callback(0, customTemplate); 
                }
            }
        );
    }

    function getIndexPage(renderer, index, callback) {

        
    }

    function getEntryPage(renderer, entry, callback) {

    }

    return function(reader, callback) {

        step(
            function() {

                initializeRenderer(reader, this);
            },
            function(error, renderer) {

                if(error)
                    callback(error);
                else
                    callback(
                        0,
                        {
                            getIndexPage: utility.forward(getIndexPage, renderer),
                            getEntryPage: utility.forward(getEntryPage, renderer)
                        }
                    );
            }
        );
    };
})()
