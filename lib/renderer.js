var step = require('step'),
    utility = require('./utility'),
    jsdom = require('jsdom');

exports.createRenderer = (function() {

    var basicTemplate = 
'<!DOCTYPE html> \n\
<html class="no-js" lang="en"> \n\
    <head> \n\
        <meta charset="utf-8"> \n\
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"> \n\
        <title></title> \n\
        <meta name="viewport" content="widget=device.width, initial-scale=1.0"> \n\
    </head> \n\
    <body> \n\
    </body> \n\
</html>';

    function initializeRenderer(reader, callback) {

        step(
            function loadUp() {

                reader.getConfig(this.parallel());
                reader.getIndex(this.parallel());
                jsdom.env(basicTemplate, this.parallel());
            },
            function createCustomTemplates(error, config, index, window) {

                if(error)
                    callback(error);
                else {

                    var document = window.document,
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
                    document.body.appendChild(header);

                    content.setAttribute('id', 'Content');
                    document.body.appendChild(content);

                    archive.setAttribute('id', 'Index');
                    archive.innerHTML = "<nav><ol></ol></nav>";
                    document.body.appendChild(archive);
                    
                    
                    callback(0, { reader: reader, document: document }); 
                }
            }
        );
    }

    function generateEntryFragment(document, entry) {

        var entryNode = document.createElement('article'),
            header = document.createElement('header'),
            title = document.createElement('h1'),
            footer = document.createElement('footer'),
            metaSection = document.createElement('section'),
            revisionSection = document.createElement('section'),
            editorList = document.createElement('ul');

        title.textContent = entry.title;

        entryNode.setAttribute('id', entry.id);
        entryNode.innerHTML = entry.contents;

        header.appendChild(title);

        entryNode.insertBefore(header, entryNode.firstChild);

        metaSection.innerHTML = 'Authored by <span class="author">' + entry.meta.author + '</span> on <span class="date">' + entry.meta.created + '. Last edited on <span class="modified">' + entry.meta.lastModified + '</span>';

        metaSection.setAttribute('class', 'metadata');
        footer.appendChild(metaSection);

        for(var editor in entry.meta.editors) {

            var editorItem = document.createElement('li'),
                revisionList = document.createElement('ol');
            
            entry.meta.editors[editor].forEach(
                function(revision) {

                    var revisionItem = document.createElement('li');
                    revisionItem.innerHTML = '<span class="date">' + revision.date + '</span>: <span class="message">' + revision.message + '</span>';
                    revisionList.appendChild(revisionItem);
                }
            );

            editorItem.innerHTML = '<span class="editor">' + editor + '</span>';

            editorItem.appendChild(revisionList);
            editorList.appendChild(editorItem);
        }

        revisionSection.textContent = "Revision history:";
        revisionSection.appendChild(editorList);
        revisionSection.setAttribute('class', 'revisions');
        footer.appendChild(revisionSection);

        entryNode.appendChild(footer);

        return entryNode;

    }

    function render(document) { return document.doctype + document.innerHTML; }

    function getIndexPage(renderer, page, format, callback) {

        step(
            function loadUp() {

                renderer.reader.getEntriesForPage(page, this);
            },
            function resolveIndexPage(error, entries){

                if(error)
                    callback(error);
                else {

                    if(format === 'json')
                        callback(0, JSON.stringify({ entries: entries }));
                    else {

                        var document = renderer.document,
                            content = document.getElementById('Content');

                        content.innerHTML = '';

                        entries.forEach(
                            function(entry) {

                                content.appendChild(generateEntryFragment(document, entry));
                            }
                        );

                        callback(0, render(document));
                    }
                }
            }
        );
    }

    function getEntryPage(renderer, entry, format, callback) {

        step(
            function loadUp() {
                
                renderer.reader.getEntryByTitle(entry, this);
            },
            function resolveEntryPage(error, entry) {

                if(error)
                    callback(error);
                else {

                    if(format === 'json')
                        callback(0, JSON.stringify(entry));
                    else {

                        var document = renderer.document,
                            content = document.getElementById('Content');

                        content.innerHTML = '';
                        content.appendChild(generateEntryFragment(document, entry));

                        callback(0, render(document));
                    }
                }
            }
        );
    }


    return function(reader, callback) {

        step(
            function() {

                initializeRenderer(reader, this);
            },
            function(error, renderer) {

                if(error)
                    callback(error);
                else {

                    var forward = utility.forward,
                        cache = utility.cache;

                    callback(
                        0,
                        {
                            getIndexPage: forward(cache(getIndexPage), renderer),
                            getEntryPage: forward(cache(getEntryPage), renderer)
                        }
                    );
                }
            }
        );
    };
})()
