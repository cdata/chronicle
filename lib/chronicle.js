var connect = require('connect'),
    step = require('step'),
    argv = require('optimist').argv,
    reader = require('./reader'),
    renderer = require('./renderer');

step(
    function initializeReader() {

        reader.createReader(argv._[0], this);
    },
    function readConfiguration(error, reader) {

        if(error)
            throw error;
        else
            reader.getConfig(this);
    },
    function startServer(error, config) {

        if(error)
            throw error
        else {

            connect(
                connect.logger(),
                connect.router(
                    function(app) {

                        app.get(
                            '/:id?',
                            function(req, res, next) {


                            }
                        );

                        app.get(
                            '/page/:number',
                            function(req, res, next) {

                            }
                        );
                    }
                )
            ).listen(config.port || 80);
        }
    }
);


